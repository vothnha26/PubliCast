const redisClient = require('../config/redis');
const logger = require('../utils/logger');

const MAX_FAILED_ATTEMPTS = 5;

/**
 * Tracks failed verification attempts (OTP / 2FA code guesses) against a
 * Redis-backed counter keyed by an arbitrary identifier (email, preAuthToken,
 * etc). Distinct from LoginRateLimiter: this counts wrong *guesses* against a
 * single short-lived secret rather than login attempts per email/IP, and the
 * caller decides what happens when the limit is hit (delete the OTP,
 * invalidate the preAuthToken, ...) — see issues #58 and #59.
 */
class VerificationAttemptLimiter {
  getKey(namespace, identifier) {
    return `verify-attempts:${namespace}:${identifier}`;
  }

  /**
   * @param {string} namespace - e.g. 'otp', '2fa-login'
   * @param {string} identifier - e.g. email or preAuthToken
   * @param {number} ttlSeconds - how long the attempt counter should live;
   *   should match (or slightly exceed) the TTL of the secret being guessed
   *   so the counter doesn't outlive it.
   * @returns {Promise<{allowed: boolean, attempts: number}>}
   */
  async checkAllowed(namespace, identifier, ttlSeconds) {
    const key = this.getKey(namespace, identifier);
    const attempts = parseInt(await redisClient.get(key), 10) || 0;
    return { allowed: attempts < MAX_FAILED_ATTEMPTS, attempts };
  }

  /**
   * Record a failed attempt. Sets the expiry only on the first attempt so
   * the counter's lifetime is bounded even if the caller never resets it.
   * @returns {Promise<number>} the new attempt count
   */
  async recordFailedAttempt(namespace, identifier, ttlSeconds) {
    const key = this.getKey(namespace, identifier);
    const attempts = await redisClient.incr(key);
    if (attempts === 1) {
      await redisClient.expire(key, ttlSeconds);
    }
    return attempts;
  }

  async reset(namespace, identifier) {
    const key = this.getKey(namespace, identifier);
    await redisClient.del(key).catch((err) => {
      logger.error('VerificationAttemptLimiter reset failed', err);
    });
  }
}

module.exports = new VerificationAttemptLimiter();
module.exports.MAX_FAILED_ATTEMPTS = MAX_FAILED_ATTEMPTS;
