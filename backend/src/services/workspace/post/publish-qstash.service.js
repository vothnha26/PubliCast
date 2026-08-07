const { qstashClient } = require('../../../config/qstash');
const postRepository = require('../../../repositories/workspace/post.repository');
const { QUEUE_CONFIG } = require('../../../constants/video-publish.constants');
const logger = require('../../../utils/logger');

/**
 * Publish scheduling via QStash — replaces the BullMQ publish.queue.js pair
 * (a 24/7 idle-polling worker on Upstash's command-metered billing).
 *
 * Unlike BullMQ's jobId-based remove/re-add, QStash always returns a
 * server-generated messageId on publish — there's no way to address a
 * pending delivery by a caller-chosen ID. Post.qstashMessageId persists that
 * ID so a reschedule or unschedule can cancel the specific pending delivery.
 *
 * This intentionally does NOT replicate BullMQ's old "skip if a job is
 * currently active" check (the removed safeUpsertPublishJob, #106) — that
 * was an optimization to avoid a redundant enqueue, not the actual safety
 * mechanism. The real guard against double-publish is
 * postRepository.claimForPublishing()'s atomic DB compare-and-swap inside
 * controllers/webhooks/qstash.controller.js#handlePublishPost: an extra
 * delivery landing while a post is already PUBLISHING just loses that
 * compare-and-swap and returns early, at the cost of one harmless wasted
 * webhook call.
 */

const publishWebhookUrl = () => `${process.env.BACKEND_BASE_URL}/api/webhooks/qstash/publish-post`;
const publishFailureWebhookUrl = () => `${process.env.BACKEND_BASE_URL}/api/webhooks/qstash/publish-post-failed`;

/**
 * Cancels a post's pending QStash delivery, if one is tracked. Safe to call
 * when there's nothing to cancel (already delivered, or never scheduled).
 */
const cancelPendingDelivery = async (post) => {
  if (!post?.qstashMessageId) return;
  try {
    await qstashClient.messages.cancel(post.qstashMessageId);
  } catch (err) {
    // Already delivered/expired/unknown — nothing left to cancel.
    logger.debug(`[PublishQStash] Cancel of message ${post.qstashMessageId} for post ${post.id} was a no-op: ${err.message}`);
  }
};

/**
 * Schedules (or reschedules) a post's publish delivery for scheduledAt.
 * Cancels any previously-tracked pending delivery first so a reschedule
 * doesn't leave two deliveries in flight for the same post.
 */
const upsertPublishJob = async (postId, scheduledAt, extraBody = {}) => {
  const post = await postRepository.findById(postId);
  await cancelPendingDelivery(post);

  const delaySeconds = Math.max(0, Math.round((new Date(scheduledAt).getTime() - Date.now()) / 1000));

  const { messageId } = await qstashClient.publishJSON({
    url: publishWebhookUrl(),
    body: { postId, ...extraBody },
    delay: delaySeconds,
    retries: QUEUE_CONFIG.PUBLISH.MAX_PUBLISH_ATTEMPTS,
    timeout: Math.ceil(QUEUE_CONFIG.PUBLISH.LOCK_DURATION_MS / 1000),
    // Fires once, only when every retry is exhausted — the QStash
    // equivalent of publish.worker.js's old on('failed') check for
    // attemptsMade >= maxAttempts, which marked the post FAILED.
    failureCallback: publishFailureWebhookUrl()
  });

  await postRepository.update(postId, { qstashMessageId: messageId });
  logger.debug(`[PublishQStash] 📅 Scheduled post ${postId} in ${delaySeconds}s (message ${messageId})`);
  return messageId;
};

/**
 * Cancels a post's pending delivery and clears the tracked messageId.
 */
const removePublishJob = async (postId) => {
  const post = await postRepository.findById(postId);
  await cancelPendingDelivery(post);
  if (post?.qstashMessageId) {
    await postRepository.update(postId, { qstashMessageId: null });
  }
  logger.debug(`[PublishQStash] 🗑️ Removed scheduled delivery for post ${postId}`);
};

/**
 * Publishes an immediate (near-zero-delay) delivery without touching the
 * tracked messageId's cancel semantics beyond overwriting it — used by
 * retryFailedPlatforms and the partial-retry self-enqueue, which fire
 * moments after the original delivery already ran and don't need the
 * "cancel the old one first" dance upsertPublishJob does for reschedules.
 */
const enqueueImmediate = async (postId, extraBody = {}, delaySeconds = 0) => {
  const { messageId } = await qstashClient.publishJSON({
    url: publishWebhookUrl(),
    body: { postId, ...extraBody },
    delay: delaySeconds,
    retries: QUEUE_CONFIG.PUBLISH.MAX_PUBLISH_ATTEMPTS,
    timeout: Math.ceil(QUEUE_CONFIG.PUBLISH.LOCK_DURATION_MS / 1000),
    failureCallback: publishFailureWebhookUrl()
  });
  await postRepository.update(postId, { qstashMessageId: messageId });
  return messageId;
};

module.exports = {
  upsertPublishJob,
  removePublishJob,
  enqueueImmediate
};
