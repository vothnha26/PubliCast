const request = require('supertest');
const app = require('../src/app');
const authService = require('../src/services/auth.service');

// Mock Redis config to prevent connection attempts during tests
jest.mock('../src/config/redis', () => ({
  on: jest.fn(),
  connect: jest.fn(),
  isOpen: true
}));

// Mock authService to isolate integration test from logic layer
jest.mock('../src/services/auth.service');

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegistration = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    it('should return 201 when registration is successful', async () => {
      authService.register.mockResolvedValue({ id: 'user-123' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistration);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('successful');
      expect(authService.register).toHaveBeenCalledWith(
        validRegistration.name,
        validRegistration.email,
        validRegistration.password
      );
    });

    it('should return 400 when validation fails (passwords mismatch)', async () => {
      const invalidData = { ...validRegistration, confirmPassword: 'wrong' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 409 when email already exists', async () => {
      const error = new Error('Email already exists');
      error.status = 409;
      authService.register.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistration);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Email already exists');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should return 200 when OTP is valid', async () => {
      authService.verifyOTP.mockResolvedValue({ message: 'Account activated successfully' });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'john@example.com', otp: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account activated successfully');
    });

    it('should return 400 when OTP is invalid format', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'john@example.com', otp: '123' }); // Too short

      expect(response.status).toBe(400);
    });
  });
});
