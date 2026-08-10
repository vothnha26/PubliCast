const { ipKeyGenerator } = require('express-rate-limit');
const createRedisRateLimiter = require('./rate-limiter.factory');

// Each question triggers an embedding call + an LLM call, so this endpoint
// needs its own (tighter) limit rather than reusing authRateLimiter — keyed
// per-user since verifyAuth already runs before this middleware.
const helpAskRateLimiter = createRedisRateLimiter('rl:help-ask:', {
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 questions per user per 10 minutes
  message: {
    message: 'Too many questions asked, please try again later'
  },
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip)
});

module.exports = helpAskRateLimiter;
