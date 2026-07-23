const crypto = require('node:crypto');
const redisClient = require('../../config/redis');
const { REDIS_NAMESPACES, REDIS_TTL } = require('../../utils/constants');

// ±5 minutes, matches REDIS_TTL.HMAC_NONCE_SEC so a nonce naturally expires
// exactly when its timestamp window would have rejected it anyway.
const TIMESTAMP_WINDOW_MS = REDIS_TTL.HMAC_NONCE_SEC * 1000;

/**
 * Serializes the signed payload with a fixed field order and delimiter.
 * MUST match the Convo-side implementation exactly (Convo/backend/src/
 * integrations/hmac.util.ts#serializePayloadForSigning) — both sides sign
 * and verify the same string, not JSON.stringify(payload) (whose key order
 * is not guaranteed to be stable across engines/versions).
 */
function serializePayloadForSigning(payload) {
  return `${payload.brandId}|${payload.userId}|${payload.timestamp}|${payload.nonce}`;
}

function computeSignature(payload, clientSecret) {
  return crypto
    .createHmac('sha256', clientSecret)
    .update(serializePayloadForSigning(payload))
    .digest('hex');
}

/**
 * Verifies a signature using a timing-safe comparison. Length is checked
 * first because crypto.timingSafeEqual throws on mismatched buffer lengths.
 */
function verifySignature(payload, signature, clientSecret) {
  const expected = computeSignature(payload, clientSecret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

function isTimestampFresh(timestamp, now = Date.now()) {
  return Math.abs(now - timestamp) <= TIMESTAMP_WINDOW_MS;
}

/**
 * Atomically consumes a nonce for a given client (SET NX EX — same primitive
 * used by base.webhook-strategy.js for Facebook webhook dedup). Returns true
 * for a new (valid) nonce, false if it was already used (replay).
 */
async function consumeNonceOnce(clientId, nonce) {
  const key = `${REDIS_NAMESPACES.HMAC_NONCE}:${clientId}:${nonce}`;
  const result = await redisClient.set(key, '1', { NX: true, EX: REDIS_TTL.HMAC_NONCE_SEC });
  return result !== null;
}

module.exports = {
  serializePayloadForSigning,
  computeSignature,
  verifySignature,
  isTimestampFresh,
  consumeNonceOnce
};
