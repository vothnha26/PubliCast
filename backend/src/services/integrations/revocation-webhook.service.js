const crypto = require('node:crypto');
const axios = require('axios');
const integrationClientService = require('./integration-client.service');

/**
 * Critical-event push to external integrations (Convo) — plan.txt mục 6.
 * Two events only: a user is fully removed from a brand, or a brand is
 * deactivated. Everything else (role tweaks, plan changes) is left to the
 * receiving side's own verify-on-action re-check; these two are pushed
 * immediately because a live real-time session (e.g. an open Discord/Slack
 * chat) has no other prompt to re-check access.
 */

/**
 * Same signed-string convention as hmac-verify.service.js's
 * serializePayloadForSigning, but for this payload's fields — the two
 * payload shapes are unrelated (verify-token signs brandId/userId/timestamp/
 * nonce; this signs eventType/brandId/userId/timestamp/nonce), so this is a
 * distinct serializer, not a shared one.
 */
function serializeForSigning(payload) {
  return `${payload.eventType}|${payload.brandId}|${payload.userId ?? ''}|${payload.timestamp}|${payload.nonce}`;
}

function signPayload(payload, clientSecret) {
  return crypto
    .createHmac('sha256', clientSecret)
    .update(serializeForSigning(payload))
    .digest('hex');
}

/**
 * Sends one signed webhook call to one specific client. Throws on any
 * non-2xx response or network error — the caller (the outbox handler) relies
 * on this throwing so the outbox dispatcher's existing per-event
 * retry/backoff/dead-letter handling takes over.
 *
 * One IntegrationClient per call, not a fan-out to all clients here: each
 * client gets its OWN outbox event (see enqueueForAllClients below), so a
 * delivery failure to one client only retries that one client's event — the
 * dispatcher retrying a single outbox row never re-sends to a client that
 * already got a 2xx.
 *
 * @param {string} clientId - IntegrationClient.clientId to deliver to
 * @param {object} payload - { eventType, brandId, userId?, timestamp, nonce }
 */
async function sendToClient(clientId, payload) {
  const client = await integrationClientService.findActiveClientById(clientId);
  if (!client || !client.webhookUrl) {
    // Client was deactivated or its webhookUrl removed after the event was
    // enqueued — nothing to retry towards, so treat as done rather than
    // failing forever.
    return;
  }

  const clientSecret = await integrationClientService.getDecryptedSecret(client);
  const signature = signPayload(payload, clientSecret);

  await axios.post(client.webhookUrl, payload, {
    headers: {
      'X-Client-Id': client.clientId,
      'X-Signature': signature
    },
    timeout: 10000
  });
}

/**
 * Builds one outbox-event payload per active, webhook-configured client for
 * a revocation event. Call this to get the list of payloads to enqueue (one
 * outboxEventRepository.create call per entry) — kept separate from the
 * actual enqueue so callers can do it inside their own existing
 * prisma.$transaction (team.service.js#removeMember, brand.service.js#deleteBrand).
 *
 * @param {'USER_REMOVED_FROM_BRAND'|'BRAND_DEACTIVATED'} eventType
 * @param {{ brandId: string, userId?: string }} eventData
 * @returns {Promise<Array<{ clientId: string, payload: object }>>}
 */
async function buildOutboxPayloadsForAllClients(eventType, eventData) {
  const clients = await integrationClientService.findAllActiveWithWebhook();
  return clients.map((client) => ({
    clientId: client.clientId,
    payload: {
      eventType,
      brandId: eventData.brandId,
      userId: eventData.userId,
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    }
  }));
}

module.exports = { sendToClient, buildOutboxPayloadsForAllClients, serializeForSigning, signPayload };
