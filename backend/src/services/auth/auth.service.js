const bcrypt = require('bcryptjs');
const userRepository = require('../../repositories/auth/user.repository');
const otpService = require('./otp.service');
const emailService = require('../core/email.service');
const tokenService = require('./token.service');
const googleOAuthService = require('../social/google-oauth.service');
const brandService = require('../workspace/brand.service');
const { eventEmitter, EVENTS } = require('../../events/event-emitter');
const { USER_STATUS, AUTH_PROVIDERS, ERROR_MESSAGES, DEFAULT_CONFIG } = require('../../utils/constants');
const redisClient = require('../../config/redis');
const { OtpVerificationStrategy, LinkTokenVerificationStrategy, VerificationContext } = require('./verification.strategy');
const {
  UserExistenceValidator, EmailVerificationValidator, UserStatusValidator, PasswordValidator,
  ThrottleValidator, OtpUserExistenceValidator, OtpVerificationStatusValidator,
  ResetTokenValidator, ResetUserValidator, PasswordConstraintValidator
} = require('./validators');

const FORGOT_PASSWORD_OTP_PREFIX = 'forgot-otp';
const FORGOT_PASSWORD_ATTEMPTS_PREFIX = 'forgot-otp-attempts';
const FORGOT_PASSWORD_OTP_EXPIRY_SECONDS = 5 * 60;
const MAX_RESET_OTP_ATTEMPTS = 3;

class AuthService {
  async register(name, email, password) {
    // Defensive validation
    if (!email || typeof email !== 'string') {
      const err = new Error('Invalid email address');
      err.status = 400;
      throw err;
    }
    if (!password || typeof password !== 'string') {
      const err = new Error('Invalid password');
      err.status = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    
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

    const otpContext = new VerificationContext(new OtpVerificationStrategy());
    const otp = await otpContext.generate(normalizedEmail);
    console.log(`🔑 [OTP] Generated registration OTP for ${normalizedEmail}: ${otp}`);

    // Emit event for side-effects (Brand creation, Email sending)
    eventEmitter.emit(EVENTS.USER.REGISTERED, { user, otp });

    return user;
  }

  async verifyOTP(email, otp) {
    // Defensive validation
    if (!email || typeof email !== 'string') {
      const err = new Error('Invalid email address');
      err.status = 400;
      throw err;
    }
    if (!otp || typeof otp !== 'string') {
      const err = new Error('Invalid OTP');
      err.status = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otpContext = new VerificationContext(new OtpVerificationStrategy());
    await otpContext.verify(normalizedEmail, otp);

    const user = await userRepository.updateStatus(normalizedEmail, USER_STATUS.ACTIVE, new Date());

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
    // Defensive validation
    if (!email || typeof email !== 'string') {
      const err = new Error('Invalid email address');
      err.status = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Initialize OTP validation chain
    const throttle = new ThrottleValidator();
    const otpUserExistence = new OtpUserExistenceValidator();
    const otpVerificationStatus = new OtpVerificationStatusValidator();

    throttle
      .setNext(otpUserExistence)
      .setNext(otpVerificationStatus);

    const context = { email: normalizedEmail };
    await throttle.validate(context);

    const user = context.user;
    const otpContext = new VerificationContext(new OtpVerificationStrategy());
    const otp = await otpContext.generate(normalizedEmail);
    await emailService.sendOTP(normalizedEmail, otp);

    // Set throttle key for 60 seconds
    const throttleKey = `resend-otp-throttle:${normalizedEmail}`;
    await redisClient.setEx(throttleKey, 60, '1');

    return { message: 'Mã OTP mới đã được gửi vào email của bạn' };
  }

  async login(email, password) {
    // Defensive validation
    if (!email || typeof email !== 'string') {
      const err = new Error('Invalid email address');
      err.status = 400;
      throw err;
    }
    if (!password || typeof password !== 'string') {
      const err = new Error('Invalid password');
      err.status = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Initialize Login validation chain
    const userExistence = new UserExistenceValidator();
    const emailVerification = new EmailVerificationValidator();
    const userStatus = new UserStatusValidator();
    const passwordCheck = new PasswordValidator();

    userExistence
      .setNext(emailVerification)
      .setNext(userStatus)
      .setNext(passwordCheck);

    const context = { email: normalizedEmail, password };
    await userExistence.validate(context);

    const user = context.user;
    await userRepository.updateProfile(user.id, { lastLoginAt: new Date() });

    // Kiểm tra bảo mật 2 lớp
    if (user.isTwoFactorEnabled) {
      const crypto = require('crypto');
      const preAuthToken = crypto.randomBytes(32).toString('hex');
      const preAuthKey = `pre-auth:${preAuthToken}`;
      await redisClient.setEx(preAuthKey, 300, user.id);

      return {
        require2FA: true,
        preAuthToken
      };
    }

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

  async handleGoogleCallback(code, redirectUri, currentUserId = null) {
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

    const result = await userRepository.upsertSocialUser(userData, accountData, currentUserId);
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
      const tokenContext = new VerificationContext(new LinkTokenVerificationStrategy());
      const token = await tokenContext.generate(normalizedEmail);
      
      const resetLink = `${DEFAULT_CONFIG.FRONTEND_URL}/reset-password?token=${token}`;
      console.log(`🔑 [Reset Link] Generated password reset link for ${normalizedEmail}: ${resetLink}`);
      await emailService.sendResetPasswordLink(normalizedEmail, resetLink);
    }

    return { message: ERROR_MESSAGES.RESET_LINK_SENT };
  }

  async verifyResetToken(token) {
    const strategy = new LinkTokenVerificationStrategy();
    const email = await strategy.verify(token);
    return { valid: true, email };
  }

  async resetPasswordWithToken(token, newPassword) {
    // Initialize Reset Password validation chain
    const resetToken = new ResetTokenValidator();
    const resetUser = new ResetUserValidator();
    const passwordConstraint = new PasswordConstraintValidator();

    resetToken
      .setNext(resetUser)
      .setNext(passwordConstraint);

    const context = { token, newPassword };
    await resetToken.validate(context);

    const email = context.email;
    const user = context.user;
    const strategy = context.strategy;

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updateResult = await userRepository.updateLocalPassword(email, passwordHash);
    if (!updateResult) {
      const error = new Error('Cập nhật mật khẩu thất bại.');
      error.status = 500;
      throw error;
    }

    // Clear user tokens across devices and delete current reset token
    await Promise.all([
      strategy.delete(token),
      tokenService.clearTokens(user.id)
    ]);

    return { message: ERROR_MESSAGES.RESET_PASSWORD_SUCCESS };
  }

  async setup2FA(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error('Không tìm thấy người dùng');
      error.status = 404;
      throw error;
    }
    if (user.isTwoFactorEnabled) {
      const error = new Error('Tài khoản đã được kích hoạt bảo mật 2 lớp');
      error.status = 400;
      throw error;
    }

    const { TwoFactorVerificationStrategy } = require('./verification.strategy');
    const strategy = new TwoFactorVerificationStrategy();
    const secret = await strategy.generate(user.email);

    // Lưu secret tạm thời vào DB
    await userRepository.updateProfile(userId, { twoFactorSecret: secret });

    // Tạo otpauth url cho authenticator app
    const otpauthUrl = `otpauth://totp/PubliCast:${user.email}?secret=${secret}&issuer=PubliCast`;
    
    // Tạo QR Code
    const QRCode = require('qrcode');
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCodeDataUrl
    };
  }

  async verify2FA(userId, code) {
    const user = await userRepository.findById(userId);
    if (!user || !user.twoFactorSecret) {
      const error = new Error('Bảo mật 2 lớp chưa được cài đặt');
      error.status = 400;
      throw error;
    }

    const { TwoFactorVerificationStrategy } = require('./verification.strategy');
    const strategy = new TwoFactorVerificationStrategy();
    await strategy.verify(user.twoFactorSecret, code);

    // Tạo 10 mã dự phòng backup codes
    const crypto = require('crypto');
    const backupCodes = [];
    const hashedBackupCodes = [];

    for (let i = 0; i < 10; i++) {
      const plainCode = crypto.randomBytes(4).toString('hex'); // 8 ký tự hex
      backupCodes.push(plainCode);
      const hashed = crypto.createHash('sha256').update(plainCode).digest('hex');
      hashedBackupCodes.push(hashed);
    }

    // Cập nhật trạng thái bật 2FA và lưu backup codes dạng JSON
    await userRepository.updateProfile(userId, {
      isTwoFactorEnabled: true,
      twoFactorBackupCodes: JSON.stringify(hashedBackupCodes)
    });

    return {
      backupCodes
    };
  }

  async disable2FA(userId, code) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      const error = new Error('Bảo mật 2 lớp chưa được kích hoạt');
      error.status = 400;
      throw error;
    }

    const { TwoFactorVerificationStrategy } = require('./verification.strategy');
    const strategy = new TwoFactorVerificationStrategy();
    await strategy.verify(user.twoFactorSecret, code);

    await userRepository.updateProfile(userId, {
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null
    });

    return { message: 'Đã tắt bảo mật 2 lớp thành công' };
  }

