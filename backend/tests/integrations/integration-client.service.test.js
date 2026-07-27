jest.mock('../../src/config/prisma', () => ({
  integrationClient: { findFirst: jest.fn(), findMany: jest.fn() }
}));
jest.mock('../../src/utils/encryption', () => ({
  encrypt: jest.fn((text) => `encrypted(${text})`),
  decrypt: jest.fn((text) => text.replace(/^encrypted\((.*)\)$/, '$1'))
}));

const { getDecryptedPrevSecret } = require('../../src/services/integrations/integration-client.service');
const { decrypt } = require('../../src/utils/encryption');

describe('integration-client.service — getDecryptedPrevSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no previous secret has ever been set', async () => {
    const client = { clientSecretPrevEncrypted: null, secretPrevExpiresAt: null };
    expect(await getDecryptedPrevSecret(client)).toBeNull();
    expect(decrypt).not.toHaveBeenCalled();
  });

  it('returns the decrypted previous secret when still within the grace period', async () => {
    const client = {
      clientSecretPrevEncrypted: 'encrypted(old-secret)',
      secretPrevExpiresAt: new Date(Date.now() + 60_000)
    };
    expect(await getDecryptedPrevSecret(client)).toBe('old-secret');
  });

  it('returns null once the grace period has expired', async () => {
    const client = {
      clientSecretPrevEncrypted: 'encrypted(old-secret)',
      secretPrevExpiresAt: new Date(Date.now() - 60_000)
    };
    expect(await getDecryptedPrevSecret(client)).toBeNull();
    expect(decrypt).not.toHaveBeenCalled();
  });
});
