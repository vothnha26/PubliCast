const { eventEmitter, EVENTS } = require('../event-emitter');
const socketInvalidationService = require('../../services/core/socket-invalidation.service');
const { CACHE_SCOPES } = require('../../utils/socket-constants');
const logger = require('../../utils/logger');

/**
 * SOCIAL.CONNECTED không còn được emit ở bất kỳ đâu — social-account.repository.js
 * ghi outbox row SOCIAL_SYNC_ENQUEUE trực tiếp trong cùng transaction với việc lưu
 * socialAccount (xem outbox-handlers.js), thay vì emit sự kiện để subscriber này lắng
 * nghe rồi mới enqueue job rời rạc, không transaction, không retry.
 *
 * SOCIAL.METRICS_SYNCED/METRICS_SYNC_FAILED are different in kind: best-effort
 * UI/notification side-effects, not "enqueue a job" — losing one on a crash
 * just delays a socket update until the next sync, nothing is lost that needs
 * retrying. Emitted from sync-cache.proxy.js, the one place every platform's
 * syncChannelMetrics call passes through.
 */
async function handleMetricsSynced({ brandId }) {
  if (!brandId) return;
  await socketInvalidationService.invalidateBrandScope(brandId, CACHE_SCOPES.METRICS).catch((err) => {
    logger.debug('[Social Subscriber] Failed to invalidate metrics cache scope:', err.message);
  });
}

async function handleMetricsSyncFailed({ account, error }) {
  if (!account) return;
  try {
    const socialService = require('../../services/social/social.service');
    await socialService._notifyPlatformSyncFailure(account, error);
  } catch (err) {
    logger.debug('[Social Subscriber] Failed to send sync-failure notification:', err.message);
  }
}

function initSocialSubscriber() {
  eventEmitter.on(EVENTS.SOCIAL.METRICS_SYNCED, handleMetricsSynced);
  eventEmitter.on(EVENTS.SOCIAL.METRICS_SYNC_FAILED, handleMetricsSyncFailed);
}

module.exports = {
  initSocialSubscriber
};
