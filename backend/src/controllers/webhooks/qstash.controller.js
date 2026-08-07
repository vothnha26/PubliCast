const socialPlatformFactory = require('../../services/social/social-platform.factory');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const logger = require('../../utils/logger');

/**
 * Handles the social-account-sync QStash delivery — replaces the old
 * social.worker.js BullMQ handler. Pulls the last 90 days of channel
 * metrics for a newly connected/reconnected social account.
 */
const handleSocialSync = async (req, res) => {
  const { socialAccountId, platform } = req.body;

  logger.debug(`[QStash Social Sync] Starting sync for platform: ${platform}, account: ${socialAccountId}`);

  await socialAccountRepository.updateSyncStatus(socialAccountId, 'PARTIAL');

  try {
    const service = socialPlatformFactory.getService(platform);

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await service.syncChannelMetrics(socialAccountId, startDate, endDate);

    await socialAccountRepository.updateSyncStatus(socialAccountId, 'SUCCESS');
    await socialAccountRepository.updateLastSyncAt(socialAccountId);

    logger.debug(`[QStash Social Sync] Successfully synced metrics for account: ${socialAccountId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    await socialAccountRepository.updateSyncStatus(socialAccountId, 'FAILED');

    // Safe logs only — never log job payload/tokens.
    console.error(`[QStash Social Sync] Failed to sync metrics for platform: ${platform}, account: ${socialAccountId}. Error: ${err.message}`);

    // Non-2xx tells QStash to retry per the message's configured retry count.
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Handles one due-for-sync account from SocialMetricsSyncScheduler (see
 * social-metrics-sync-scheduler.service.js). Replaces the old cron behavior
 * of force-syncing every account of every active brand at the top of the
 * hour in a sequential loop inside the main process — instead the cron only
 * queries accounts past their cooldown and publishes one QStash message per
 * account, with QStash's flowControl capping concurrency so a large batch of
 * simultaneously-due accounts (e.g. after downtime) can't flood platform
 * APIs or the DB pool. force=true bypasses SyncCacheProxy's own cooldown
 * check since the scheduler's DB query already applied it.
 */
const handleMetricsSync = async (req, res) => {
  const { socialAccountId, platform } = req.body;

  logger.debug(`[QStash Metrics Sync] Starting sync for platform: ${platform}, account: ${socialAccountId}`);

  try {
    const service = socialPlatformFactory.getService(platform);
    await service.syncChannelMetrics(socialAccountId, null, null, true);

    logger.debug(`[QStash Metrics Sync] Successfully synced metrics for account: ${socialAccountId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[QStash Metrics Sync] Failed to sync metrics for platform: ${platform}, account: ${socialAccountId}. Error: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { handleSocialSync, handleMetricsSync };
