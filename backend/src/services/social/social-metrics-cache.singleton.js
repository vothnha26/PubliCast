const SocialMetricsCacheService = require('./social-metrics-cache.service');
const redisClient = require('../../config/redis');

/**
 * Single shared SocialMetricsCacheService instance wired to the real Redis
 * client — same singleton-wiring convention as distributed-lock.singleton.js
 * / dashboard-metrics-cache.singleton.js. The class itself stays
 * constructor-injectable for tests.
 */
module.exports = new SocialMetricsCacheService(redisClient);
