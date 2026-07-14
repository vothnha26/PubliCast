const { Worker } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { PUBLISH_QUEUE_NAME } = require('./publish.queue');
const publishPostHandler = require('./handlers/publish-post.handler');
const { QUEUE_CONFIG } = require('../constants/video-publish.constants');

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
});

// Event Listeners for logging/monitoring
publishWorker.on('completed', (job) => {
  console.log(`[BullMQ Worker] Job ${job.id} completed!`);
});

publishWorker.on('failed', (job, err) => {
  console.error(`[BullMQ Worker] Job ${job.id} failed with error: ${err.message}`);
});

module.exports = publishWorker;
