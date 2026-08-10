const QuotaTrackerService = require('./quota-tracker.service');
const redisClient = require('../../config/redis');

/**
 * Single shared QuotaTrackerService instance wired to the real Redis client
 * (config/redis.js always exports a working client — real Redis, or the
 * in-memory fallback when USE_MEMORY_REDIS=true — never null). Import this
 * instead of doing `new QuotaTrackerService(redisClient)` per call site:
 * every service used to construct its own instance and re-guard against a
 * `redisClient` that in practice is never falsy, which meant 6 near-
 * identical `redisClient ? new QuotaTrackerService(redisClient) : null`
 * blocks scattered across YouTube/TikTok/Bluesky/hashtag code. The class
 * itself (quota-tracker.service.js) stays constructor-injectable for tests.
 */
module.exports = new QuotaTrackerService(redisClient);
