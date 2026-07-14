const BaseValidator = require('./base.validator');
const redisClient = require('../../../config/redis');
const userRepository = require('../../../repositories/auth/user.repository');
const { ERROR_MESSAGES } = require('../../../utils/constants');

class ThrottleValidator extends BaseValidator {
  async validate(context) {
    const throttleKey = `resend-otp-throttle:${context.email}`;
    const isThrottled = await redisClient.get(throttleKey);
    if (isThrottled) {
      const error = new Error('Vui lòng đợi 60 giây trước khi yêu cầu mã mới');
      error.status = 429;
      throw error;
    }
    return await super.validate(context);
  }
}

class OtpUserExistenceValidator extends BaseValidator {
  async validate(context) {
    const user = await userRepository.findByEmail(context.email);
    if (!user) {
      const error = new Error(ERROR_MESSAGES.INVALID_EMAIL);
      error.status = 404;
      throw error;
    }
    context.user = user;
    return await super.validate(context);
  }
}

class OtpVerificationStatusValidator extends BaseValidator {
  async validate(context) {
    const user = context.user;
    if (user.isEmailVerified) {
      const error = new Error('Tài khoản đã được kích hoạt');
      error.status = 400;
      throw error;
    }
    return await super.validate(context);
  }
}

module.exports = {
  ThrottleValidator,
  OtpUserExistenceValidator,
  OtpVerificationStatusValidator
};
