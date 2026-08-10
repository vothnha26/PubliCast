const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

/**
 * Builds an express-rate-limit instance backed by the shared Redis client.
 * The default in-memory store keeps counters per Node process, so on a
 * multi-instance deployment (Render/k8s) the effective limit multiplies by
 * instance count, and a restart wipes it entirely — this was previously
 * re-implemented per middleware file (#118 M1).
 * @param {string} prefix - RedisStore key prefix, e.g. 'rl:auth:'
 * @param {import('express-rate-limit').Options} options - express-rate-limit options (windowMs, max, message, keyGenerator, ...)
 */
function createRedisRateLimiter(prefix, options) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    ...options,
    store: new RedisStore({
      prefix,
      sendCommand: (...args) => redisClient.sendCommand(args)
    })
  });
}

module.exports = createRedisRateLimiter;
