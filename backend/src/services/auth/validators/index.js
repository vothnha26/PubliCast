const BaseValidator = require('./base.validator');
const loginValidators = require('./login.validators');
const otpValidators = require('./otp.validators');
const resetValidators = require('./reset.validators');

module.exports = {
  BaseValidator,
  ...loginValidators,
  ...otpValidators,
  ...resetValidators
};
