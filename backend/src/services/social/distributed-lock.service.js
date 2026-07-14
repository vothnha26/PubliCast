/**
 * Distributed Lock Service - Redlock Pattern with Token Validation
 *
 * Provides safe distributed locks using Redis with unique tokens.
 * Prevents lock hijacking and accidental lock overwrites by:
 * 1. Assigning unique token to each lock acquisition
 * 2. Only allowing release with matching token (via atomic Lua script)
 *
 * This prevents race conditions in scenarios like:
 * - User 1's lock expires after 30s
 * - User 3 acquires same lock
 * - User 1's background process finishes and releases
 * - Without token matching, User 1 would accidentally release User 3's lock
 */

const { randomUUID } = require('crypto');
const logger = require('../../utils/logger');

class DistributedLockService {
  /**
   * @param {RedisClient} redisClient - Redis client instance
   */
  constructor(redisClient) {
    this.redisClient = redisClient;
    // Lua script for atomic release: only delete if token matches
    this.releaseLuaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
  }

  /**
   * Acquire a distributed lock
   *
   * @param {string} key - Lock key (e.g., "lock:yt:video-insights:video123")
   * @param {number} ttlSec - Time-to-live in seconds (prevent permanent deadlock)
   * @returns {Promise<string|null>} - Unique token if acquired, null if lock already held
   *
   * Algorithm:
   * 1. Generate unique random token
   * 2. SET key token NX EX ttlSec (atomic: only set if not exists)
   * 3. Return token if succeeded, null otherwise
   */
  async acquireLock(key, ttlSec) {
    try {
      const token = randomUUID();
      const result = await this.redisClient.set(key, token, {
        NX: true,      // Only set if not exists
        EX: ttlSec     // Expiration in seconds
      });

      if (result === 'OK') {
        logger.debug(`[LOCK] Acquired: ${key} (token: ${token.substring(0, 8)}...)`);
        return token;
      } else {
        logger.debug(`[LOCK] Failed to acquire: ${key} (already locked)`);
        return null;
      }
    } catch (err) {
      logger.error('[LOCK] Error acquiring lock:', { key, error: err.message });
      throw err;
    }
  }

  /**
   * Release a distributed lock (with token validation)
   *
   * @param {string} key - Lock key
   * @param {string} token - Token received from acquireLock()
   * @returns {Promise<number>} - 1 if lock deleted, 0 if token mismatch or key not found
   *
   * Algorithm (Lua script - atomic):
   * 1. GET key → retrieve current token in Redis
   * 2. If current token === provided token:
   *    - DEL key (release the lock)
   *    - Return 1
   * 3. Else:
   *    - Return 0 (prevent accidental release of someone else's lock)
   *
   * This ensures:
   * - Only lock holder can release (has the unique token)
   * - No race condition between GET and DEL (atomic Lua)
   * - Prevents "lock hijacking" scenario
   */
  async releaseLock(key, token) {
    try {
      if (!token) {
        logger.warn('[LOCK] Release attempted with empty token:', { key });
        return 0;
      }

      const result = await this.redisClient.eval(
        this.releaseLuaScript,
        {
          keys: [key],
          arguments: [token]
        }
      );

      if (result === 1) {
        logger.debug(`[LOCK] Released: ${key} (token matched)`);
      } else {
        logger.warn('[LOCK] Release failed (token mismatch):', { key });
      }

      return result;
    } catch (err) {
      logger.error('[LOCK] Error releasing lock:', { key, error: err.message });
      throw err;
    }
  }

  /**
   * Force release a lock (without token validation)
   * ⚠️ USE WITH CAUTION - only for emergency/manual cleanup
   *
   * @param {string} key - Lock key to forcibly remove
   * @returns {Promise<number>} - 1 if deleted, 0 if not found
   */
  async forceRelease(key) {
    try {
      logger.warn('[LOCK] Force releasing lock (emergency only):', { key });
      const result = await this.redisClient.del(key);
      return result;
    } catch (err) {
      logger.error('[LOCK] Error force releasing lock:', { key, error: err.message });
      throw err;
    }
  }

  /**
   * Check if lock is currently held
   *
   * @param {string} key - Lock key
   * @returns {Promise<boolean>}
   */
  async isLocked(key) {
    try {
      const exists = await this.redisClient.exists(key);
      return exists === 1;
    } catch (err) {
      logger.error('[LOCK] Error checking lock status:', { key, error: err.message });
      throw err;
    }
  }

  /**
   * Get remaining TTL of a lock
   *
   * @param {string} key - Lock key
   * @returns {Promise<number>} - TTL in seconds (-2 if not exists, -1 if no expiration)
   */
  async getLockTTL(key) {
    try {
      const ttl = await this.redisClient.ttl(key);
      return ttl;
    } catch (err) {
      logger.error('[LOCK] Error getting lock TTL:', { key, error: err.message });
      throw err;
    }
  }

  /**
   * Get the token value of a lock (for debugging only)
   * ⚠️ SECURITY: Only use for debugging/monitoring, not in application logic
   *
   * @param {string} key - Lock key
   * @returns {Promise<string|null>} - Current token or null if not locked
   */
  async getLockToken(key) {
    try {
      const token = await this.redisClient.get(key);
      return token;
    } catch (err) {
      logger.error('[LOCK] Error getting lock token:', { key, error: err.message });
      throw err;
    }
  }
}

module.exports = DistributedLockService;
