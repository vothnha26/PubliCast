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
  ACTIVATION_SUCCESS: 'Account activated successfully',
  // Login errors
  LOGIN_SUCCESS: 'Login successful',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_NOT_ACTIVATED: 'Account not activated. Please verify your email first.',
  ACCOUNT_BANNED: 'Your account has been banned',
  TOO_MANY_LOGIN_ATTEMPTS: 'Too many login attempts. Please try again later.',
  EMAIL_REQUIRED: 'Email is required',
  PASSWORD_REQUIRED: 'Password is required',
  // Profile
  USER_NOT_FOUND: 'User not found',
  AUTHENTICATION_REQUIRED: 'Authentication required',
  ACCESS_DENIED: 'Access denied'
};

const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_REDIS_EXPIRY: 7 * 24 * 60 * 60 // 7 days in seconds
};

module.exports = {
  AUTH_PROVIDERS,
  USER_ROLES,
  USER_STATUS,
  ERROR_MESSAGES,
  JWT_CONFIG
};
