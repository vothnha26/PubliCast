const rateLimit = require('express-rate-limit');

const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    message: 'Too many forgot password requests. Please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: 'Too many reset password requests. Please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter
};
