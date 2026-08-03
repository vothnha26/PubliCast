const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

// See rate-limit.middleware.js for why an in-memory store is unsafe here
// across multi-instance deployments / restarts (#118 M1).
const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    message: 'Too many forgot password requests. Please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  store: new RedisStore({
    prefix: 'rl:forgot-password:',
    sendCommand: (...args) => redisClient.sendCommand(args)
  })
});

const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: 'Too many reset password requests. Please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  store: new RedisStore({
    prefix: 'rl:reset-password:',
    sendCommand: (...args) => redisClient.sendCommand(args)
  })
});

module.exports = {
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter
};
