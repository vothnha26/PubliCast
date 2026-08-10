const { eventEmitter, EVENTS } = require('../event-emitter');
const dashboardMetricsCache = require('../../services/reports/dashboard-metrics-cache.singleton');
const socialMetricsCache = require('../../services/social/social-metrics-cache.singleton');
const logger = require('../../utils/logger');

/**
 * Invalidates both Redis cache-asides that sit in front of a brand's
 * read-only metrics endpoints — dashboard-metrics-cache.service.js (Dashboard/
 * Reports' preview-data) and social-metrics-cache.service.js (Channel
 * Insights' /v2/social/metrics) — the moment a real sync happens, reusing
 * the same EVENTS.SOCIAL.METRICS_SYNCED event social.subscriber.js already
 * consumes for the socket invalidation broadcast. No changes needed to the
 * scheduler/qstash sync path to add this.
 *
 * Deliberately does not touch the socket layer for either cache: these are
 * pull-only reads by design (unlike Inbox), so this subscriber's only job is
 * dropping the stale cache entries, not notifying any connected client.
 */
async function handleMetricsSynced({ brandId }) {
  if (!brandId) return;
  try {
    await Promise.all([
      dashboardMetricsCache.invalidateBrand(brandId),
      socialMetricsCache.invalidateBrand(brandId)
    ]);
  } catch (err) {
    logger.debug('[Metrics Cache Subscriber] Failed to invalidate cache:', err.message);
  }
}

function initMetricsCacheSubscriber() {
  eventEmitter.on(EVENTS.SOCIAL.METRICS_SYNCED, handleMetricsSynced);
}

module.exports = {
  initMetricsCacheSubscriber
};
