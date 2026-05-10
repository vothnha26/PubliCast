const AUTH_PROVIDERS = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE'
};

const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN'
};

const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BANNED: 'BANNED'
};

const ERROR_MESSAGES = {
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  OTP_EXPIRED: 'OTP expired or not found',
  INVALID_OTP: 'Invalid OTP',
  REGISTRATION_SUCCESS: 'Registration successful. Please check your email for OTP.',
  ACTIVATION_SUCCESS: 'Account activated successfully'
};

module.exports = {
  AUTH_PROVIDERS,
  USER_ROLES,
  USER_STATUS,
  ERROR_MESSAGES
};
