const redisClient = require('../config/redis');
const logger = require('../utils/logger');
const { REDIS_NAMESPACES, REDIS_TTL } = require('../utils/constants');

const MAX_REQUESTS_PER_WINDOW = 20;

/**
 * Rate limits the verify-token endpoint per client_id (server-to-server
 * caller, not per-IP like login) — prevents the endpoint being used to
 * brute-force brandId/userId combinations or hammer Firestore-side callers.
 * Same incr/expire primitive as login-rate-limit.middleware.js.
 */
class IntegrationRateLimiter {
  getKey(clientId) {
    return `${REDIS_NAMESPACES.INTEGRATION_RATE_LIMIT}:${clientId}`;
  }

  middleware() {
    return async (req, res, next) => {
      try {
        const clientId = req.body?.client_id;
        if (!clientId) {
          return res.status(400).json({ message: 'client_id is required' });
        }

        const key = this.getKey(clientId);
        const attempts = await redisClient.incr(key);
        if (attempts === 1) {
          await redisClient.expire(key, REDIS_TTL.INTEGRATION_RATE_LIMIT_WINDOW_SEC);
        }

        if (attempts > MAX_REQUESTS_PER_WINDOW) {
          return res.status(429).json({ message: 'Too many requests. Please try again later.' });
        }

        next();
      } catch (error) {
        logger.error('Integration rate limit middleware error', error);
        next(error);
      }
    };
  }
}

module.exports = new IntegrationRateLimiter();
