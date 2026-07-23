jest.mock('../../src/config/redis', () => ({
  set: jest.fn()
}));

const redisClient = require('../../src/config/redis');
const {
  serializePayloadForSigning,
  computeSignature,
  verifySignature,
  isTimestampFresh,
  consumeNonceOnce
} = require('../../src/services/integrations/hmac-verify.service');

describe('hmac-verify.service', () => {
  const secret = 'super-secret-key-123';
  const payload = {
    brandId: 'brand-uuid-111',
    userId: 'user-uuid-222',
    timestamp: Date.now(),
    nonce: 'random-nonce-333'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('serializePayloadForSigning', () => {
    it('joins fields in fixed order with | delimiter', () => {
      expect(serializePayloadForSigning(payload)).toBe(
        `${payload.brandId}|${payload.userId}|${payload.timestamp}|${payload.nonce}`
      );
    });
  });

  describe('computeSignature & verifySignature', () => {
    it('produces a deterministic signature for the same payload and secret', () => {
      expect(computeSignature(payload, secret)).toBe(computeSignature(payload, secret));
    });

    it('verifies successfully when signature is valid', () => {
      const sig = computeSignature(payload, secret);
      expect(verifySignature(payload, sig, secret)).toBe(true);
    });

    it('fails verification when payload content changes but signature length matches', () => {
      const sig = computeSignature(payload, secret);
      const tamperedSig = sig.slice(0, -1) + (sig.slice(-1) === 'a' ? 'b' : 'a');
      expect(verifySignature(payload, tamperedSig, secret)).toBe(false);
    });

    it('fails verification when secret is wrong', () => {
      const sig = computeSignature(payload, secret);
      expect(verifySignature(payload, sig, 'wrong-secret')).toBe(false);
    });

    it('fails gracefully (no throw) when signature has a different length', () => {
      expect(verifySignature(payload, '1234', secret)).toBe(false);
    });
  });

  describe('isTimestampFresh', () => {
    it('accepts a timestamp within the ±5 minute window', () => {
      expect(isTimestampFresh(Date.now() - 60_000)).toBe(true);
    });

    it('rejects a timestamp older than the window', () => {
      expect(isTimestampFresh(Date.now() - 6 * 60 * 1000)).toBe(false);
    });

    it('rejects a timestamp in the future beyond the window', () => {
      expect(isTimestampFresh(Date.now() + 6 * 60 * 1000)).toBe(false);
    });
  });

  describe('consumeNonceOnce', () => {
    it('returns true when Redis SET NX succeeds (new nonce)', async () => {
      redisClient.set.mockResolvedValue('OK');
      const result = await consumeNonceOnce('client-1', 'nonce-abc');
      expect(result).toBe(true);
      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('client-1'),
        '1',
        expect.objectContaining({ NX: true })
      );
    });

    it('returns false when Redis SET NX fails (nonce already used)', async () => {
      redisClient.set.mockResolvedValue(null);
      const result = await consumeNonceOnce('client-1', 'nonce-abc');
      expect(result).toBe(false);
    });
  });
});
