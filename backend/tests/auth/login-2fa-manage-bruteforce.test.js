const { TwoFactorVerificationStrategy } = require('../../src/services/auth/verification.strategy');
const verificationAttemptLimiter = require('../../src/middlewares/verification-attempt-limiter');
const { authenticator } = require('otplib');

jest.mock('otplib', () => ({
  authenticator: {
    verify: jest.fn()
  }
}));
jest.mock('../../src/middlewares/verification-attempt-limiter');

describe('2FA Management Brute-Force Rate-Limiting Guard (#256)', () => {
  const strategy = new TwoFactorVerificationStrategy();
  const mockSecret = 'KVKFKRCPNZQUYWRX';
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow verification when rate limit check passes and TOTP is correct', async () => {
    verificationAttemptLimiter.checkAllowed.mockResolvedValue({ allowed: true, attempts: 0 });
    authenticator.verify.mockReturnValue(true);

    const result = await strategy.verify(mockSecret, '123456', mockUserId);

    expect(result).toBe(true);
    expect(verificationAttemptLimiter.checkAllowed).toHaveBeenCalledWith('2fa-manage', mockUserId, 900);
    expect(verificationAttemptLimiter.reset).toHaveBeenCalledWith('2fa-manage', mockUserId);
  });

  it('should record failed attempt when TOTP code is incorrect', async () => {
    verificationAttemptLimiter.checkAllowed.mockResolvedValue({ allowed: true, attempts: 1 });
    authenticator.verify.mockReturnValue(false);

    await expect(strategy.verify(mockSecret, '000000', mockUserId)).rejects.toThrow('Mã xác thực 2 lớp không hợp lệ.');
    
    expect(verificationAttemptLimiter.recordFailedAttempt).toHaveBeenCalledWith('2fa-manage', mockUserId, 900);
    expect(verificationAttemptLimiter.reset).not.toHaveBeenCalled();
  });

  it('should block verification with status 429 after 5 failed attempts even if code is correct', async () => {
    verificationAttemptLimiter.checkAllowed.mockResolvedValue({ allowed: false, attempts: 5 });

    let thrownError;
    try {
      await strategy.verify(mockSecret, '123456', mockUserId);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.status).toBe(429);
    expect(thrownError.message).toContain('Quá nhiều lần thử sai');
    expect(authenticator.verify).not.toHaveBeenCalled();
  });
});
