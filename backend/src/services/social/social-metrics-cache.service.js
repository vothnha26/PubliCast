const { REDIS_NAMESPACES, REDIS_TTL } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Cache-Aside for SocialService.getAggregatedMetrics (GET /v2/social/metrics
 * — Channel Insights page's data source). One key per brand (unlike
 * dashboard-metrics-cache.service.js, this method takes no date-range/
 * platform params), so no tag-set indirection is needed — invalidateBrand()
 * deletes the single key directly.
 *
 * SECURITY: only ever call set() with the ALREADY-STRIPPED account list
 * (post stripSensitiveAccountFields in social.service.js). This cache
 * previously existed at the repository layer and was removed for caching
 * raw accounts — including decrypted accessToken/refreshToken/scopes — as
 * an unencrypted second copy of live OAuth credentials in Redis (see
 * social.service.js's comment above getAggregatedMetrics). Do not move this
 * cache call to wrap the repository call directly.
 *
 * Invalidation is event-driven (EVENTS.SOCIAL.METRICS_SYNCED), same as
 * dashboard-metrics-cache.service.js — see social-metrics.subscriber.js.
 * REDIS_TTL.SOCIAL_METRICS_SEC is only a safety net.
 */
class SocialMetricsCacheService {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  _key(brandId) {
    return `${REDIS_NAMESPACES.SOCIAL_METRICS}:${brandId}`;
  }

  async get(brandId) {
    try {
      const raw = await this.redisClient.get(this._key(brandId));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.debug('[SocialMetricsCache] get failed, falling back to DB:', err.message);
      return null;
    }
  }

  async set(brandId, accounts) {
    try {
      await this.redisClient.setEx(this._key(brandId), REDIS_TTL.SOCIAL_METRICS_SEC, JSON.stringify(accounts));
    } catch (err) {
      logger.debug('[SocialMetricsCache] set failed (cache is best-effort):', err.message);
    }
  }

  async invalidateBrand(brandId) {
    try {
      await this.redisClient.del(this._key(brandId));
    } catch (err) {
      logger.debug('[SocialMetricsCache] invalidateBrand failed:', err.message);
    }
  }
}

module.exports = SocialMetricsCacheService;
