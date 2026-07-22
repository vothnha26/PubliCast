/**
 * Regression tests for issue #59: loginVerify2FA must cap wrong TOTP guesses
 * and invalidate preAuthToken once the limit is hit, instead of allowing
 * unlimited guesses against a 5-minute preAuthToken.
 */
jest.mock('../../src/repositories/auth/user.repository', () => ({
  findById: jest.fn(),
  updateProfile: jest.fn()
}));
jest.mock('../../src/services/auth/token.service', () => ({
  generateAndSaveTokens: jest.fn()
}));
jest.mock('../../src/services/core/email.service', () => ({}));
jest.mock('../../src/services/social/google-oauth.service', () => ({}));
jest.mock('../../src/services/workspace/brand.service', () => ({}));
jest.mock('../../src/events/event-emitter', () => ({ eventEmitter: { emit: jest.fn() }, EVENTS: {} }));
jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn()
}));
jest.mock('../../src/middlewares/verification-attempt-limiter', () => ({
  checkAllowed: jest.fn(),
  recordFailedAttempt: jest.fn(),
  reset: jest.fn()
}));
// otplib pulls in @scure/base, which this repo's Jest config can't parse
// (pre-existing, unrelated) — stub the strategy module that dynamically
// requires it so loading auth.service.js doesn't trigger that chain.
jest.mock('../../src/services/auth/verification.strategy', () => ({
  OtpVerificationStrategy: jest.fn(),
  LinkTokenVerificationStrategy: jest.fn(),
  VerificationContext: jest.fn(),
  TwoFactorVerificationStrategy: jest.fn().mockImplementation(() => ({
    verify: jest.fn()
  }))
}));

const authService = require('../../src/services/auth/auth.service');
const userRepository = require('../../src/repositories/auth/user.repository');
const tokenService = require('../../src/services/auth/token.service');
const redisClient = require('../../src/config/redis');
const verificationAttemptLimiter = require('../../src/middlewares/verification-attempt-limiter');
const { TwoFactorVerificationStrategy } = require('../../src/services/auth/verification.strategy');

describe('AuthService.loginVerify2FA (#59)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisClient.get.mockResolvedValue('user-1');
    verificationAttemptLimiter.checkAllowed.mockResolvedValue({ allowed: true, attempts: 0 });
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      isTwoFactorEnabled: true,
      twoFactorSecret: 'SECRET',
      twoFactorBackupCodes: null
    });
    tokenService.generateAndSaveTokens.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
  });

  test('succeeds on a correct TOTP code and resets the attempt counter', async () => {
    TwoFactorVerificationStrategy.mockImplementation(() => ({
      verify: jest.fn().mockResolvedValue(true)
    }));

    const result = await authService.loginVerify2FA('pre-auth-token', '123456');

    expect(result.accessToken).toBe('at');
    expect(redisClient.del).toHaveBeenCalledWith('pre-auth:pre-auth-token');
    expect(verificationAttemptLimiter.reset).toHaveBeenCalledWith('2fa-login', 'pre-auth-token');
  });

  test('records a failed attempt on a wrong TOTP code without invalidating preAuthToken yet', async () => {
    TwoFactorVerificationStrategy.mockImplementation(() => ({
      verify: jest.fn().mockRejectedValue(new Error('bad code'))
    }));

    await expect(authService.loginVerify2FA('pre-auth-token', '000000'))
      .rejects.toThrow('Mã xác thực không chính xác.');

    expect(verificationAttemptLimiter.recordFailedAttempt).toHaveBeenCalledWith('2fa-login', 'pre-auth-token', 300);
    expect(redisClient.del).not.toHaveBeenCalled();
  });

  test('invalidates preAuthToken once the attempt limit is exceeded (core #59 bug)', async () => {
    verificationAttemptLimiter.checkAllowed.mockResolvedValue({ allowed: false, attempts: 5 });

    await expect(authService.loginVerify2FA('pre-auth-token', '999999'))
      .rejects.toThrow('Quá nhiều lần thử sai');

    expect(redisClient.del).toHaveBeenCalledWith('pre-auth:pre-auth-token');
  });

  test('throws when preAuthToken has expired or does not exist', async () => {
    redisClient.get.mockResolvedValue(null);

    await expect(authService.loginVerify2FA('missing-token', '123456'))
      .rejects.toThrow('Yêu cầu xác thực đã hết hạn hoặc không hợp lệ.');
    expect(verificationAttemptLimiter.checkAllowed).not.toHaveBeenCalled();
  });
});
