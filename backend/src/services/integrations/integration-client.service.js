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

module.exports = {
  findActiveClientById,
  getDecryptedSecret,
  encryptSecret: encrypt
};
