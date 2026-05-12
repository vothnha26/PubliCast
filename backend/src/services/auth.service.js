const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const otpService = require('./otp.service');
const emailService = require('./email.service');
const jwtUtils = require('../utils/jwt.utils');
const redisClient = require('../config/redis');

const { USER_STATUS, AUTH_PROVIDERS, ERROR_MESSAGES } = require('../utils/constants');

const FORGOT_PASSWORD_OTP_PREFIX = 'forgot-otp';
const FORGOT_PASSWORD_ATTEMPTS_PREFIX = 'forgot-otp-attempts';
const FORGOT_PASSWORD_OTP_EXPIRY_SECONDS = 5 * 60;
const MAX_RESET_OTP_ATTEMPTS = 3;

class AuthService {
  async register(name, email, password) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      error.status = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user with status INACTIVE (pending)
    const user = await userRepository.createUser(
      { fullName: name, email, status: USER_STATUS.INACTIVE },
      { provider: AUTH_PROVIDERS.LOCAL, passwordHash }
    );

    const otp = await otpService.generateOTP();
    await otpService.saveOTP(email, otp);
    await emailService.sendOTP(email, otp);

    return user;
  }

  async verifyOTP(email, otp) {
    const savedOTP = await otpService.getOTP(email);
    
    if (!savedOTP) {
      const error = new Error(ERROR_MESSAGES.OTP_EXPIRED);
      error.status = 400;
      throw error;
    }

    if (savedOTP !== otp) {
      const error = new Error(ERROR_MESSAGES.INVALID_OTP);
      error.status = 400;
      throw error;
    }

    await userRepository.updateStatus(email, USER_STATUS.ACTIVE, new Date());
    await otpService.deleteOTP(email);

    return { message: ERROR_MESSAGES.ACTIVATION_SUCCESS };
  }

  /**
   * Login user with email and password
   * @param {string} email - user email
   * @param {string} password - user password
   * @returns {Promise<Object>} - { accessToken, refreshToken, role }
   */
  async login(email, password) {
    // Find user by email with password hash
    const user = await userRepository.findByEmailWithPassword(email);

    if (!user) {
      const error = new Error(ERROR_MESSAGES.INVALID_EMAIL);
      error.status = 401;
      throw error;
    }

    // Check account status
    if (user.status === USER_STATUS.INACTIVE) {
      const error = new Error(ERROR_MESSAGES.ACCOUNT_NOT_ACTIVATED);
      error.status = 403;
      throw error;
    }

    if (user.status === USER_STATUS.BANNED) {
      const error = new Error(ERROR_MESSAGES.ACCOUNT_BANNED);
      error.status = 403;
      throw error;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      const error = new Error(ERROR_MESSAGES.INVALID_PASSWORD);
      error.status = 401;
      throw error;
    }

    // Generate JWT tokens
    const accessToken = jwtUtils.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = jwtUtils.generateRefreshToken({
      id: user.id
    });

    // Hash and save refresh token to Redis
    const hashedRefreshToken = jwtUtils.hashRefreshToken(refreshToken);
    await redisClient.setEx(
      `refresh:${user.id}`,
      jwtUtils.getRefreshTokenRedisExpiry(),
      hashedRefreshToken
    );

    return {
      accessToken,
      refreshToken,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    };
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - refresh token from cookie/request
   * @param {string} userId - user ID from token
   * @returns {Promise<Object>} - { accessToken, refreshToken }
   */
  async refreshTokens(refreshToken, userId) {
    try {
      // Verify refresh token signature
      const decoded = jwtUtils.verifyRefreshToken(refreshToken);

      if (decoded.id !== userId) {
        throw new Error('Token user mismatch');
      }

      // Check refresh token in Redis
      const storedHash = await redisClient.get(`refresh:${userId}`);
      const tokenHash = jwtUtils.hashRefreshToken(refreshToken);

      if (!storedHash || storedHash !== tokenHash) {
        throw new Error('Refresh token not found or invalid');
      }

      // Get user data
      const user = await userRepository.findById(userId);
      if (!user || user.status !== USER_STATUS.ACTIVE) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const newAccessToken = jwtUtils.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      const newRefreshToken = jwtUtils.generateRefreshToken({
        id: user.id
      });

      // Update refresh token in Redis (rotation)
      const newTokenHash = jwtUtils.hashRefreshToken(newRefreshToken);
      await redisClient.setEx(
        `refresh:${userId}`,
        jwtUtils.getRefreshTokenRedisExpiry(),
        newTokenHash
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      const err = new Error(error.message || 'Token refresh failed');
      err.status = 401;
      throw err;
    }
  }

  /**
   * Logout user - delete refresh token
   * @param {string} userId - user ID
   */
  async logout(userId) {
    await redisClient.del(`refresh:${userId}`);
    return { message: 'Logout successful' };
  }

  /**
   * Request forgot password OTP.
   * Always returns a generic success message to avoid leaking registered emails.
   */
  async forgotPassword(email) {
    const normalizedEmail = email.toLowerCase();
    const user = await userRepository.findByEmailWithPassword(normalizedEmail);

    if (user && user.status === USER_STATUS.ACTIVE) {
      const otp = await otpService.generateOTP();
      await redisClient.setEx(
        `${FORGOT_PASSWORD_OTP_PREFIX}:${normalizedEmail}`,
        FORGOT_PASSWORD_OTP_EXPIRY_SECONDS,
        otp
      );
      await redisClient.del(`${FORGOT_PASSWORD_ATTEMPTS_PREFIX}:${normalizedEmail}`);
      await emailService.sendForgotPasswordOTP(normalizedEmail, otp);
    }

    return { message: ERROR_MESSAGES.FORGOT_PASSWORD_OTP_SENT };
  }

  /**
   * Verify forgot password OTP and update the LOCAL account password.
   */
  async resetPassword(email, otp, newPassword) {
    const normalizedEmail = email.toLowerCase();
    const otpKey = `${FORGOT_PASSWORD_OTP_PREFIX}:${normalizedEmail}`;
    const attemptsKey = `${FORGOT_PASSWORD_ATTEMPTS_PREFIX}:${normalizedEmail}`;

    const savedOTP = await redisClient.get(otpKey);
    if (!savedOTP) {
      const error = new Error(ERROR_MESSAGES.RESET_PASSWORD_OTP_EXPIRED);
      error.status = 400;
      throw error;
    }

    if (savedOTP !== otp) {
      const attempts = await redisClient.incr(attemptsKey);
      if (attempts === 1) {
        await redisClient.expire(attemptsKey, FORGOT_PASSWORD_OTP_EXPIRY_SECONDS);
      }

      if (attempts >= MAX_RESET_OTP_ATTEMPTS) {
        await Promise.all([
          redisClient.del(otpKey),
          redisClient.del(attemptsKey)
        ]);

        const error = new Error(ERROR_MESSAGES.RESET_PASSWORD_OTP_LOCKED);
        error.status = 400;
        throw error;
      }

      const remainingAttempts = MAX_RESET_OTP_ATTEMPTS - attempts;
      const error = new Error(`${ERROR_MESSAGES.RESET_PASSWORD_INVALID_OTP}. ${remainingAttempts} attempts remaining`);
      error.status = 400;
      error.remainingAttempts = remainingAttempts;
      throw error;
    }

    const user = await userRepository.findByEmailWithPassword(normalizedEmail);
    if (!user || user.status !== USER_STATUS.ACTIVE || !user.passwordHash) {
      const error = new Error(ERROR_MESSAGES.RESET_PASSWORD_OTP_EXPIRED);
      error.status = 400;
      throw error;
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      const error = new Error(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD);
      error.status = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updateResult = await userRepository.updateLocalPassword(normalizedEmail, passwordHash);
    if (!updateResult.count) {
      const error = new Error('Local account not found');
      error.status = 404;
      throw error;
    }

    await Promise.all([
      redisClient.del(otpKey),
      redisClient.del(attemptsKey),
      redisClient.del(`refresh:${user.id}`)
    ]);

    return { message: ERROR_MESSAGES.RESET_PASSWORD_SUCCESS };
  }
}

module.exports = new AuthService();
