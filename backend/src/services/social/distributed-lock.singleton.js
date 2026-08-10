const DistributedLockService = require('./distributed-lock.service');
const redisClient = require('../../config/redis');

/**
 * Single shared DistributedLockService instance wired to the real Redis
 * client (config/redis.js always exports a working client — real Redis, or
 * the in-memory fallback when USE_MEMORY_REDIS=true — never null). Import
 * this instead of doing `new DistributedLockService(redisClient)` per call
 * site: 9 call sites used to each construct their own instance, 2 of them
 * re-guarding against a `redisClient` that in practice is never falsy
 * (`redisClient ? new DistributedLockService(redisClient) : null`). The
 * class itself (distributed-lock.service.js) stays constructor-injectable
 * for tests.
 */
module.exports = new DistributedLockService(redisClient);
