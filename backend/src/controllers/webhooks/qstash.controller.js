const socialPlatformFactory = require('../../services/social/social-platform.factory');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const postService = require('../../services/workspace/post.service');
const postRepository = require('../../repositories/workspace/post.repository');
const mediaLibraryService = require('../../services/workspace/media-library.service');
const { getHistoryWindowMonths } = require('../../services/social/plan-history-window.util');
const { POST_STATUS } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Handles the social-account-sync QStash delivery — replaces the old
 * social.worker.js BullMQ handler. Pulls channel metrics for a newly
 * connected/reconnected social account, scoped to the brand's plan-based
 * history window (previously hardcoded to 90 days regardless of plan).
 *
 * Notifying the client (socket invalidation) and alerting on failure both
 * happen via sync-cache.proxy.js emitting EVENTS.SOCIAL.METRICS_SYNCED/
 * METRICS_SYNC_FAILED — see social.subscriber.js — so this handler only
 * needs to run the sync and track its own status bookkeeping.
 */
const handleSocialSync = async (req, res) => {
  const { socialAccountId, platform } = req.body;

  logger.debug(`[QStash Social Sync] Starting sync for platform: ${platform}, account: ${socialAccountId}`);

  await socialAccountRepository.updateSyncStatus(socialAccountId, 'PARTIAL');

  try {
    const service = socialPlatformFactory.getService(platform);

    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account) throw new Error('Social account not found');

    const windowMonths = await getHistoryWindowMonths(account.brandId);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - windowMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
 *
 * Notifying the client (socket invalidation) and alerting on failure both
 * happen via sync-cache.proxy.js emitting EVENTS.SOCIAL.METRICS_SYNCED/
 * METRICS_SYNC_FAILED — see social.subscriber.js — so this handler only
 * needs to run the sync.
 */
const handleMetricsSync = async (req, res) => {
  const { socialAccountId, platform } = req.body;

  logger.debug(`[QStash Metrics Sync] Starting sync for platform: ${platform}, account: ${socialAccountId}`);

  try {
    const service = socialPlatformFactory.getService(platform);

    if (typeof service.executeSyncPipeline === 'function' && typeof service.fetchRawPlatformData === 'function') {
      const account = await socialAccountRepository.findById(socialAccountId);
      if (account) {
        await service.executeSyncPipeline(account.brandId, socialAccountId, { type: 'METRICS' });
      } else {
        await service.syncChannelMetrics(socialAccountId, null, null, true);
      }
    } else {
      await service.syncChannelMetrics(socialAccountId, null, null, true);
    }

    logger.debug(`[QStash Metrics Sync] Successfully synced metrics for account: ${socialAccountId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[QStash Metrics Sync] Failed to sync metrics for platform: ${platform}, account: ${socialAccountId}. Error: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Handles one due-for-sync account from PostsSyncSchedulerService (see
 * posts-sync-scheduler.service.js), for any of the 6 Smart-Fetch platforms.
 * Smart Fetch: this is one of only 3 call sites allowed to invoke a
 * platform's syncPublishedPosts()'s live API fetch (the others being
 * OAuth-connect backfill and the manual refresh endpoint) — every
 * getPublishedVideos/getPublishedPosts read path is DB-only against
 * PostMetricDaily. Dispatches via socialPlatformFactory (OCP-friendly, same
 * pattern as handleMetricsSync) instead of branching on platform here, then
 * stamps lastPostsSyncAt so this account isn't re-claimed until its cooldown
 * elapses again.
 */
const handlePostsSync = async (req, res) => {
  const { socialAccountId, platform, brandId } = req.body;

  logger.debug(`[QStash Posts Sync] Starting sync for platform: ${platform}, account: ${socialAccountId}`);

  try {
    const service = socialPlatformFactory.getService(platform);
    await service.syncPublishedPosts(brandId, socialAccountId);
    await socialAccountRepository.updateLastPostsSyncAt(socialAccountId);

    logger.debug(`[QStash Posts Sync] Successfully synced account: ${socialAccountId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[QStash Posts Sync] Failed to sync account: ${socialAccountId}. Error: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Handles the publish-post QStash delivery — replaces publish.worker.js's
 * BullMQ handler (see the old publish-post.handler.js, whose logic this
 * mirrors exactly). postRepository.claimForPublishing()'s atomic DB
 * compare-and-swap is the actual guard against double-publish (an extra
 * delivery for a post already PUBLISHING just loses the claim and returns
 * early) — this replaces BullMQ's job-active check, not the safety net.
 */
const handlePublishPost = async (req, res) => {
  const { postId, retryTargets, retryPlatforms, partialRetryCount } = req.body;

  logger.debug(`[QStash Publish] 📝 Processing delivery for Post: ${postId}`);

  try {
    const validStatuses = [POST_STATUS.SCHEDULED, POST_STATUS.DRAFT, POST_STATUS.RETRYING];
    const claimed = await postRepository.claimForPublishing(postId, validStatuses);
    if (!claimed) {
      logger.debug(`[QStash Publish] ⏩ Post ${postId} is not in a valid state for publishing (or already being published). Skipping.`);
      return res.status(200).json({ success: true, skipped: true });
    }

    await postService.publishToPlatforms(postId, { retryTargets, retryPlatforms, partialRetryCount });

    logger.debug(`[QStash Publish] ✅ Successfully processed Post: ${postId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[QStash Publish] ❌ Error processing post ${postId}:`, err.message);

    // Safety net: PublishFailedError (all platforms failed) already moves
    // the post to RETRYING inside UpdatePostStatusStep before throwing, so
    // this is a no-op for that path. But an unexpected failure earlier in
    // the pipeline would otherwise leave the post stuck at PUBLISHING
    // forever with no path back to a retryable state — only revert if it's
    // still exactly where the claim left it.
    try {
      await postRepository.updateMany(
        { id: postId, status: POST_STATUS.PUBLISHING },
        { status: POST_STATUS.RETRYING }
      );
    } catch (resetErr) {
      console.error(`[QStash Publish] Failed to reset stuck PUBLISHING status for ${postId}:`, resetErr.message);
    }

    // Return 200 OK so QStash acknowledges HTTP delivery and does not re-trigger
    // 3x duplicate webhook calls — internal post retries are already handled
    // via UpdatePostStatusStep / _enqueuePartialRetry.
    return res.status(200).json({ success: false, message: err.message });
  }
};

/**
 * QStash failureCallback target — fires once, only after every retry for a
 * publish-post delivery is exhausted. Replaces publish.worker.js's
 * on('failed') handler's attemptsMade >= maxAttempts branch, which marked
 * the post FAILED. QStash's failure-callback payload wraps the original
 * request body (base64) in sourceBody, not as parsed JSON — see
 * advanced/callbacks.md's Failure Callback Body shape.
 */
const handlePublishPostFailed = async (req, res) => {
  try {
    const sourceBody = req.body?.sourceBody
      ? JSON.parse(Buffer.from(req.body.sourceBody, 'base64').toString('utf8'))
      : {};
    const { postId } = sourceBody;

    if (!postId) {
      logger.warn('[QStash Publish Failed] Failure callback missing postId in sourceBody.');
      return res.status(200).json({ success: true });
    }

    console.error(`[QStash Publish Failed] Post ${postId} exhausted all retries (retried=${req.body.retried}/${req.body.maxRetries}).`);
    await postRepository.update(postId, { status: POST_STATUS.FAILED });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[QStash Publish Failed] Error handling failure callback:', err.message);
    // Still 200 — retrying this callback won't fix a bug in this handler,
    // and QStash would otherwise keep redelivering the failure callback itself.
    return res.status(200).json({ success: false, message: err.message });
  }
};

/**
 * Handles one orphan-media candidate from MediaCleanupSchedulerService (see
 * media-cleanup-scheduler.service.js). deleteOrphanMediaAsset re-checks
 * isUsed=false via an atomic compare-and-delete at the DB level before
 * touching Cloudinary — see its own doc comment for why the delete order is
 * reversed compared to the user-initiated deleteMedia path. `skipped: true`
 * (not_found / now_in_use / race_lost) is a normal, expected outcome, not a
 * failure — still returns 200 so QStash doesn't retry it.
 */
const handleMediaCleanup = async (req, res) => {
  const { mediaLibraryId } = req.body;

  logger.debug(`[QStash Media Cleanup] Processing orphan candidate: ${mediaLibraryId}`);

  try {
    const result = await mediaLibraryService.deleteOrphanMediaAsset(mediaLibraryId);
    if (result.skipped) {
      logger.debug(`[QStash Media Cleanup] Skipped ${mediaLibraryId}: ${result.reason}`);
    } else {
      logger.debug(`[QStash Media Cleanup] Deleted orphan media: ${mediaLibraryId}`);
    }
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error(`[QStash Media Cleanup] Failed to clean up media ${mediaLibraryId}. Error: ${err.message}`);
    // Non-2xx tells QStash to retry per the message's configured retry count
    // — a genuine failure here (Cloudinary/DB network error) is worth
    // retrying, unlike the skipped outcomes above which are terminal.
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { handleSocialSync, handleMetricsSync, handlePostsSync, handlePublishPost, handlePublishPostFailed, handleMediaCleanup };
