/**
 * Quota Tracker Service
 *
 * Tracks daily YouTube API quota usage per Pacific Time date.
 * Automatically resets quota counter at midnight PT.
 * Calculates dynamic cache TTL based on current usage percentage.
 *
 * Pattern:
 * - Key format: "quota:${serviceName}:${YYYY-MM-DD_PT}"
 * - Value: Integer counter (number of API calls used today)
 * - TTL: Automatically expires at next midnight PT
 */

const logger = require('../../utils/logger');
const { QUOTA_TTL_STRATEGY, LOCK_CONFIG } = require('../../utils/constants');

class QuotaTrackerService {
  /**
   * @param {RedisClient} redisClient - Redis client instance
   */
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  /**
   * Increment quota counter and get new total
   *
   * @param {string} serviceName - Service identifier (e.g., "youtube-analytics")
   * @param {number} increment - Number of quota units to add (default: 1)
   * @returns {Promise<number>} - New quota usage total
   *
   * Behavior:
   * 1. Generate/reuse quota key (includes PT date)
   * 2. Atomically increment counter by `increment`
   * 3. If key is new, set TTL to expire at midnight PT
   * 4. Return new total
   *
   * Example:
   *   incrementAndGet('youtube-analytics', 6) → 6 (first call)
   *   incrementAndGet('youtube-analytics', 3) → 9 (second call same day)
   *   // Next day PT:
   *   incrementAndGet('youtube-analytics', 1) → 1 (reset to new key)
   */
  async incrementAndGet(serviceName, increment = 1, customTtlSec = null) {
    try {
      const key = this.getQuotaKey(serviceName);

      // Atomically increment
      let newValue;
      if (increment !== 0) {
        newValue = await this.redisClient.incrBy(key, increment);
      } else {
        newValue = parseInt(await this.redisClient.get(key)) || 0;
      }

      // Set TTL if key was just created
      const ttl = await this.redisClient.ttl(key);
      if (ttl <= 0) {
        const ttlSec = customTtlSec || this.calculateTTLToPT();
        await this.redisClient.expire(key, ttlSec);
        logger.debug(`[QUOTA] New quota key created with TTL: ${ttlSec}s`, { serviceName });
      }

      logger.debug(`[QUOTA] Incremented ${serviceName}: +${increment} = ${newValue} total`, {
        serviceName,
        newUsage: newValue
      });

      return newValue;
    } catch (err) {
      logger.error('[QUOTA] Error incrementing quota:', {
        serviceName,
        error: err.message
      });
      throw err;
    }
  }

