const crypto = require('crypto');
const redisClient = require('../../config/redis');
const otpService = require('./otp.service');
const authenticator = require('otplib');

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
    if (savedOTP !== otp) {
      const error = new Error('Invalid OTP');
      error.status = 400;
      throw error;
    }
    await otpService.deleteOTP(email);
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
    const tokenKey = `${this.prefix}:${token}`;
    await redisClient.setEx(tokenKey, this.expirySeconds, email);
    return token;
  }

  async verify(token) {
    const tokenKey = `${this.prefix}:${token}`;
    const email = await redisClient.get(tokenKey);
    if (!email) {
      const error = new Error('Đường dẫn khôi phục mật khẩu đã hết hạn hoặc không hợp lệ.');
      error.status = 400;
      throw error;
    }
    return email;
  }

  async delete(token) {
    const tokenKey = `${this.prefix}:${token}`;
    await redisClient.del(tokenKey);
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

  async verify(secret, code) {
    const result = await authenticator.verify({ token: code, secret });
    const isValid = typeof result === 'boolean' ? result : (result && result.valid === true);
    if (!isValid) {
      const error = new Error('Mã xác thực 2 lớp không hợp lệ.');
      error.status = 400;
      throw error;
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
