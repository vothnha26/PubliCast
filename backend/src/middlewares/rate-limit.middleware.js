const createRedisRateLimiter = require('./rate-limiter.factory');

const authRateLimiter = createRedisRateLimiter('rl:auth:', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

module.exports = authRateLimiter;
