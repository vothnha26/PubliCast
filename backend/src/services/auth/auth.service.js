const bcrypt = require('bcryptjs');
const userRepository = require('../../repositories/auth/user.repository');
const otpService = require('./otp.service');
const emailService = require('../core/email.service');
const tokenService = require('./token.service');
const googleOAuthService = require('../social/google-oauth.service');
const brandService = require('../workspace/brand.service');
const { eventEmitter, EVENTS } = require('../../events/event-emitter');
const { USER_STATUS, AUTH_PROVIDERS, ERROR_MESSAGES } = require('../../utils/constants');
const redisClient = require('../../config/redis');

const FORGOT_PASSWORD_OTP_PREFIX = 'forgot-otp';
const FORGOT_PASSWORD_ATTEMPTS_PREFIX = 'forgot-otp-attempts';
const FORGOT_PASSWORD_OTP_EXPIRY_SECONDS = 5 * 60;
const MAX_RESET_OTP_ATTEMPTS = 3;

class AuthService {
  async register(name, email, password) {
    const normalizedEmail = email.toLowerCase();
    
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const error = new Error(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      error.status = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user with isEmailVerified = false (pending verification)
    const user = await userRepository.createUser(
      { name, email: normalizedEmail, isActive: false, isEmailVerified: false },
      { provider: AUTH_PROVIDERS.LOCAL, passwordHash }
    );

    const otp = await otpService.generateOTP();
    await otpService.saveOTP(normalizedEmail, otp);
    console.log(`🔑 [OTP] Generated registration OTP for ${normalizedEmail}: ${otp}`);

    // Emit event for side-effects (Brand creation, Email sending)
    eventEmitter.emit(EVENTS.USER.REGISTERED, { user, otp });

    return user;
  }

  async verifyOTP(email, otp) {
    const normalizedEmail = email.toLowerCase();
    const savedOTP = await otpService.getOTP(normalizedEmail);
    
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

    const user = await userRepository.updateStatus(normalizedEmail, USER_STATUS.ACTIVE, new Date());
    await otpService.deleteOTP(normalizedEmail);

    // Generate JWT tokens for auto-login via TokenService
    const { accessToken, refreshToken } = await tokenService.generateAndSaveTokens(user);

    return { 
      message: ERROR_MESSAGES.ACTIVATION_SUCCESS,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  async resendOTP(email) {
    const normalizedEmail = email.toLowerCase();
    const throttleKey = `resend-otp-throttle:${normalizedEmail}`;
    const isThrottled = await redisClient.get(throttleKey);

    if (isThrottled) {
      const error = new Error('Vui lòng đợi 60 giây trước khi yêu cầu mã mới');
      error.status = 429;
      throw error;
    }

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      const error = new Error(ERROR_MESSAGES.INVALID_EMAIL);
      error.status = 404;
      throw error;
    }

    if (user.isEmailVerified || !user.isActive) {
      const error = new Error('Tài khoản đã được kích hoạt hoặc đang bị khóa');
      error.status = 400;
      throw error;
    }

    const otp = await otpService.generateOTP();
    await otpService.saveOTP(normalizedEmail, otp);
    await emailService.sendOTP(normalizedEmail, otp);

    // Set throttle key for 60 seconds
    await redisClient.setEx(throttleKey, 60, '1');

    return { message: 'Mã OTP mới đã được gửi vào email của bạn' };
  }

  async login(email, password) {
    const user = await userRepository.findByEmailWithPassword(email);

    if (!user) {
      const error = new Error(ERROR_MESSAGES.INVALID_EMAIL);
      error.status = 401;
      throw error;
    }

    if (!user.isEmailVerified) {
      const error = new Error(ERROR_MESSAGES.ACCOUNT_NOT_ACTIVATED);
      error.status = 403;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error(ERROR_MESSAGES.ACCOUNT_BANNED);
      error.status = 403;
      throw error;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      const error = new Error(ERROR_MESSAGES.INVALID_PASSWORD);
      error.status = 401;
      throw error;
    }

    await userRepository.updateProfile(user.id, { lastLoginAt: new Date() });

    // Generate JWT tokens via TokenService
    const { accessToken, refreshToken } = await tokenService.generateAndSaveTokens(user);

    return {
      accessToken,
      refreshToken,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  async refreshTokens(refreshToken, userId) {
    try {
      const jwtUtils = require('../../utils/jwt.utils');
      const decoded = jwtUtils.verifyRefreshToken(refreshToken);

      if (decoded.id !== userId) {
        throw new Error('Token user mismatch');
      }

      // Check refresh token in Redis via TokenService
      const isValid = await tokenService.verifyRefreshTokenInRedis(userId, refreshToken);
      if (!isValid) {
        throw new Error('Refresh token not found or invalid');
      }

      const user = await userRepository.findById(userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens via TokenService
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await tokenService.generateAndSaveTokens(user);

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

  async logout(userId) {
    await tokenService.clearTokens(userId);
    return { message: 'Logout successful' };
  }

  async getGoogleAuthUrl(redirectUri, state = 'login') {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
    return googleOAuthService.getAuthUrl(scopes, state, redirectUri);
  }

  async handleGoogleCallback(code, redirectUri) {
    const tokens = await googleOAuthService.getTokens(code, redirectUri);
    const profile = await googleOAuthService.getUserInfo(tokens);

    if (!profile.email) {
      throw new Error('Google account must have an email');
    }

    const userData = {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture
    };

    const accountData = {
      provider: AUTH_PROVIDERS.GOOGLE,
      providerId: profile.id
    };

    const result = await userRepository.upsertSocialUser(userData, accountData);
    const user = result.user;

    const brands = await brandService.getUserBrands(user.id);
    if (brands.length === 0) {
      await brandService.createDefaultBrand(user.id);
    }

    // Generate JWT tokens via TokenService
    const { accessToken, refreshToken } = await tokenService.generateAndSaveTokens(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  async forgotPassword(email) {
    const normalizedEmail = email.toLowerCase();
    const user = await userRepository.findByEmailWithPassword(normalizedEmail);

    if (user && user.isActive && user.isEmailVerified) {
      const otp = await otpService.generateOTP();
      await redisClient.setEx(
        `${FORGOT_PASSWORD_OTP_PREFIX}:${normalizedEmail}`,
        FORGOT_PASSWORD_OTP_EXPIRY_SECONDS,
        otp
      );
      await redisClient.del(`${FORGOT_PASSWORD_ATTEMPTS_PREFIX}:${normalizedEmail}`);
      console.log(`🔑 [OTP] Generated forgot password OTP for ${normalizedEmail}: ${otp}`);
      await emailService.sendForgotPasswordOTP(normalizedEmail, otp);
    }

    return { message: ERROR_MESSAGES.FORGOT_PASSWORD_OTP_SENT };
  }

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
    if (!user || !user.isActive || !user.passwordHash) {
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
    if (!updateResult) {
      const error = new Error('Password update failed');
      error.status = 500;
      throw error;
    }

    await Promise.all([
      redisClient.del(otpKey),
      redisClient.del(attemptsKey),
      tokenService.clearTokens(user.id)
    ]);

    return { message: ERROR_MESSAGES.RESET_PASSWORD_SUCCESS };
  }
}

module.exports = new AuthService();
