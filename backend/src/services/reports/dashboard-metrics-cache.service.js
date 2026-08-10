const { REDIS_NAMESPACES, REDIS_TTL } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Cache-Aside for AnalyticsFacade.getAggregatedData — that method issues
 * ~6 Prisma queries plus one live getPublishedVideos() call per connected
 * account (via socialPlatformFactory), so a Dashboard page load/refresh
 * previously re-paid that cost every time even though the underlying data
 * only changes once per sync (social-metrics-sync-scheduler.service.js,
 * every 15 min).
 *
 * Invalidation is event-driven, not TTL-driven: dashboard-metrics.subscriber.js
 * calls invalidateBrand() on EVENTS.SOCIAL.METRICS_SYNCED (already emitted by
 * sync-cache.proxy.js — see social.subscriber.js for the existing socket
 * consumer of the same event). REDIS_TTL.DASHBOARD_METRICS_SEC is only a
 * safety net in case an invalidation is ever missed.
 *
 * One brand can have many cached entries (one per distinct dateRange/
 * platforms/socialAccountId combination requested). Rather than SCAN-ing for
 * a wildcard on invalidate (unsupported by the in-memory Redis fallback used
 * in dev, see config/redis.js), each brand keeps a Redis Set of its own
 * cache keys ("tag" set) so invalidateBrand() can look up and delete exactly
 * those keys.
 */
class DashboardMetricsCacheService {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  _tagSetKey(brandId) {
    return `${REDIS_NAMESPACES.DASHBOARD_METRICS}:tags:${brandId}`;
  }

  _entryKey(brandId, dateFrom, dateTo, platforms, socialAccountId) {
    const platformsPart = [...platforms].sort().join(',');
    const from = new Date(dateFrom).toISOString().split('T')[0];
    const to = new Date(dateTo).toISOString().split('T')[0];
    return `${REDIS_NAMESPACES.DASHBOARD_METRICS}:${brandId}:${from}:${to}:${platformsPart}:${socialAccountId || 'all'}`;
  }

  async get(brandId, dateFrom, dateTo, platforms, socialAccountId) {
    const key = this._entryKey(brandId, dateFrom, dateTo, platforms, socialAccountId);
    try {
      const raw = await this.redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.debug('[DashboardMetricsCache] get failed, falling back to DB:', err.message);
      return null;
    }
  }

  async set(brandId, dateFrom, dateTo, platforms, socialAccountId, data) {
    const key = this._entryKey(brandId, dateFrom, dateTo, platforms, socialAccountId);
    try {
      await this.redisClient.setEx(key, REDIS_TTL.DASHBOARD_METRICS_SEC, JSON.stringify(data));
      await this.redisClient.sAdd(this._tagSetKey(brandId), key);
      // Tag set itself only needs to outlive its longest-lived member.
      await this.redisClient.expire(this._tagSetKey(brandId), REDIS_TTL.DASHBOARD_METRICS_SEC);
    } catch (err) {
      logger.debug('[DashboardMetricsCache] set failed (cache is best-effort):', err.message);
    }
  }

  async invalidateBrand(brandId) {
    const tagKey = this._tagSetKey(brandId);
    try {
      const keys = await this.redisClient.sMembers(tagKey);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
      await this.redisClient.del(tagKey);
    } catch (err) {
      logger.debug('[DashboardMetricsCache] invalidateBrand failed:', err.message);
    }
  }
}

module.exports = DashboardMetricsCacheService;
