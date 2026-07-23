jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../../src/services/integrations/integration-client.service', () => ({
  findActiveClientById: jest.fn(),
  findAllActiveWithWebhook: jest.fn(),
  getDecryptedSecret: jest.fn()
}));

const axios = require('axios');
const integrationClientService = require('../../src/services/integrations/integration-client.service');
const {
  sendToClient,
  buildOutboxPayloadsForAllClients,
  serializeForSigning,
  signPayload
} = require('../../src/services/integrations/revocation-webhook.service');

describe('revocation-webhook.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('serializeForSigning & signPayload', () => {
    it('joins fields in fixed order with | delimiter, empty string for missing userId', () => {
      const payload = { eventType: 'BRAND_DEACTIVATED', brandId: 'brand-1', timestamp: 111, nonce: 'n1' };
      expect(serializeForSigning(payload)).toBe('BRAND_DEACTIVATED|brand-1||111|n1');
    });

    it('produces a deterministic HMAC-SHA256 signature for the same payload and secret', () => {
      const payload = { eventType: 'USER_REMOVED_FROM_BRAND', brandId: 'brand-1', userId: 'user-1', timestamp: 111, nonce: 'n1' };
      expect(signPayload(payload, 'secret')).toBe(signPayload(payload, 'secret'));
    });
  });

  describe('sendToClient', () => {
    const payload = { eventType: 'USER_REMOVED_FROM_BRAND', brandId: 'brand-1', userId: 'user-1', timestamp: 111, nonce: 'n1' };

    it('signs and POSTs to the client webhookUrl with X-Client-Id/X-Signature headers', async () => {
      integrationClientService.findActiveClientById.mockResolvedValue({
        clientId: 'client-1',
        webhookUrl: 'https://convo.example.com/webhooks/publicast',
        clientSecretEncrypted: 'enc'
      });
      integrationClientService.getDecryptedSecret.mockResolvedValue('plaintext-secret');
      axios.post.mockResolvedValue({ status: 200 });

      await sendToClient('client-1', payload);

      expect(axios.post).toHaveBeenCalledWith(
        'https://convo.example.com/webhooks/publicast',
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Client-Id': 'client-1',
            'X-Signature': signPayload(payload, 'plaintext-secret')
          })
        })
      );
    });

    it('is a no-op when the client is no longer active or has no webhookUrl (treated as done, not a failure to retry forever)', async () => {
      integrationClientService.findActiveClientById.mockResolvedValue(null);

      await expect(sendToClient('client-1', payload)).resolves.toBeUndefined();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('propagates the error when the POST fails, so the outbox dispatcher retries', async () => {
      integrationClientService.findActiveClientById.mockResolvedValue({
        clientId: 'client-1',
        webhookUrl: 'https://convo.example.com/webhooks/publicast',
        clientSecretEncrypted: 'enc'
      });
      integrationClientService.getDecryptedSecret.mockResolvedValue('plaintext-secret');
      axios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(sendToClient('client-1', payload)).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('buildOutboxPayloadsForAllClients', () => {
    it('returns one payload per active webhook-configured client, each with a fresh nonce/timestamp', async () => {
      integrationClientService.findAllActiveWithWebhook.mockResolvedValue([
        { clientId: 'client-1', webhookUrl: 'https://a.example.com' },
        { clientId: 'client-2', webhookUrl: 'https://b.example.com' }
      ]);

      const result = await buildOutboxPayloadsForAllClients('BRAND_DEACTIVATED', { brandId: 'brand-1' });

      expect(result).toHaveLength(2);
      expect(result[0].clientId).toBe('client-1');
      expect(result[1].clientId).toBe('client-2');
      expect(result[0].payload).toMatchObject({ eventType: 'BRAND_DEACTIVATED', brandId: 'brand-1' });
      expect(result[0].payload.nonce).not.toBe(result[1].payload.nonce);
    });

    it('returns an empty array when no clients have a webhookUrl configured', async () => {
      integrationClientService.findAllActiveWithWebhook.mockResolvedValue([]);

      const result = await buildOutboxPayloadsForAllClients('USER_REMOVED_FROM_BRAND', { brandId: 'brand-1', userId: 'user-1' });

      expect(result).toEqual([]);
    });
  });
});
