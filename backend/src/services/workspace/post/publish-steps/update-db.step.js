const BaseStep = require('../../../../core/pipeline/base.step');
const postRepository = require('../../../../repositories/workspace/post.repository');
const autoListRepository = require('../../../../repositories/workspace/auto-list.repository');
const notificationService = require('../../../core/notification.service');
const { POST_STATUS, NOTIFICATION_TYPES } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

/** Ném ra khi TOÀN BỘ platform publish thất bại (0/N thành công), để
 * publish-post.handler.js re-throw và BullMQ's defaultJobOptions.attempts tự
 * retry an toàn — chưa platform nào thành công nên không có rủi ro đăng trùng. */
class PublishFailedError extends Error {
  constructor(message, { postId, failedPlatforms }) {
    super(message);
    this.name = 'PublishFailedError';
    this.postId = postId;
    this.failedPlatforms = failedPlatforms;
  }
}

class UpdatePostStatusStep extends BaseStep {
  async execute(context) {
    const { post, results, options } = context;

    if (!results || results.length === 0) {
      return;
    }

    const allSuccessful = results.every(r => r.success);
    const firstFailure = results.find(r => !r.success);

    // Logic: Handle AutoList Loop (Repeat) mode
    let shouldLoop = false;
    if (post.autoListId) {
      const autoList = await autoListRepository.findById(post.autoListId);
      if (autoList && autoList.loopEnabled) {
        shouldLoop = true;
      }
    }

    // Build platformIdMap for successful publications, merged with any IDs
    // already persisted on the post. A partial-retry's `results` only covers
    // the platforms retried this round (see fetch-post.step.js narrowing
    // context.platforms to retryPlatforms), so writing platformIdMap alone
    // would erase IDs from platforms that succeeded in an earlier round (#61).
    let existingPlatformIdMap = {};
    if (post.platformPostId) {
      try {
        existingPlatformIdMap = JSON.parse(post.platformPostId);
      } catch {
        existingPlatformIdMap = {};
      }
    }
    const platformIdMap = { ...existingPlatformIdMap };
    results.forEach(r => {
      if (r.success && r.result) {
        platformIdMap[r.platform] = r.result.platformVideoId || r.result.id;
      }
    });
    const platformPostIdStr = Object.keys(platformIdMap).length > 0 ? JSON.stringify(platformIdMap) : null;

    if (allSuccessful) {
      const primaryResult = results[0].result;
      logger.debug(`[UpdatePostStatusStep] 🎉 Post ${post.id} published successfully on all platforms: ${results.map(r => r.platform).join(', ')}`);

      if (shouldLoop) {
        await this._handleLoopCycle(post, {
          status: POST_STATUS.PUBLISHED,
          publishedAt: primaryResult.publishedAt || new Date(),
          platformPostId: platformPostIdStr
        });
      } else {
        // Standard non-loop behavior: mark the post itself as published
        await postRepository.update(post.id, {
          status: POST_STATUS.PUBLISHED,
          platformPostId: platformPostIdStr,
          publishedAt: primaryResult.publishedAt || new Date(),
          publishRetryCount: 0
        });
      }

      await this._notifyPublishSuccess(post, results);
    } else {
      // Truncate failureReason để không vượt VARCHAR(191) của DB
      const failureReason = firstFailure
        ? `${firstFailure.platform}: ${firstFailure.error}`.substring(0, 190)
        : 'Unknown publishing error';

      console.warn(`[UpdatePostStatusStep] ⚠️ Post ${post.id} publication failed/partially failed. Failure reason: "${failureReason}". Results details:`, JSON.stringify(results, null, 2));

      // Handle Failure
      if (shouldLoop) {
        // AutoList loop mode has its own "retry" philosophy: it accepts this
        // cycle's failure, snapshots it to history (status FAILED), and puts the
        // original post back at the end of the queue for its next natural cycle
        // (which can be hours/days later, per the list's schedule). Mixing that
        // with BullMQ's near-immediate exponential-backoff retry would race two
        // different retry mechanisms against the same post — so loop mode never
        // throws/enqueues a partial retry, it keeps its existing behavior as-is.
        await this._handleLoopCycle(post, {
          status: POST_STATUS.FAILED,
          failureReason,
          platformPostId: platformPostIdStr
        });
        await this._notifyPublishFailure(post, failureReason);
      } else {
        // RETRYING, not FAILED — this post still has a real chance to succeed
        // (either BullMQ's own attempts for allFailed, or a scoped partial-retry
        // job below). FAILED is reserved for when there's truly no more retry
        // left (see publish.worker.js's on('failed') handler and
        // _enqueuePartialRetry's MAX_PUBLISH_ATTEMPTS guard).
        await postRepository.update(post.id, {
          status: POST_STATUS.RETRYING,
          failureReason,
          platformPostId: platformPostIdStr
        });
        await this._notifyPublishFailure(post, failureReason);

        // Post-Publish: Trigger stats update and rescheduling for AutoLists —
        // kept before the throw/enqueue decision so this side-effect never gets
        // skipped regardless of which branch runs next.
        if (post.autoListId) {
          await this._syncAutoListAfterPublish(post.autoListId);
        }

        const successCount = results.filter(r => r.success).length;
        const allFailed = successCount === 0;
        const failedPlatforms = results.filter(r => !r.success).map(r => r.platform);

        if (allFailed) {
          // 0/N succeeded — safe to let BullMQ retry the whole job.
          throw new PublishFailedError(
            `Post ${post.id} failed to publish on all ${results.length} platform(s): ${failureReason}`,
            { postId: post.id, failedPlatforms }
          );
        } else {
          // Partial — do NOT throw (BullMQ would re-run the whole job and
          // re-publish the platforms that already succeeded). Self-enqueue a
          // scoped retry job targeting only the failed platforms instead.
          await this._enqueuePartialRetry(post.id, failedPlatforms, options?.partialRetryCount || 0);
        }
        return;
      }
    }

    // Post-Publish: Trigger stats update and rescheduling for AutoLists
    // (allSuccessful branch, and the shouldLoop failure branch already handled
    // its own loop-cycle bookkeeping above).
    if (post.autoListId) {
      await this._syncAutoListAfterPublish(post.autoListId);
    }
  }

