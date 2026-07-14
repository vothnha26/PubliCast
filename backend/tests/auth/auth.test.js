const authService = require('../../src/services/auth/auth.service');
const userRepository = require('../../src/repositories/auth/user.repository');
const emailService = require('../../src/services/core/email.service');
const redisClient = require('../../src/config/redis');
const bcrypt = require('bcryptjs');
const { eventEmitter, EVENTS } = require('../../src/events/event-emitter');
const { ERROR_MESSAGES } = require('../../src/utils/constants');

jest.mock('../../src/config/redis', () => ({
  on: jest.fn(),
  connect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  isOpen: true
}));

jest.mock('../../src/events/event-emitter', () => ({
  eventEmitter: {
    emit: jest.fn()
  },
  EVENTS: {
    USER: {
      REGISTERED: 'user.registered'
    }
  }
}));

jest.mock('../../src/repositories/auth/user.repository');
jest.mock('../../src/services/auth/otp.service', () => ({
  generateOTP: jest.fn().mockResolvedValue('123456'),
  saveOTP: jest.fn(),
  getOTP: jest.fn(),
  deleteOTP: jest.fn()
}));
jest.mock('../../src/services/core/email.service');
jest.mock('bcryptjs');

const otpService = require('../../src/services/auth/otp.service');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully and emit event with OTP Strategy', async () => {
      const userData = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      userRepository.createUser.mockResolvedValue({ id: 'user-123', ...userData });
      
      const result = await authService.register(userData.name, userData.email, userData.password);
      
      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(userRepository.createUser).toHaveBeenCalled();
      expect(otpService.saveOTP).toHaveBeenCalledWith(userData.email, '123456');
      
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.USER.REGISTERED, expect.objectContaining({
        user: expect.any(Object),
        otp: '123456'
      }));
      expect(result.id).toBe('user-123');
    });

    it('should throw error if email already exists', async () => {
      const userData = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      userRepository.findByEmail.mockResolvedValue({ id: 'existing-id' });
      
      await expect(authService.register(userData.name, userData.email, userData.password))
        .rejects.toThrow('Email already exists');
    });
  });

  describe('verifyOTP', () => {
    it('should verify OTP successfully and activate account', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      
      otpService.getOTP.mockResolvedValue(otp);
      userRepository.updateStatus.mockResolvedValue({ id: 'user-123', email, name: 'Test', role: 'USER' });
      
      const result = await authService.verifyOTP(email, otp);
      
      expect(userRepository.updateStatus).toHaveBeenCalledWith(email, 'ACTIVE', expect.any(Date));
      expect(otpService.deleteOTP).toHaveBeenCalledWith(email);
      expect(result.message).toBe(ERROR_MESSAGES.ACTIVATION_SUCCESS);
    });

    it('should throw error if OTP has expired', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      
      otpService.getOTP.mockResolvedValue(null);
      
      await expect(authService.verifyOTP(email, otp))
        .rejects.toThrow('OTP has expired');
    });

    it('should throw error if OTP is invalid', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      
      otpService.getOTP.mockResolvedValue('wrong-otp');
      
      await expect(authService.verifyOTP(email, otp))
        .rejects.toThrow('Invalid OTP');
    });
  });

  describe('forgotPassword', () => {
    it('should send reset Link Token for active user', async () => {
      const email = 'test@example.com';

      userRepository.findByEmailWithPassword.mockResolvedValue({
        id: 'user-123',
        email,
        isActive: true,
        isEmailVerified: true,
        passwordHash: 'oldHash'
      });

      const result = await authService.forgotPassword(email);

      expect(redisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('reset-token:'),
        900,
        email
      );
      expect(emailService.sendResetPasswordLink).toHaveBeenCalledWith(
        email,
        expect.stringContaining('/reset-password?token=')
      );
      expect(result.message).toBe(ERROR_MESSAGES.RESET_LINK_SENT);
    });
  });

  describe('verifyResetToken', () => {
    it('should return email if reset token is valid', async () => {
      const token = 'valid-token';
      const email = 'test@example.com';
      redisClient.get.mockResolvedValue(email);

      const result = await authService.verifyResetToken(token);

      expect(redisClient.get).toHaveBeenCalledWith(`reset-token:${token}`);
      expect(result).toEqual({ valid: true, email });
    });

    it('should throw error if reset token is expired or invalid', async () => {
      const token = 'invalid-token';
      redisClient.get.mockResolvedValue(null);

      await expect(authService.verifyResetToken(token))
        .rejects.toThrow('Đường dẫn khôi phục mật khẩu đã hết hạn hoặc không hợp lệ.');
    });
  });

  describe('resetPasswordWithToken', () => {
    it('should update password successfully and clear tokens', async () => {
      const token = 'valid-token';
      const email = 'test@example.com';
      const newPassword = 'newPassword123';

      redisClient.get.mockResolvedValue(email);
      userRepository.findByEmailWithPassword.mockResolvedValue({
        id: 'user-123',
        email,
        isActive: true,
        passwordHash: 'oldHash'
      });
      bcrypt.compare.mockResolvedValue(false);
      bcrypt.hash.mockResolvedValue('newHash');
      userRepository.updateLocalPassword.mockResolvedValue({ count: 1 });

      const result = await authService.resetPasswordWithToken(token, newPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(userRepository.updateLocalPassword).toHaveBeenCalledWith(email, 'newHash');
      expect(redisClient.del).toHaveBeenCalledWith(`reset-token:${token}`);
      expect(result.message).toBe(ERROR_MESSAGES.RESET_PASSWORD_SUCCESS);
    });

    it('should throw error if new password is same as old password', async () => {
      const token = 'valid-token';
      const email = 'test@example.com';
      const newPassword = 'oldPassword';

      redisClient.get.mockResolvedValue(email);
      userRepository.findByEmailWithPassword.mockResolvedValue({
        id: 'user-123',
        email,
        isActive: true,
        passwordHash: 'oldHash'
      });
      bcrypt.compare.mockResolvedValue(true);

      await expect(authService.resetPasswordWithToken(token, newPassword))
        .rejects.toThrow(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD);
    });
  });
});
