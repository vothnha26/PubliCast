/**
 * Covers verifyHmac()'s dual-secret grace-period behavior (SPEC.md §8) added
 * alongside secret rotation: a request signed with either the current or
 * the not-yet-expired previous secret must be accepted, and both signature
 * checks must run unconditionally (no short-circuit) so response timing
 * can't reveal which secret matched.
 */
jest.mock('../../src/services/integrations/integration-client.service');
jest.mock('../../src/services/integrations/hmac-verify.service');

const { verifyHmac } = require('../../src/middlewares/hmac-auth.middleware');
const {
  findActiveClientById,
  getDecryptedSecret,
  getDecryptedPrevSecret
} = require('../../src/services/integrations/integration-client.service');
const { verifySignature, isTimestampFresh, consumeNonceOnce } = require('../../src/services/integrations/hmac-verify.service');

describe('verifyHmac (secret rotation grace period)', () => {
  let req, res, next;
  const payload = {
    brandId: 'brand-1',
    userId: 'user-1',
    timestamp: Date.now(),
    nonce: 'nonce-1'
  };
  const client = { id: 'client-row-1', clientId: 'client-1' };

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: { payload, signature: 'sig', client_id: 'client-1' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();

    findActiveClientById.mockResolvedValue(client);
    getDecryptedSecret.mockResolvedValue('current-secret');
    isTimestampFresh.mockReturnValue(true);
    consumeNonceOnce.mockResolvedValue(true);
  });

  it('passes when signature matches the current secret (no previous secret active)', async () => {
    getDecryptedPrevSecret.mockResolvedValue(null);
    verifySignature.mockImplementation((_p, _s, secret) => secret === 'current-secret');

    await verifyHmac()(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes when signature matches the previous secret within its grace period', async () => {
    getDecryptedPrevSecret.mockResolvedValue('prev-secret');
    verifySignature.mockImplementation((_p, _s, secret) => secret === 'prev-secret');

    await verifyHmac()(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('checks both current and previous secrets unconditionally, not short-circuiting on the first match', async () => {
    getDecryptedPrevSecret.mockResolvedValue('prev-secret');
    verifySignature.mockImplementation((_p, _s, secret) => secret === 'prev-secret');

    await verifyHmac()(req, res, next);

    expect(verifySignature).toHaveBeenCalledWith(payload, 'sig', 'current-secret');
    expect(verifySignature).toHaveBeenCalledWith(payload, 'sig', 'prev-secret');
    expect(verifySignature).toHaveBeenCalledTimes(2);
  });

  it('rejects with 401 when signature matches neither current nor previous secret', async () => {
    getDecryptedPrevSecret.mockResolvedValue('prev-secret');
    verifySignature.mockReturnValue(false);

    await verifyHmac()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with the same generic message whether the client_id is unknown or the signature is wrong', async () => {
    getDecryptedPrevSecret.mockResolvedValue(null);
    verifySignature.mockReturnValue(false);
    await verifyHmac()(req, res, next);
    const wrongSigMessage = res.json.mock.calls[0][0].message;

    jest.clearAllMocks();
    req = { body: { payload, signature: 'sig', client_id: 'unknown-client' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
    findActiveClientById.mockResolvedValue(null);

    await verifyHmac()(req, res, next);
    const unknownClientMessage = res.json.mock.calls[0][0].message;

    expect(wrongSigMessage).toBe(unknownClientMessage);
  });
});
