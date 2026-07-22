/**
 * Regression tests for issue #58: OtpVerificationStrategy.verify must cap
 * wrong guesses and burn the OTP once the limit is hit, instead of letting
 * an attacker try all 900,000 combinations within the 10-minute TTL.
 */
jest.mock('../../src/services/auth/otp.service', () => ({
  getOTP: jest.fn(),
  deleteOTP: jest.fn()
}));
jest.mock('../../src/middlewares/verification-attempt-limiter', () => ({
  checkAllowed: jest.fn(),
  recordFailedAttempt: jest.fn(),
  reset: jest.fn()
}));
// otplib pulls in @scure/base which Jest can't parse under this repo's
// config (pre-existing, unrelated to this fix) — stub it so requiring
// verification.strategy.js doesn't trigger that chain.
jest.mock('otplib', () => ({ authenticator: {} }));

const { OtpVerificationStrategy } = require('../../src/services/auth/verification.strategy');
const otpService = require('../../src/services/auth/otp.service');
const verificationAttemptLimiter = require('../../src/middlewares/verification-attempt-limiter');

describe('OtpVerificationStrategy.verify (#58)', () => {
  let strategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new OtpVerificationStrategy();
    verificationAttemptLimiter.checkAllowed.mockResolvedValue({ allowed: true, attempts: 0 });
  });

  test('succeeds and resets the attempt counter on a correct guess', async () => {
    otpService.getOTP.mockResolvedValue('123456');

    const result = await strategy.verify('user@test.com', '123456');

    expect(result).toBe(true);
    expect(otpService.deleteOTP).toHaveBeenCalledWith('user@test.com');
    expect(verificationAttemptLimiter.reset).toHaveBeenCalledWith('otp', 'user@test.com');
  });

  test('records a failed attempt on a wrong guess without deleting the OTP yet', async () => {
    otpService.getOTP.mockResolvedValue('123456');

    await expect(strategy.verify('user@test.com', '000000')).rejects.toThrow('Invalid OTP');

    expect(verificationAttemptLimiter.recordFailedAttempt).toHaveBeenCalledWith('otp', 'user@test.com', 600);
    expect(otpService.deleteOTP).not.toHaveBeenCalled();
  });

  test('burns the OTP and rejects once the attempt limit is exceeded (core #58 bug)', async () => {
    otpService.getOTP.mockResolvedValue('123456');
    verificationAttemptLimiter.checkAllowed.mockResolvedValue({ allowed: false, attempts: 5 });

    await expect(strategy.verify('user@test.com', '999999')).rejects.toThrow('Too many incorrect attempts');

    expect(otpService.deleteOTP).toHaveBeenCalledWith('user@test.com');
  });

  test('throws when the OTP has already expired', async () => {
    otpService.getOTP.mockResolvedValue(null);

    await expect(strategy.verify('user@test.com', '123456')).rejects.toThrow('OTP has expired');
    expect(verificationAttemptLimiter.checkAllowed).not.toHaveBeenCalled();
  });
});
