const { Worker } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { PUBLISH_QUEUE_NAME } = require('./publish.queue');
const publishPostHandler = require('./handlers/publish-post.handler');
const { QUEUE_CONFIG } = require('../constants/video-publish.constants');
const postRepository = require('../repositories/workspace/post.repository');
const { POST_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Worker Engine
 * Listens to the social-publish-queue and executes post publication
 * Routes jobs using Strategy Pattern based on Job Name
 */
const publishWorker = new Worker(PUBLISH_QUEUE_NAME, async (job) => {
  if (job.name === QUEUE_CONFIG.PUBLISH.JOB_PUBLISH) {
    return await publishPostHandler.handle(job);
  }
  
  throw new Error(`Unhandled job type: ${job.name} in Publish Worker`);
}, {
  ...defaultConnection,
  concurrency: 5, // Process up to 5 posts simultaneously
  lockDuration: QUEUE_CONFIG.PUBLISH.LOCK_DURATION_MS,
  maxStalledCount: 1,
});

// Event Listeners for logging/monitoring
publishWorker.on('completed', (job) => {
  logger.debug(`[BullMQ Worker] Job ${job.id} completed!`);
});

// job.attemptsMade/job.opts.attempts are BullMQ-specific — this is the only
// layer allowed to know about them (the pipeline stays unaware of BullMQ).
// Only here do we know for certain a post has truly exhausted every retry.
publishWorker.on('failed', async (job, err) => {
  const attemptsMade = job?.attemptsMade ?? 0;
  const maxAttempts = job?.opts?.attempts ?? 1;

  if (attemptsMade >= maxAttempts) {
    console.error(`[BullMQ Worker] Job ${job.id} (post ${job.data?.postId}) exhausted all ${maxAttempts} attempts.`);
    try {
      await postRepository.update(job.data.postId, { status: POST_STATUS.FAILED });
    } catch (updateErr) {
      console.error(`[BullMQ Worker] Failed to mark post ${job.data?.postId} as FAILED after exhausting retries:`, updateErr.message);
    }
  } else {
    console.warn(`[BullMQ Worker] Job ${job.id} (post ${job.data?.postId}) failed attempt ${attemptsMade}/${maxAttempts}: ${err.message}. BullMQ will retry automatically.`);
  }
});

module.exports = publishWorker;
