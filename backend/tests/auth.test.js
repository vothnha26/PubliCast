const authService = require('../src/services/auth.service');
const userRepository = require('../src/repositories/user.repository');
const otpService = require('../src/services/otp.service');
const emailService = require('../src/services/email.service');
const redisClient = require('../src/config/redis');
const bcrypt = require('bcryptjs');

jest.mock('../src/config/redis', () => ({
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

jest.mock('../src/repositories/user.repository');
jest.mock('../src/services/otp.service');
jest.mock('../src/services/email.service');
jest.mock('bcryptjs');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      userRepository.createUser.mockResolvedValue({ id: 'user-123', ...userData });
      otpService.generateOTP.mockResolvedValue('123456');
      
      const result = await authService.register(userData.name, userData.email, userData.password);
      
      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(userRepository.createUser).toHaveBeenCalled();
      expect(otpService.saveOTP).toHaveBeenCalledWith(userData.email, '123456');
      expect(emailService.sendOTP).toHaveBeenCalledWith(userData.email, '123456');
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
    it('should verify OTP successfully', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      
      otpService.getOTP.mockResolvedValue(otp);
      
      const result = await authService.verifyOTP(email, otp);
      
      expect(userRepository.updateStatus).toHaveBeenCalledWith(email, 'ACTIVE', expect.any(Date));
      expect(otpService.deleteOTP).toHaveBeenCalledWith(email);
      expect(result.message).toBe('Account activated successfully');
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
    it('should send reset OTP for an active user', async () => {
      const email = 'test@example.com';

      userRepository.findByEmailWithPassword.mockResolvedValue({
        id: 'user-123',
        email,
        status: 'ACTIVE',
        passwordHash: 'oldHash'
      });
      otpService.generateOTP.mockResolvedValue('654321');

      const result = await authService.forgotPassword(email);

      expect(redisClient.setEx).toHaveBeenCalledWith('forgot-otp:test@example.com', 300, '654321');
      expect(redisClient.del).toHaveBeenCalledWith('forgot-otp-attempts:test@example.com');
      expect(emailService.sendForgotPasswordOTP).toHaveBeenCalledWith(email, '654321');
      expect(result.message).toBe('OTP sent if email exists');
    });

    it('should return generic success if email does not exist', async () => {
      userRepository.findByEmailWithPassword.mockResolvedValue(null);

      const result = await authService.forgotPassword('missing@example.com');

      expect(redisClient.setEx).not.toHaveBeenCalled();
      expect(emailService.sendForgotPasswordOTP).not.toHaveBeenCalled();
      expect(result.message).toBe('OTP sent if email exists');
    });
  });

  describe('resetPassword', () => {
    it('should reset password when OTP is valid', async () => {
      const email = 'test@example.com';

      redisClient.get.mockResolvedValue('123456');
      userRepository.findByEmailWithPassword.mockResolvedValue({
        id: 'user-123',
        email,
        status: 'ACTIVE',
        passwordHash: 'oldHash'
      });
      bcrypt.compare.mockResolvedValue(false);
      bcrypt.hash.mockResolvedValue('newHash');
      userRepository.updateLocalPassword.mockResolvedValue({ count: 1 });

      const result = await authService.resetPassword(email, '123456', 'newPassword123');

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(userRepository.updateLocalPassword).toHaveBeenCalledWith(email, 'newHash');
      expect(redisClient.del).toHaveBeenCalledWith('forgot-otp:test@example.com');
      expect(redisClient.del).toHaveBeenCalledWith('forgot-otp-attempts:test@example.com');
      expect(redisClient.del).toHaveBeenCalledWith('refresh:user-123');
      expect(result.message).toBe('Password reset successfully');
    });

    it('should reject expired OTP', async () => {
      redisClient.get.mockResolvedValue(null);

      await expect(authService.resetPassword('test@example.com', '123456', 'newPassword123'))
        .rejects.toThrow('OTP has expired, please request again');
    });

    it('should count wrong OTP attempts', async () => {
      redisClient.get.mockResolvedValue('123456');
      redisClient.incr.mockResolvedValue(1);

      await expect(authService.resetPassword('test@example.com', '000000', 'newPassword123'))
        .rejects.toThrow('Invalid OTP. 2 attempts remaining');

      expect(redisClient.expire).toHaveBeenCalledWith('forgot-otp-attempts:test@example.com', 300);
    });

    it('should delete OTP after 3 wrong attempts', async () => {
      redisClient.get.mockResolvedValue('123456');
      redisClient.incr.mockResolvedValue(3);

      await expect(authService.resetPassword('test@example.com', '000000', 'newPassword123'))
        .rejects.toThrow('Invalid OTP too many times. Please request a new OTP.');

      expect(redisClient.del).toHaveBeenCalledWith('forgot-otp:test@example.com');
      expect(redisClient.del).toHaveBeenCalledWith('forgot-otp-attempts:test@example.com');
    });
  });
});