  /**
   * Helper key format for Hourly rate limit tracking (Pacific Time zone accurate)
   */
  getHourlyQuotaKey(serviceName, now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false
    }).formatToParts(now).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});

    const hour = parts.hour === '24' ? '00' : parts.hour;
    return `quota:hourly:${serviceName}:${parts.year}-${parts.month}-${parts.day}_${hour}`;
  }

  /**
   * Increment and get hourly quota (resets every 1 hour, TTL = 3600s)
   */
  async incrementAndGetHourly(serviceName, increment = 1, ttlSec = 3600) {
    try {
      const key = this.getHourlyQuotaKey(serviceName);
      let newValue;
      if (increment !== 0) {
        newValue = await this.redisClient.incrBy(key, increment);
      } else {
        newValue = parseInt(await this.redisClient.get(key)) || 0;
      }

      const ttl = await this.redisClient.ttl(key);
      if (ttl <= 0) {
        await this.redisClient.expire(key, ttlSec);
      }
      return newValue;
    } catch (err) {
      logger.error('[QUOTA] Error incrementing hourly quota:', { serviceName, error: err.message });
      throw err;
    }
  }

  /**
   * Get current quota usage for the day
   *
   * @param {string} serviceName - Service identifier
   * @returns {Promise<number>} - Current usage (0 if not set)
   */
  async getCurrentUsage(serviceName) {
    try {
      const key = this.getQuotaKey(serviceName);
      const value = await this.redisClient.get(key);
      return parseInt(value) || 0;
    } catch (err) {
      logger.error('[QUOTA] Error getting current usage:', { serviceName, error: err.message });
      throw err;
    }
  }

  /**
   * Calculate dynamic cache TTL based on quota usage
   *
   * @param {string} serviceName - Service identifier
   * @param {object} strategyConfig - Strategy config (from constants.QUOTA_TTL_STRATEGY)
   * @returns {Promise<number>} - TTL in seconds
   *
   * Strategy:
   * - Usage 0-50%: Use DEFAULT_TTL_SEC (2h)
   * - Usage 50-80%: Use 6h TTL
   * - Usage 80%+: Use 12h TTL (aggressive caching to preserve quota)
   *
   * This ensures:
   * - Low usage: Cache less aggressively, refresh frequently
   * - High usage: Cache aggressively to prevent quota exhaustion
   */
  async getCalculatedTTL(serviceName, strategyConfig = QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS) {
    try {
      if (!strategyConfig) {
        logger.warn('[QUOTA] No strategy config provided, using default');
        return QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS.DEFAULT_TTL_SEC;
      }

      const currentUsage = await this.getCurrentUsage(serviceName);
      const dailyLimit = strategyConfig.DAILY_LIMIT;
      const usagePercentage = currentUsage / dailyLimit;

      // Find matching threshold (check highest first)
      const thresholds = (strategyConfig.THRESHOLDS || []).sort(
        (a, b) => b.usagePct - a.usagePct
      );

      for (const threshold of thresholds) {
        if (usagePercentage >= threshold.usagePct) {
          logger.debug('[QUOTA] TTL calculated from threshold:', {
            serviceName,
            usage: currentUsage,
            limit: dailyLimit,
            percentage: (usagePercentage * 100).toFixed(2) + '%',
            ttlHours: threshold.ttlSec / 3600
          });
          return threshold.ttlSec;
        }
      }

      // Default if no threshold matched
      logger.debug('[QUOTA] Using default TTL (usage below all thresholds):', {
        serviceName,
        usage: currentUsage,
        ttlHours: strategyConfig.DEFAULT_TTL_SEC / 3600
      });

      return strategyConfig.DEFAULT_TTL_SEC;
    } catch (err) {
      logger.error('[QUOTA] Error calculating TTL:', {
        serviceName,
        error: err.message
      });
      // Fallback to default on error
      return QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS.DEFAULT_TTL_SEC;
    }
  }

  /**
   * Get usage percentage (0-100)
   *
   * @param {string} serviceName - Service identifier
   * @param {object} strategyConfig - Strategy config
   * @returns {Promise<number>} - Usage percentage
   */
  async getUsagePercentage(serviceName, strategyConfig = QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS) {
    try {
      const currentUsage = await this.getCurrentUsage(serviceName);
      const dailyLimit = strategyConfig?.DAILY_LIMIT || 10000;
      return (currentUsage / dailyLimit) * 100;
    } catch (err) {
      logger.error('[QUOTA] Error calculating usage percentage:', {
        serviceName,
        error: err.message
      });
      throw err;
    }
  }

  /**
   * Check if usage has exceeded threshold
   *
   * @param {string} serviceName - Service identifier
   * @param {number} threshold - Percentage threshold (0-100)
   * @param {object} strategyConfig - Strategy config
   * @returns {Promise<boolean>}
   */
  async hasExceededThreshold(serviceName, threshold, strategyConfig = QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS) {
    try {
      const percentage = await this.getUsagePercentage(serviceName, strategyConfig);
      return percentage >= threshold;
    } catch (err) {
      logger.error('[QUOTA] Error checking threshold:', {
        serviceName,
        threshold,
        error: err.message
      });
      throw err;
    }
  }

  /**
   * Get quota key with Pacific Time date
   *
   * Key format: "quota:${serviceName}:${YYYY-MM-DD_PT}"
   *
   * @param {string} serviceName - Service identifier
   * @returns {string} - Redis key
   *
   * Why Pacific Time?
   * - Google API quota resets daily at midnight PT
   * - Using PT ensures our counter matches Google's reset schedule
   */
  getQuotaKey(serviceName) {
    const ptDate = this.getPacificTimeDate();
    return `quota:${serviceName}:${ptDate}`;
  }

  /**
   * Get current date in Pacific Time (YYYY-MM-DD format)
   *
   * @returns {string} - Date string in PT timezone
   */
  getPacificTimeDate() {
    const now = new Date();
    const ptDate = new Date(
      now.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    );

    const year = ptDate.getFullYear();
    const month = String(ptDate.getMonth() + 1).padStart(2, '0');
    const day = String(ptDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Calculate seconds until midnight Pacific Time
   *
   * Used for setting TTL on quota keys.
   * Ensures quota counter automatically resets at next midnight PT.
   *
   * @returns {number} - Seconds until midnight PT
   *
   * Example:
   *   Current time: 2024-07-14 10:30 PT
   *   Midnight PT: 2024-07-15 00:00 PT
   *   Return: 50400 seconds (14 hours)
   */
  calculateTTLToPT() {
    const now = new Date();

    // Get current time in PT
    const ptNow = new Date(
      now.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles'
      })
    );

    // Create next midnight PT
    const nextMidnightPT = new Date(ptNow);
    nextMidnightPT.setDate(nextMidnightPT.getDate() + 1);
    nextMidnightPT.setHours(0, 0, 0, 0);

    // Convert back to UTC for comparison with current time
    const offset = ptNow.getTime() - now.getTime();
    const nextMidnightUTC = new Date(nextMidnightPT.getTime() - offset);

    // Calculate seconds
    const ttlMs = nextMidnightUTC.getTime() - now.getTime();
    const ttlSec = Math.round(ttlMs / 1000);

    return Math.max(1, ttlSec); // At least 1 second
  }

  /**
   * Get quota summary for monitoring
   *
   * @param {string} serviceName - Service identifier
   * @param {object} strategyConfig - Strategy config
   * @returns {Promise<object>} - Summary object
   */
  async getSummary(serviceName, strategyConfig = QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS) {
    try {
      const currentUsage = await this.getCurrentUsage(serviceName);
      const percentage = await this.getUsagePercentage(serviceName, strategyConfig);
      const ttl = await this.getCalculatedTTL(serviceName, strategyConfig);
      const key = this.getQuotaKey(serviceName);
      const redisTTL = await this.redisClient.ttl(key);

      return {
        serviceName,
        currentUsage,
        dailyLimit: strategyConfig.DAILY_LIMIT,
        usagePercentage: percentage.toFixed(2),
        cacheTTL: ttl,
        cacheTTLHours: (ttl / 3600).toFixed(2),
        redisKeyTTL: redisTTL,
        quotaKey: key
      };
    } catch (err) {
      logger.error('[QUOTA] Error getting summary:', { serviceName, error: err.message });
      throw err;
    }
  }

  /**
   * Reset quota counter (for testing/emergency only)
   * ⚠️ USE WITH CAUTION
   *
   * @param {string} serviceName - Service identifier
   * @returns {Promise<number>} - 1 if deleted, 0 if not found
   */
  async resetQuota(serviceName) {
    try {
      logger.warn('[QUOTA] Resetting quota (emergency only):', { serviceName });
      const key = this.getQuotaKey(serviceName);
      const result = await this.redisClient.del(key);
      return result;
    } catch (err) {
      logger.error('[QUOTA] Error resetting quota:', { serviceName, error: err.message });
      throw err;
    }
  }
}

module.exports = QuotaTrackerService;
