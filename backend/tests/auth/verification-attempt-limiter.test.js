/**
 * Unit tests for the shared Redis-backed attempt limiter used by both the
 * OTP (#58) and 2FA login-verify (#59) brute-force fixes.
 */
jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn().mockResolvedValue(1)
}));

const redisClient = require('../../src/config/redis');
const limiter = require('../../src/middlewares/verification-attempt-limiter');

describe('VerificationAttemptLimiter', () => {
  beforeEach(() => jest.clearAllMocks());

  test('checkAllowed reports allowed=true when under the limit', async () => {
    redisClient.get.mockResolvedValue('3');
    const result = await limiter.checkAllowed('otp', 'user@test.com', 600);
    expect(result).toEqual({ allowed: true, attempts: 3 });
  });

  test('checkAllowed reports allowed=false once at/above MAX_FAILED_ATTEMPTS (5)', async () => {
    redisClient.get.mockResolvedValue('5');
    const result = await limiter.checkAllowed('otp', 'user@test.com', 600);
    expect(result.allowed).toBe(false);
  });

  test('checkAllowed treats a missing counter as zero attempts', async () => {
    redisClient.get.mockResolvedValue(null);
    const result = await limiter.checkAllowed('2fa-login', 'token-abc', 300);
    expect(result).toEqual({ allowed: true, attempts: 0 });
  });

  test('recordFailedAttempt increments and sets expiry only on the first attempt', async () => {
    redisClient.incr.mockResolvedValue(1);
    await limiter.recordFailedAttempt('otp', 'user@test.com', 600);
    expect(redisClient.expire).toHaveBeenCalledWith('verify-attempts:otp:user@test.com', 600);

    jest.clearAllMocks();
    redisClient.incr.mockResolvedValue(2);
    await limiter.recordFailedAttempt('otp', 'user@test.com', 600);
    expect(redisClient.expire).not.toHaveBeenCalled();
  });

  test('reset deletes the counter key', async () => {
    await limiter.reset('2fa-login', 'token-abc');
    expect(redisClient.del).toHaveBeenCalledWith('verify-attempts:2fa-login:token-abc');
  });

  test('namespaces keep otp and 2fa-login counters independent', async () => {
    redisClient.get.mockResolvedValue('4');
    await limiter.checkAllowed('otp', 'shared-id', 600);
    await limiter.checkAllowed('2fa-login', 'shared-id', 300);

    const keysUsed = redisClient.get.mock.calls.map(c => c[0]);
    expect(keysUsed).toEqual(['verify-attempts:otp:shared-id', 'verify-attempts:2fa-login:shared-id']);
  });
});
