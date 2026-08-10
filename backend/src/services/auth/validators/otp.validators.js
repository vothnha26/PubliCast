const BaseValidator = require('./base.validator');
const redisKeyValueService = require('../redis-keyvalue.singleton');
const userRepository = require('../../../repositories/auth/user.repository');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const RESEND_OTP_THROTTLE_PREFIX = 'resend-otp-throttle';

class ThrottleValidator extends BaseValidator {
  async validate(context) {
    const isThrottled = await redisKeyValueService.get(RESEND_OTP_THROTTLE_PREFIX, context.email);
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
  OtpVerificationStatusValidator,
  RESEND_OTP_THROTTLE_PREFIX
};
