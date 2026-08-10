const RedisKeyValueService = require('./redis-keyvalue.service');
const redisClient = require('../../config/redis');

/**
 * Single shared RedisKeyValueService instance wired to the real Redis client
 * — see distributed-lock.singleton.js for the rationale. Replaces the
 * `${prefix}:${id}` + redisClient.setEx/get/del boilerplate that used to be
 * hand-rolled separately in verification.strategy.js (reset-token, pre-auth
 * keys), auth.service.js (resend-otp-throttle, pre-auth keys) and
 * otp.validators.js (resend-otp-throttle key). The class itself
 * (redis-keyvalue.service.js) stays constructor-injectable for tests.
 */
module.exports = new RedisKeyValueService(redisClient);
