const bcrypt = require('bcryptjs');
const BaseValidator = require('./base.validator');
const { LinkTokenVerificationStrategy } = require('../verification.strategy');
const userRepository = require('../../../repositories/auth/user.repository');
const { ERROR_MESSAGES } = require('../../../utils/constants');

class ResetTokenValidator extends BaseValidator {
  async validate(context) {
    const strategy = new LinkTokenVerificationStrategy();
    const email = await strategy.verify(context.token);
    context.email = email;
    context.strategy = strategy;
    return await super.validate(context);
  }
}

class ResetUserValidator extends BaseValidator {
  async validate(context) {
    const user = await userRepository.findByEmailWithPassword(context.email);
    if (!user || !user.isActive || !user.passwordHash) {
      const error = new Error('Không tìm thấy tài khoản hoặc tài khoản bị vô hiệu hóa.');
      error.status = 400;
      throw error;
    }
    context.user = user;
    return await super.validate(context);
  }
}

class PasswordConstraintValidator extends BaseValidator {
  async validate(context) {
    const user = context.user;
    const isSamePassword = await bcrypt.compare(context.newPassword, user.passwordHash);
    if (isSamePassword) {
      const error = new Error(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD);
      error.status = 400;
      throw error;
    }
    return await super.validate(context);
  }
}

module.exports = {
  ResetTokenValidator,
  ResetUserValidator,
  PasswordConstraintValidator
};
