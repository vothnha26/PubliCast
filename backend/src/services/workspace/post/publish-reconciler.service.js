const postRepository = require('../../../repositories/workspace/post.repository');
const logger = require('../../../utils/logger');
const { QUEUE_CONFIG } = require('../../../constants/video-publish.constants');
const { POST_STATUS } = require('../../../utils/constants');

/**
 * PublishReconcilerService — self-scheduling sweeper for posts stuck at
 * RETRYING (#107 I7).
 *
 * UpdatePostStatusStep always does one of two things immediately after
 * setting a post to RETRYING: throw (so QStash retries the whole delivery
 * per its retries config) or self-publish a scoped partial-retry delivery.
 * Either path relies on that QStash message actually existing. If it's ever
 * lost (e.g. a QStash outage, or the delivery's retries were exhausted
 * without failureCallback reaching this process), the post is left at
 * RETRYING with nothing left to move it forward. This sweeper finds those
 * posts and either re-publishes a delivery for them (using the persisted
 * publishRetryCount, since the QStash message body that normally carries
 * this count is gone) or marks them FAILED once they've exhausted
 * MAX_PUBLISH_ATTEMPTS.
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
        const { enqueueImmediate } = require('./publish-qstash.service');
        await enqueueImmediate(post.id, { partialRetryCount: post.publishRetryCount });

        logger.warn(`[PublishReconciler] Re-published stale RETRYING post ${post.id} (publishRetryCount=${post.publishRetryCount}).`);
        reenqueued++;
      } catch (err) {
        logger.error(`[PublishReconciler] Failed to reconcile post ${post.id}:`, err.message);
      }
    }

    return { swept: stale.length, reenqueued, failed };
  }
}

module.exports = new PublishReconcilerService();