  async loginVerify2FA(preAuthToken, code) {
    const preAuthKey = `pre-auth:${preAuthToken}`;
    const userId = await redisClient.get(preAuthKey);

    if (!userId) {
      const error = new Error('Yêu cầu xác thực đã hết hạn hoặc không hợp lệ.');
      error.status = 401;
      throw error;
    }

    const user = await userRepository.findById(userId);
    if (!user || !user.isTwoFactorEnabled) {
      const error = new Error('Tài khoản chưa được kích hoạt bảo mật 2 lớp.');
      error.status = 400;
      throw error;
    }

    let verified = false;
    let isBackupUsed = false;

    // 1. Kiểm tra backup codes trước
    if (user.twoFactorBackupCodes) {
      const crypto = require('crypto');
      const hashedBackupCodes = JSON.parse(user.twoFactorBackupCodes);
      const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
      const codeIndex = hashedBackupCodes.indexOf(hashedInput);

      if (codeIndex !== -1) {
        verified = true;
        isBackupUsed = true;
        // Xóa mã backup đã sử dụng
        hashedBackupCodes.splice(codeIndex, 1);
        await userRepository.updateProfile(userId, {
          twoFactorBackupCodes: JSON.stringify(hashedBackupCodes)
        });
      }
    }

    // 2. Kiểm tra TOTP code
    if (!verified) {
      const { TwoFactorVerificationStrategy } = require('./verification.strategy');
      const strategy = new TwoFactorVerificationStrategy();
      try {
        await strategy.verify(user.twoFactorSecret, code);
        verified = true;
      } catch (err) {
        // Bỏ qua lỗi TOTP để nếu không verify được thì ném lỗi mã xác thực không chính xác cuối cùng
      }
    }

    if (!verified) {
      const error = new Error('Mã xác thực không chính xác.');
      error.status = 400;
      throw error;
    }

    // Đăng nhập thành công, xóa preAuthToken
    await redisClient.del(preAuthKey);

    // Cấp JWT tokens
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
      },
      isBackupUsed
    };
  }
}

module.exports = new AuthService();
