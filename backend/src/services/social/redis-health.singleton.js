const RedisHealthService = require('./redis-health.service');
const redisClient = require('../../config/redis');

/**
 * Single shared RedisHealthService instance wired to the real Redis client
 * — see distributed-lock.singleton.js for the rationale (config/redis.js
 * never returns null, so the per-call-site `redisClient ? new X() : null`
 * guard was dead weight). The class itself stays constructor-injectable
 * for tests.
 */
module.exports = new RedisHealthService(redisClient);
