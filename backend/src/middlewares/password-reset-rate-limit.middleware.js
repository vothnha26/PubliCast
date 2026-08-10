const createRedisRateLimiter = require('./rate-limiter.factory');

const forgotPasswordRateLimiter = createRedisRateLimiter('rl:forgot-password:', {
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 3 : 1000,
  message: {
    message: 'Too many forgot password requests. Please try again after 15 minutes'
  }
});

const resetPasswordRateLimiter = createRedisRateLimiter('rl:reset-password:', {
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: {
    message: 'Too many reset password requests. Please try again after 15 minutes'
  }
});

module.exports = {
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter
};
