const authService = require('../src/services/auth.service');
const userRepository = require('../src/repositories/user.repository');
const otpService = require('../src/services/otp.service');
const emailService = require('../src/services/email.service');
const bcrypt = require('bcryptjs');

jest.mock('../src/config/redis', () => ({
  on: jest.fn(),
  connect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  isOpen: true
}));

jest.mock('../src/repositories/user.repository');
jest.mock('../src/services/otp.service');
jest.mock('../src/services/email.service');
jest.mock('bcryptjs');

describe('AuthService', () => {
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
});