  /**
   * Updates AutoList bookkeeping after a publish attempt. Deliberately swallows
   * errors — the AutoList may have been deleted mid-publish (race with
   * deleteAutoList), and that must never break the post's own status update,
   * which already succeeded by the time this runs.
   */
  async _syncAutoListAfterPublish(autoListId) {
    try {
      const autoListService = require('../../auto-list.service');
      await autoListService.updateLastPostedAt(autoListId, new Date());
      await autoListService.recalculateQueueSchedules(autoListId);
    } catch (err) {
      console.error(`[UpdatePostStatusStep] Failed to update AutoList ${autoListId} after publish:`, err.message);
    }
  }

  /**
   * Enqueues a new BullMQ job scoped to only the platforms that failed this
   * round, reusing the exact pattern already used by
   * postService.retryFailedPlatforms — remove the existing job, add a new one
   * with retryPlatforms set. Capped by MAX_PUBLISH_ATTEMPTS (same constant
   * BullMQ's own attempts uses) to avoid an unbounded retry loop.
   */
  async _enqueuePartialRetry(postId, failedPlatforms, partialRetryCount = 0) {
    const { publishQueue } = require('../../../../queues/publish.queue');
    const { QUEUE_CONFIG } = require('../../../../constants/video-publish.constants');
    const maxAttempts = QUEUE_CONFIG.PUBLISH.MAX_PUBLISH_ATTEMPTS;

    // Persisted alongside the in-memory partialRetryCount passed through
    // job.data — this is what the RETRYING reconciler sweeper reads if the
    // self-enqueued job below is ever lost (Redis restart, or a #106
    // active-job dedup skip), since job.data itself doesn't survive that (#107 I7).
    await postRepository.update(postId, { publishRetryCount: partialRetryCount + 1 });

    if (partialRetryCount >= maxAttempts) {
      // Out of chances — this is now truly final.
      await postRepository.update(postId, { status: POST_STATUS.FAILED });
      console.warn(`[UpdatePostStatusStep] Post ${postId} exceeded max partial-retry attempts (${maxAttempts}) for platforms ${failedPlatforms.join(', ')}.`);
      return;
    }

    // Unlike post.service.js#retryFailedPlatforms (an external caller, which
    // must use safeUpsertPublishJob to avoid racing a possibly-active job),
    // this method runs INSIDE the currently-executing job's own handler —
    // this job's own jobId is itself the "active" one right now, so
    // safeUpsertPublishJob's active-job check would always (wrongly) skip
    // here. removeOnComplete cleans this job up once the handler returns, so
    // a plain remove+add is the correct handoff to the newly self-enqueued job.
    const jobId = `publish-post-${postId}`;
    await publishQueue.remove(jobId);
    await publishQueue.add(QUEUE_CONFIG.PUBLISH.JOB_PUBLISH, {
      postId,
      retryPlatforms: failedPlatforms,
      partialRetryCount: partialRetryCount + 1
    }, { jobId, delay: 5000 });
  }

