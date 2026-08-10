const DashboardMetricsCacheService = require('./dashboard-metrics-cache.service');
const redisClient = require('../../config/redis');

/**
 * Single shared DashboardMetricsCacheService instance wired to the real
 * Redis client (config/redis.js always exports a working client — real
 * Redis, or the in-memory fallback when USE_MEMORY_REDIS=true — never
 * null). Same singleton-wiring convention as distributed-lock.singleton.js/
 * redis-health.singleton.js. The class itself stays constructor-injectable
 * for tests.
 */
module.exports = new DashboardMetricsCacheService(redisClient);
