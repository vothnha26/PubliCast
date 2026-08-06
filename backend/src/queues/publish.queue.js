const { Queue } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');

const { QUEUE_CONFIG } = require('../constants/video-publish.constants');
const logger = require('../utils/logger');
const PUBLISH_QUEUE_NAME = QUEUE_CONFIG.PUBLISH.NAME;

/**
 * Main Publishing Queue
 * Responsible for holding jobs until their scheduled time
 */
let publishQueue;

if (process.env.NODE_ENV !== 'test') {
  publishQueue = new Queue(PUBLISH_QUEUE_NAME, {
    ...defaultConnection,
    defaultJobOptions: {
      attempts: QUEUE_CONFIG.PUBLISH.MAX_PUBLISH_ATTEMPTS, // Retry if failed
      // 'custom' delegates to publish.worker.js's backoffStrategy, which
      // falls back to the same exponential 5s/10s/20s for ordinary errors
      // but backs off much longer for platform rate-limit errors — see
      // RATE_LIMIT_BACKOFF_MS.
      backoff: {
        type: 'custom',
      },
      removeOnComplete: true, // Keep Redis clean
      removeOnFail: false, // Keep failed jobs for debugging
    }
  });
} else {
  // Mock publishQueue for unit tests to prevent Redis open handle leaks
  const mockFn = (val) => {
    try {
      return jest.fn().mockResolvedValue(val);
    } catch {
      return async () => val;
    }
  };
  publishQueue = {
    add: mockFn({ id: 'mock-job-id' }),
    remove: mockFn(true),
    getJob: mockFn(null),
    close: mockFn(true),
    client: { on: () => {} }
  };
}

/**
 * Upsert a publish job for postId, but only if no job for this postId is
 * currently `active` (i.e. a worker is executing it right now). remove() is a
 * no-op against an active job (BullMQ can't remove a job mid-execution), so a
 * plain remove-then-add would silently keep the stale active job running
 * while ALSO enqueuing a brand new one under the same jobId — the next add()
 * either gets deduped away (losing the reschedule/retry) or, once the active
 * job completes and is cleaned up, coexists as a genuine duplicate (double
 * publish). Closes #106.
 *
 * @returns {Promise<{applied: boolean}>} applied=false means a job for this
 *   postId is currently active; the caller's remove/add was skipped. The
 *   currently-executing worker owns finishing (or self-scheduling its own
 *   partial-retry) — see _enqueuePartialRetry / publish-post.handler.js.
 */
const safeUpsertPublishJob = async (jobId, jobName, jobData, jobOpts) => {
  const existing = await publishQueue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'active') {
      console.warn(`[BullMQ Queue] ⏸️ Skipping upsert for ${jobId} — a job is currently active.`);
      return { applied: false };
    }
  }

  await publishQueue.remove(jobId);
  await publishQueue.add(jobName, jobData, { ...jobOpts, jobId });
  return { applied: true };
};

/**
 * Upsert a publishing job
 * @param {string} postId
 * @param {Date} scheduledAt
 */
const upsertPublishJob = async (postId, scheduledAt) => {
  const delay = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
  const jobId = `publish-post-${postId}`;

  const { applied } = await safeUpsertPublishJob(jobId, QUEUE_CONFIG.PUBLISH.JOB_PUBLISH, { postId }, { delay });
  if (applied) {
    logger.debug(`[BullMQ Queue] 📅 Scheduled post ${postId} in ${Math.round(delay / 1000)}s`);
  }
};

/**
 * Remove a publishing job
 * @param {string} postId 
 */
const removePublishJob = async (postId) => {
  const jobId = `publish-post-${postId}`;
  await publishQueue.remove(jobId);
  logger.debug(`[BullMQ Queue] 🗑️ Removed scheduled job for post ${postId}`);
};

module.exports = {
  publishQueue,
  PUBLISH_QUEUE_NAME,
  upsertPublishJob,
  removePublishJob,
  safeUpsertPublishJob
};
