const logger = require('../utils/logger');
const {
  findActiveClientById,
  getDecryptedSecret,
  getDecryptedPrevSecret
} = require('../services/integrations/integration-client.service');
const { verifySignature, isTimestampFresh, consumeNonceOnce } = require('../services/integrations/hmac-verify.service');

// Both rejections below use the SAME message and status so a caller cannot
// distinguish "client_id doesn't exist" from "signature is wrong" — telling
// them apart would let an attacker enumerate valid client_ids.
const INVALID_CREDENTIALS_MESSAGE = 'Invalid client credentials or signature';

/**
 * Extracts { payload, signature, clientId } from a POST body:
 * { payload: {...}, signature, client_id }
 */
function extractFromBody(req) {
  const { payload, signature, client_id: clientId } = req.body || {};
  return { payload, signature, clientId };
}

/**
 * Extracts { payload, signature, clientId } from GET request headers —
 * GET has no body, so the signed payload travels as JSON in X-Payload,
 * alongside X-Signature and X-Client-Id. Same signed fields and validation
 * as the POST body form, just relocated to headers per SPEC.md §5.2.
 */
function extractFromHeaders(req) {
  const clientId = req.get('X-Client-Id');
  const signature = req.get('X-Signature');
  const rawPayload = req.get('X-Payload');
  let payload;
  try {
    payload = rawPayload ? JSON.parse(rawPayload) : undefined;
  } catch {
    payload = undefined;
  }
  return { payload, signature, clientId };
}

/**
 * Verifies an inbound HMAC-signed request (Convo integration protocol).
 * Order matters: signature MUST be verified before the nonce is consumed —
 * otherwise an attacker who doesn't know the client_secret could send a
 * wrong signature paired with someone else's valid nonce, burning it as a
 * denial-of-service against the real caller.
 *
 * @param {'body'|'headers'} source - where to read payload/signature/client_id
 *   from. Use 'body' for POST endpoints (e.g. verify-token), 'headers' for
 *   GET endpoints that have no request body (e.g. user-permissions).
 */
function verifyHmac(source = 'body') {
  const extract = source === 'headers' ? extractFromHeaders : extractFromBody;

  return async (req, res, next) => {
    try {
      const { payload, signature, clientId } = extract(req);

      if (!payload || !signature || !clientId) {
        return res.status(400).json({ message: 'Missing payload, signature, or client_id' });
      }

      const { brandId, userId, timestamp, nonce } = payload;
      if (!brandId || !userId || typeof timestamp !== 'number' || !nonce) {
        return res.status(400).json({ message: 'Malformed payload' });
      }

      const client = await findActiveClientById(clientId);
      if (!client) {
        return res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
      }

      // During a secret rotation's grace period, compute both checks
      // unconditionally (no short-circuit) so response timing doesn't leak
      // which secret — current or previous — a caller's signature matched.
      const secret = await getDecryptedSecret(client);
      const prevSecret = await getDecryptedPrevSecret(client);
      const matchesCurrent = verifySignature(payload, signature, secret);
      const matchesPrev = prevSecret ? verifySignature(payload, signature, prevSecret) : false;

      if (!matchesCurrent && !matchesPrev) {
        return res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
      }

      if (!isTimestampFresh(timestamp)) {
        return res.status(401).json({ message: 'Request timestamp outside valid window' });
      }

      const nonceOk = await consumeNonceOnce(clientId, nonce);
      if (!nonceOk) {
        return res.status(401).json({ message: 'Nonce already used' });
      }

      req.integrationClient = client;
      req.verifiedPayload = payload;
      next();
    } catch (error) {
      logger.error('HMAC auth middleware error', error);
      next(error);
    }
  };
}

module.exports = { verifyHmac };
