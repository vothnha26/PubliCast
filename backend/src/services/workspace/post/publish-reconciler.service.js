const postRepository = require('../../../repositories/workspace/post.repository');
const logger = require('../../../utils/logger');
const { QUEUE_CONFIG } = require('../../../constants/video-publish.constants');
const { POST_STATUS } = require('../../../utils/constants');

/**
 * PublishReconcilerService — self-scheduling sweeper for posts stuck at
 * RETRYING (#107 I7).
 *
 * UpdatePostStatusStep always does one of two things immediately after
 * setting a post to RETRYING: throw (so BullMQ retries the whole job) or
 * self-enqueue a scoped partial-retry job. Either path relies on a BullMQ job
 * actually existing. If that job is ever lost — a Redis restart wipes it, or
 * the #106 safeUpsertPublishJob active-job dedup skips a re-enqueue that
 * genuinely needed to happen — the post is left at RETRYING with nothing left
 * to move it forward. This sweeper finds those posts and either re-enqueues
 * them (using the persisted publishRetryCount, since the BullMQ job.data that
 * normally carries this count is gone) or marks them FAILED once they've
 * exhausted MAX_PUBLISH_ATTEMPTS.
 */
class PublishReconcilerService {
  constructor() {
    this._timer = null;
  }

  start() {
    this._scheduleNext(0);
  }

  stop() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _scheduleNext(delayMs) {
    this._timer = setTimeout(async () => {
      try {
        await this.runOnce();
      } catch (err) {
        logger.error('[PublishReconciler] runOnce failed', err);
      } finally {
        this._scheduleNext(QUEUE_CONFIG.RECONCILER.POLL_INTERVAL_MS);
      }
    }, delayMs);
  }

  /** Processes one batch of stale-RETRYING posts. Public for tests/manual runs. */
  async runOnce() {
    const stale = await postRepository.findStaleRetrying(
      QUEUE_CONFIG.RECONCILER.STALE_RETRYING_MS,
      QUEUE_CONFIG.RECONCILER.BATCH_SIZE
    );

    let reenqueued = 0;
    let failed = 0;

    for (const post of stale) {
      try {
        if (post.publishRetryCount >= QUEUE_CONFIG.PUBLISH.MAX_PUBLISH_ATTEMPTS) {
          await postRepository.update(post.id, { status: POST_STATUS.FAILED });
          logger.warn(`[PublishReconciler] Post ${post.id} exhausted retries (publishRetryCount=${post.publishRetryCount}), marked FAILED.`);
          failed++;
          continue;
        }

        // No retryPlatforms filter here (unlike the in-flight partial-retry
        // path) — we don't persist which specific platforms failed, only a
        // truncated failureReason string. Retrying every targetPlatform is
        // still safe: SocialPublishStep looks up each platform's id from the
        // (already correctly merged, see #61) platformPostId map and every
        // native-scheduling-capable gateway short-circuits instead of
        // re-publishing when that id is already present (verified for I6).
        const { safeUpsertPublishJob } = require('../../../queues/publish.queue');
        const jobId = `publish-post-${post.id}`;
        const { applied } = await safeUpsertPublishJob(jobId, QUEUE_CONFIG.PUBLISH.JOB_PUBLISH, {
          postId: post.id,
          partialRetryCount: post.publishRetryCount
        }, { delay: 0 });

        if (applied) {
          logger.warn(`[PublishReconciler] Re-enqueued stale RETRYING post ${post.id} (publishRetryCount=${post.publishRetryCount}).`);
          reenqueued++;
        }
        // applied === false means a job for this post is (unexpectedly)
        // already active — leave it alone, the next sweep will re-check.
      } catch (err) {
        logger.error(`[PublishReconciler] Failed to reconcile post ${post.id}:`, err.message);
      }
    }

    return { swept: stale.length, reenqueued, failed };
  }
}

module.exports = new PublishReconcilerService();
