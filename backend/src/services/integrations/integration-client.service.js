const prisma = require('../../config/prisma');
const { encrypt, decrypt } = require('../../utils/encryption');

/**
 * Finds an active, non-revoked integration client by its public clientId.
 * @param {string} clientId
 * @returns {Promise<object|null>}
 */
async function findActiveClientById(clientId) {
  return prisma.integrationClient.findFirst({
    where: { clientId, isActive: true, revokedAt: null }
  });
}

/**
 * Decrypts the stored client secret so HMAC verification can recompute the
 * signature. HMAC requires the plaintext secret — unlike a password, it
 * cannot be verified from a one-way hash.
 * @param {object} client - row returned by findActiveClientById
 * @returns {Promise<string>}
 */
async function getDecryptedSecret(client) {
  return decrypt(client.clientSecretEncrypted);
}

/**
 * All active clients that have registered a webhook URL — used to fan out
 * critical revocation events (see revocation-webhook.service.js). A client
 * with no webhookUrl configured is skipped, not an error: not every
 * integration has opted into receiving pushed events yet.
 * @returns {Promise<object[]>}
 */
async function findAllActiveWithWebhook() {
  return prisma.integrationClient.findMany({
    where: { isActive: true, revokedAt: null, webhookUrl: { not: null } }
  });
}

module.exports = {
  findActiveClientById,
  getDecryptedSecret,
  encryptSecret: encrypt,
  findAllActiveWithWebhook
};
