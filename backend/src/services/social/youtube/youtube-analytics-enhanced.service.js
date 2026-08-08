/**
 * YouTube Analytics Enhanced Service
 *
 * Implements quota-optimized video insights fetching with:
 * 1. Distributed locks (Redlock Pattern) to prevent Thundering Herd
 * 2. Quota tracking with dynamic cache TTL strategy
 * 3. Stale cache fallback and status messages
 * 4. Background async fetching with proper error handling
 *
 * Based on implementation_plan.md
 */

const youtubeGateway = require('./youtube.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const DistributedLockService = require('../distributed-lock.service');
const QuotaTrackerService = require('../quota-tracker.service');
const RedisHealthService = require('../redis-health.service');
const logger = require('../../../utils/logger');
const { PLATFORMS, LOCK_CONFIG, QUOTA_TTL_STRATEGY } = require('../../../utils/constants');

let redisClient = null;
try {
  redisClient = require('../../../config/redis');
} catch (_) {
  logger.warn('[YouTubeAnalyticsEnhanced] Redis not available, caching disabled');
}

class YouTubeAnalyticsEnhancedService {
  constructor() {
    this.lockService = redisClient ? new DistributedLockService(redisClient) : null;
    this.quotaService = redisClient ? new QuotaTrackerService(redisClient) : null;
    this.redisHealthService = redisClient ? new RedisHealthService(redisClient) : null;
  }

  /**
   * Get video insights with quota-optimized caching and lock-based concurrency control
   *
   * Flow:
   * 1. Try cache hit → return immediately
   * 2. Try acquire lock
   *    - If acquired: Fetch from Google (background), wait for cache or return stale/status
   *    - If not acquired: Poll cache, return stale/status on timeout
   * 3. Background fetch increments quota by 6 units (for 6 sub-queries)
   * 4. Cache TTL calculated from quota usage percentage
   * 5. Stale backup kept for 24h fallback
   *
   * @param {string} brandId - Brand identifier
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<object>} - Video insights or status message
   */
  async getPostInsights(brandId, videoId) {
    const cacheKey = `yt:video-insights:${videoId}`;
    const staleKey = `yt:video-insights:stale:${videoId}`;
    const lockKey = LOCK_CONFIG.YOUTUBE_INSIGHTS.PREFIX + videoId;

    try {
      // Step 1: Try cache hit (fast path)
      const cached = await this._readCache(cacheKey);
      if (cached) {
        logger.debug('[CACHE_HIT] Video insights from cache', { videoId });
        return cached;
      }

      // Step 2: Check Redis health
      const shouldFailOpen = this.redisHealthService
        ? await this.redisHealthService.shouldFailOpen()
        : false;

      if (shouldFailOpen) {
        // Redis is down - bypass lock, fetch directly
        return this._fetchInsightsDirectly(brandId, videoId);
      }

      // Step 3: Try to acquire lock
      const token = await this.lockService?.acquireLock(lockKey, LOCK_CONFIG.YOUTUBE_INSIGHTS.TTL_SEC);

      if (token) {
        // We got the lock - fetch from Google in background
        return this._handleLockAcquired(brandId, videoId, token, cacheKey, staleKey, lockKey);
      } else {
        // Lock is held by another request - poll for cache
        return this._handleLockNotAcquired(videoId, cacheKey, staleKey);
      }
    } catch (err) {
      logger.error('[YouTubeAnalyticsEnhanced] Unexpected error', {
        videoId,
        error: err.message
      });
      // Fallback: try stale cache
      return this._readCache(`yt:video-insights:stale:${videoId}`) || this._getStatusMessage();
    }
  }

  /**
   * Handle case where we acquired the lock
   * Start background fetch, wait for cache or return stale/status
   *
   * @private
   */
  async _handleLockAcquired(brandId, videoId, token, cacheKey, staleKey, lockKey) {
    logger.debug('[LOCK_ACQUIRED] Starting background fetch', { videoId });

    // Start background fetch (non-blocking)
    this._backgroundFetch(brandId, videoId, token, cacheKey, staleKey, lockKey).catch(err => {
      logger.error('[BACKGROUND_FETCH] Unhandled error', {
        videoId,
        error: err.message
      });
    });

    // Wait for cache or timeout, then return result
    return this._waitForCacheOrFallback(videoId, cacheKey, staleKey);
  }

  /**
   * Fetch insights from Google in background
   *
   * @private
   */
  async _backgroundFetch(brandId, videoId, token, cacheKey, staleKey, lockKey) {
    try {
      const auth = await this._getAuthClient(brandId);
      if (!auth) {
        throw new Error('No authenticated client available');
      }

      // Increment quota (1 unit for 1 basic metrics query)
      const quotaUsage = await this.quotaService?.incrementAndGet('youtube-analytics', 1);
      logger.debug('[QUOTA_INCREMENTED] Quota usage after fetch', {
        videoId,
        usage: quotaUsage
      });

      // Fetch insights with timeout
      const results = await Promise.race([
        this._buildInsights(auth, videoId),
        this._timeoutPromise(LOCK_CONFIG.YOUTUBE_INSIGHTS.API_TIMEOUT_MS)
      ]);

      // Cache results
      const ttl = await this.quotaService?.getCalculatedTTL(
        'youtube-analytics',
        QUOTA_TTL_STRATEGY.YOUTUBE_ANALYTICS
      );

      await this._writeCache(cacheKey, results, ttl);
      await this._writeCache(staleKey, results, 86400); // 24h stale backup

      logger.debug('[BACKGROUND_FETCH_SUCCESS] Cached insights', {
        videoId,
        ttlHours: (ttl / 3600).toFixed(2)
      });
    } catch (err) {
      logger.error('[BACKGROUND_FETCH_ERROR] Failed to fetch insights', {
        videoId,
        error: err.message
      });
      // Lock will be released in finally block
    } finally {
      // Always release lock with token (safe release)
      if (this.lockService) {
        const released = await this.lockService.releaseLock(lockKey, token);
        logger.debug('[LOCK_RELEASED]', { videoId, released: released === 1 });
      }
    }
  }

  /**
   * Handle case where lock is already held
   * Poll for cache, return stale/status on timeout
   *
   * @private
   */
  async _handleLockNotAcquired(videoId, cacheKey, staleKey) {
    logger.debug('[POLLING_START] Waiting for cache from another request', { videoId });

    return this._waitForCacheOrFallback(videoId, cacheKey, staleKey);
  }

  /**
   * Poll cache until it's available or timeout
   *
   * @private
   */
  async _waitForCacheOrFallback(videoId, cacheKey, staleKey) {
    const pollInterval = LOCK_CONFIG.YOUTUBE_INSIGHTS.POLL_INTERVAL_MS;
    const pollTimeout = LOCK_CONFIG.YOUTUBE_INSIGHTS.POLL_TIMEOUT_MS;
    const startTime = Date.now();

    while (Date.now() - startTime < pollTimeout) {
      const cached = await this._readCache(cacheKey);
      if (cached) {
        logger.debug('[POLLING_SUCCESS] Cache found after polling', { videoId });
        return cached;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Polling timed out
    logger.warn('[POLLING_TIMEOUT] Cache not ready after max wait', { videoId });

    // Try stale cache
    const stale = await this._readCache(staleKey);
    if (stale) {
      logger.info('[STALE_CACHE] Returning stale backup', { videoId });
      return stale;
    }

    // No stale cache - return status message
    logger.warn('[NO_CACHE] No cache or stale data available', { videoId });
    return this._getStatusMessage();
  }

  /**
   * Fetch insights directly (when Redis is down)
   *
   * @private
   */
  async _fetchInsightsDirectly(brandId, videoId) {
    try {
      logger.warn('[REDIS_DOWN_FALLBACK] Fetching insights directly', { videoId });

      const auth = await this._getAuthClient(brandId);
      if (!auth) return this._getStatusMessage();

      // Still increment quota count if quota service works
      await this.quotaService?.incrementAndGet('youtube-analytics', 1);

      return await this._buildInsights(auth, videoId);
    } catch (err) {
      logger.error('[DIRECT_FETCH_ERROR] Failed to fetch', { videoId, error: err.message });
      return this._getStatusMessage();
    }
  }

  /**
   * Build basic video insights from Google API (1 single query)
   *
   * @private
   */
  async _buildInsights(auth, videoId) {
    const { ANALYTICS } = require('../../../utils/constants');
    try {
      const res = await youtubeGateway.getAnalyticsReportQuery(auth, {
        ids: 'channel==MINE',
        startDate: ANALYTICS.LIFETIME_START_DATE,
        endDate: new Date().toISOString().split('T')[0],
        metrics: 'views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration',
        filters: `${ANALYTICS.DIMENSIONS.YOUTUBE.VIDEO}==${videoId}`
      });

      const row = res.data?.rows?.[0];
      if (!row) {
        return { views: 0, watchTime: 0, totalWatchHrs: 0, avgViewDuration: 0, likes: 0, comments: 0, shares: 0, timestamp: Date.now() };
      }

      const views = parseInt(row[0] || 0, 10);
      const likes = parseInt(row[1] || 0, 10);
      const comments = parseInt(row[2] || 0, 10);
      const shares = parseInt(row[3] || 0, 10);
      const watchMinutes = parseFloat(row[4] || 0);
      const avgViewDuration = Math.round(parseFloat(row[5] || 0));
      const totalWatchHrs = Math.round((watchMinutes / 60) * 10) / 10;

      return {
        views,
        watchTime: totalWatchHrs,
        totalWatchHrs,
        avgViewDuration,
        likes,
        comments,
        shares,
        timestamp: Date.now()
      };
    } catch (err) {
      logger.warn(`[YouTubeAnalyticsEnhanced] Failed to fetch basic video metrics for ${videoId}:`, err.message);
      return { views: 0, watchTime: 0, totalWatchHrs: 0, avgViewDuration: 0, likes: 0, comments: 0, shares: 0, timestamp: Date.now() };
    }
  }

  /**
   * Get authenticated client for brand
   *
   * @private
   */
  async _getAuthClient(brandId) {
    const accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!accounts || accounts.length === 0) return null;

    const active = accounts.find(acc =>
      !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
      !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
    ) || accounts[0];

    if (active.accessToken && active.accessToken.startsWith('mock-')) return null;

    // Reuse from youtube-analytics.service.js
    const YouTubeAnalyticsService = require('./youtube-analytics.service');
    const baseService = new YouTubeAnalyticsService();
    return baseService._createAuthenticatedClient(active);
  }

  /**
   * Read from Redis cache
   *
   * @private
   */
  async _readCache(key) {
    if (!redisClient) return null;
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      logger.error('[CACHE_READ_ERROR]', { key, error: err.message });
      return null;
    }
  }

  /**
   * Write to Redis cache
   *
   * @private
   */
  async _writeCache(key, value, ttl) {
    if (!redisClient) return;
    try {
      await redisClient.setEx(key, ttl || 7200, JSON.stringify(value));
    } catch (err) {
      logger.error('[CACHE_WRITE_ERROR]', { key, error: err.message });
    }
  }

  /**
   * Helper to create timeout promise
   *
   * @private
   */
  async _timeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`API timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Return status message when data not available
   *
   * @private
   */
  _getStatusMessage() {
    return {
      status: 'FETCHING_IN_PROGRESS',
      message: 'Video data is being fetched. Please try again in a few seconds.',
      timestamp: Date.now()
    };
  }
}

module.exports = YouTubeAnalyticsEnhancedService;
