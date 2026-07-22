/**
 * Regression test for issue #58: OTPService.generateOTP must use a CSPRNG
 * (crypto.randomInt) instead of Math.random(), which is not suitable for
 * security-sensitive values.
 */
jest.mock('../../src/config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn()
}));

const otpService = require('../../src/services/auth/otp.service');

describe('OTPService.generateOTP (#58)', () => {
  test('produces a 6-digit numeric string within [100000, 999999]', async () => {
    for (let i = 0; i < 30; i++) {
      const otp = await otpService.generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
      const value = Number(otp);
      expect(value).toBeGreaterThanOrEqual(100000);
      expect(value).toBeLessThanOrEqual(999999);
    }
  });

  test('does not rely on Math.random', async () => {
    const spy = jest.spyOn(Math, 'random');
    await otpService.generateOTP();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