  /**
   * Performs the loop cycle:
   * 1. Creates a published or failed clone of the post for history/analytics (with autoListId = null).
   * 2. Resets the original post to the end of the queue.
   */
  async _handleLoopCycle(post, cycleData) {
    try {
      // 1. Snapshot the publication result into a new static record (history)
      await postRepository.create({
        brandId: post.brandId,
        createdByUserId: post.createdByUserId,
        title: post.title,
        caption: post.caption,
        type: post.type,
        status: cycleData.status,
        targetPlatforms: post.targetPlatforms,
        mediaUrls: post.mediaUrls,
        mediaThumbnailUrls: post.mediaThumbnailUrls,
        hashtags: post.hashtags,
        mentions: post.mentions,
        firstComment: post.firstComment,
        locationId: post.locationId,
        locationName: post.locationName,
        linkUrl: post.linkUrl,
        altText: post.altText,
        metadata: post.metadata,
        isCollaboration: post.isCollaboration,
        collaboratorHandle: post.collaboratorHandle,
        publishedAt: cycleData.publishedAt || null,
        platformPostId: cycleData.platformPostId || null,
        failureReason: cycleData.failureReason || null,
        isLibrary: false
        // autoListId is NULL for the history snapshot so it doesn't appear in the queue
      });

      // 2. Recycle the original post record to the end of the queue
      await postRepository.update(post.id, {
        createdAt: new Date(), // Move to end
        status: POST_STATUS.DRAFT, // autoListService will set to SCHEDULED if list is active
        platformPostId: null,
        publishedAt: null,
        failureReason: null
      });
    } catch (err) {
      console.error('[UpdatePostStatusStep] Loop cycle failure:', err.message);
    }
  }

  async _notifyPublishSuccess(post, results) {
    try {
      const platforms = results.map(r => r.platform).filter(Boolean).join(', ');
      await notificationService.create({
        userId: post.createdByUserId,
        brandId: post.brandId,
        type: NOTIFICATION_TYPES.CONTENT,
        title: 'Post published successfully',
        message: `"${post.title}" was published${platforms ? ` to ${platforms}` : ''}.`,
        actionUrl: '/planner',
        preferenceKey: 'notifyPublishSuccess'
      });
    } catch (err) {
      console.error('[UpdatePostStatusStep] Failed to create publish success notification:', err.message);
    }
  }

  async _notifyPublishFailure(post, failureReason) {
    try {
      await notificationService.create({
        userId: post.createdByUserId,
        brandId: post.brandId,
        type: NOTIFICATION_TYPES.CONTENT,
        title: 'Post publishing failed',
        message: `"${post.title}" could not be published. ${failureReason}`,
        actionUrl: '/planner',
        preferenceKey: 'notifyPostFailure'
      });
    } catch (err) {
      console.error('[UpdatePostStatusStep] Failed to create publish failure notification:', err.message);
    }
  }
}

module.exports = UpdatePostStatusStep;
module.exports.PublishFailedError = PublishFailedError;
