const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

// Each question triggers an embedding call + an LLM call, so this endpoint
// needs its own (tighter) limit rather than reusing authRateLimiter — keyed
// per-user since verifyAuth already runs before this middleware.
const helpAskRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 questions per user per 10 minutes
  message: {
    message: 'Too many questions asked, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  store: new RedisStore({
    prefix: 'rl:help-ask:',
    sendCommand: (...args) => redisClient.sendCommand(args)
  })
});

module.exports = helpAskRateLimiter;
