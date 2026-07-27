const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

// Redis-backed store: the default in-memory store keeps counters per Node
// process, so on a multi-instance deployment (Render/k8s) the effective
// limit multiplies by instance count, and a restart wipes it entirely,
// silently weakening the brute-force guard on register/OTP/2FA routes (#118 M1).
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:auth:',
    sendCommand: (...args) => redisClient.sendCommand(args)
  })
});

module.exports = authRateLimiter;
