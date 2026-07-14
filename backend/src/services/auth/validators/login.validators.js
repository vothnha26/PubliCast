const bcrypt = require('bcryptjs');
const BaseValidator = require('./base.validator');
const userRepository = require('../../../repositories/auth/user.repository');
const { ERROR_MESSAGES } = require('../../../utils/constants');

class UserExistenceValidator extends BaseValidator {
  async validate(context) {
    const user = await userRepository.findByEmailWithPassword(context.email);
    if (!user) {
      const error = new Error(ERROR_MESSAGES.INVALID_EMAIL);
      error.status = 401;
      throw error;
    }
    context.user = user;
    return await super.validate(context);
  }
}

class EmailVerificationValidator extends BaseValidator {
  async validate(context) {
    const user = context.user;
    if (!user.isEmailVerified) {
      const error = new Error(ERROR_MESSAGES.ACCOUNT_NOT_ACTIVATED);
      error.status = 403;
      throw error;
    }
    return await super.validate(context);
  }
}

class UserStatusValidator extends BaseValidator {
  async validate(context) {
    const user = context.user;
    if (!user.isActive) {
      const error = new Error(ERROR_MESSAGES.ACCOUNT_BANNED);
      error.status = 403;
      throw error;
    }
    return await super.validate(context);
  }
}

class PasswordValidator extends BaseValidator {
  async validate(context) {
    const user = context.user;
    const isValidPassword = await bcrypt.compare(context.password, user.passwordHash);
    if (!isValidPassword) {
      const error = new Error(ERROR_MESSAGES.INVALID_PASSWORD);
      error.status = 401;
      throw error;
    }
    return await super.validate(context);
  }
}

module.exports = {
  UserExistenceValidator,
  EmailVerificationValidator,
  UserStatusValidator,
  PasswordValidator
};
