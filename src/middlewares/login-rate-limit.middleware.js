const redisClient = require('../config/redis');

const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds
const MAX_FAILED_ATTEMPTS = 5;

class LoginRateLimiter {
  /**
   * Get rate limit key
   * @param {string} identifier - email or IP
   * @returns {string} redis key
   */
  getKey(identifier) {
    return `login:attempts:${identifier}`;
  }

  /**
   * Check if login is allowed
   * @param {string} email - user email
   * @param {string} ip - client IP
   * @returns {Promise<{allowed: boolean, attempts: number, resetIn: number}>}
   */
  async checkLoginAttempt(email, ip) {
    const emailKey = this.getKey(email);
    const ipKey = this.getKey(ip);

    const [emailAttempts, ipAttempts] = await Promise.all([
      redisClient.get(emailKey),
      redisClient.get(ipKey)
    ]);

    const emailCount = parseInt(emailAttempts) || 0;
    const ipCount = parseInt(ipAttempts) || 0;

    const isAllowed = emailCount < MAX_FAILED_ATTEMPTS && ipCount < MAX_FAILED_ATTEMPTS;

    return {
      allowed: isAllowed,
      emailAttempts: emailCount,
      ipAttempts: ipCount,
      resetIn: emailAttempts ? Math.ceil(await redisClient.ttl(emailKey)) : RATE_LIMIT_WINDOW
    };
  }

  /**
   * Record failed login attempt
   * @param {string} email - user email
   * @param {string} ip - client IP
   */
  async recordFailedAttempt(email, ip) {
    const emailKey = this.getKey(email);
    const ipKey = this.getKey(ip);

    // Increment attempts with expiry set on first attempt
    const [emailAttempts, ipAttempts] = await Promise.all([
      redisClient.incr(emailKey),
      redisClient.incr(ipKey)
    ]);

    // Set expiry only on first attempt
    if (emailAttempts === 1) {
      await redisClient.expire(emailKey, RATE_LIMIT_WINDOW);
    }
    if (ipAttempts === 1) {
      await redisClient.expire(ipKey, RATE_LIMIT_WINDOW);
    }
  }

  /**
   * Reset login attempts after successful login
   * @param {string} email - user email
   * @param {string} ip - client IP
   */
  async resetAttempts(email, ip) {
    const emailKey = this.getKey(email);
    const ipKey = this.getKey(ip);

    await Promise.all([
      redisClient.del(emailKey),
      redisClient.del(ipKey)
    ]);
  }

  /**
   * Middleware to check rate limit
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const email = req.body.email?.toLowerCase();
        const ip = req.ip || req.connection.remoteAddress;

        if (!email) {
          return res.status(400).json({ message: 'Email is required' });
        }

        const { allowed, resetIn } = await this.checkLoginAttempt(email, ip);

        if (!allowed) {
          return res.status(429).json({
            message: 'Too many login attempts. Please try again later.',
            resetIn: resetIn
          });
        }

        // Store identifiers in request for later use
        req.rateLimit = { email, ip };
        next();
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        next();
      }
    };
  }
}

module.exports = new LoginRateLimiter();
