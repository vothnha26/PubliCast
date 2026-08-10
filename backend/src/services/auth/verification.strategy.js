const crypto = require('crypto');
const redisKeyValueService = require('./redis-keyvalue.singleton');
const otpService = require('./otp.service');
const otplib = require('otplib');
const authenticator = otplib.authenticator || otplib;
const verificationAttemptLimiter = require('../../middlewares/verification-attempt-limiter');

const OTP_TTL_SECONDS = 600; // matches otpService.saveOTP's default expiry

/**
 * Strategy Interface for Verification Mechanisms
 */
class VerificationStrategy {
  async generate(email) {
    throw new Error('generate() must be implemented');
  }

  async verify(identifier, data) {
    throw new Error('verify() must be implemented');
  }
}

/**
 * Strategy for OTP Verification (Used in Registration/Activation)
 */
class OtpVerificationStrategy extends VerificationStrategy {
  async generate(email) {
    const otp = await otpService.generateOTP();
    await otpService.saveOTP(email, otp);
    return otp;
  }

  async verify(email, otp) {
    const savedOTP = await otpService.getOTP(email);
    if (!savedOTP) {
      const error = new Error('OTP has expired');
      error.status = 400;
      throw error;
    }

    // Previously a wrong guess had no cost — the OTP stayed valid in Redis
    // until its 10-minute TTL, letting an attacker brute-force all 900,000
    // combinations in that window (#58). Cap wrong guesses and burn the OTP
    // once the limit is hit so a fresh one has to be requested.
    const { allowed } = await verificationAttemptLimiter.checkAllowed('otp', email, OTP_TTL_SECONDS);
    if (!allowed) {
      await otpService.deleteOTP(email);
      const error = new Error('Too many incorrect attempts. Please request a new OTP.');
      error.status = 429;
      throw error;
    }

    if (savedOTP !== otp) {
      await verificationAttemptLimiter.recordFailedAttempt('otp', email, OTP_TTL_SECONDS);
      const error = new Error('Invalid OTP');
      error.status = 400;
      throw error;
    }

    await otpService.deleteOTP(email);
    await verificationAttemptLimiter.reset('otp', email);
    return true;
  }
}

/**
 * Strategy for Link Token Verification (Used in Password Reset)
 */
class LinkTokenVerificationStrategy extends VerificationStrategy {
  constructor() {
    super();
    this.prefix = 'reset-token';
    this.expirySeconds = 15 * 60; // 15 minutes
  }

  async generate(email) {
    const token = crypto.randomBytes(32).toString('hex');
    await redisKeyValueService.set(this.prefix, token, email, this.expirySeconds);
    return token;
  }

  async verify(token) {
    const email = await redisKeyValueService.get(this.prefix, token);
    if (!email) {
      const error = new Error('Đường dẫn khôi phục mật khẩu đã hết hạn hoặc không hợp lệ.');
      error.status = 400;
      throw error;
    }
    return email;
  }

  async delete(token) {
    await redisKeyValueService.delete(this.prefix, token);
  }
}

/**
 * Context to coordinate verification strategy
 */
class VerificationContext {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  async generate(email) {
    return await this.strategy.generate(email);
  }

  async verify(identifier, data) {
    return await this.strategy.verify(identifier, data);
  }
}

/**
 * Strategy for 2FA TOTP Verification
 */
class TwoFactorVerificationStrategy extends VerificationStrategy {
  async generate(email) {
    const secret = await authenticator.generateSecret();
    return secret;
  }

  async verify(secret, code, userId = null) {
    const MANAGE_2FA_TTL_SECONDS = 900;

    if (userId) {
      const { allowed } = await verificationAttemptLimiter.checkAllowed('2fa-manage', userId, MANAGE_2FA_TTL_SECONDS);
      if (!allowed) {
        const error = new Error('Quá nhiều lần thử sai. Vui lòng thử lại sau 15 phút.');
        error.status = 429;
        throw error;
      }
    }

    const result = await authenticator.verify({ token: code, secret });
    const isValid = typeof result === 'boolean' ? result : (result && result.valid === true);
    if (!isValid) {
      if (userId) {
        await verificationAttemptLimiter.recordFailedAttempt('2fa-manage', userId, MANAGE_2FA_TTL_SECONDS);
      }
      const error = new Error('Mã xác thực 2 lớp không hợp lệ.');
      error.status = 400;
      throw error;
    }

    if (userId) {
      await verificationAttemptLimiter.reset('2fa-manage', userId);
    }
    return true;
  }
}

module.exports = {
  OtpVerificationStrategy,
  LinkTokenVerificationStrategy,
  TwoFactorVerificationStrategy,
  VerificationContext
};
