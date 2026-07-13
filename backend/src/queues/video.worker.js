const { Worker } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { VIDEO_QUEUE_NAME } = require('./video.queue');
const trimVideoHandler = require('./handlers/trim-video.handler');
const { QUEUE_CONFIG } = require('../constants/video-publish.constants');

/**
 * BullMQ Worker Engine for Video Processing tasks
 * Routes jobs using Strategy Pattern based on Job Name
 */
const videoWorker = new Worker(VIDEO_QUEUE_NAME, async (job) => {
  if (job.name === QUEUE_CONFIG.VIDEO.JOB_TRIM) {
    return await trimVideoHandler.handle(job);
  }
  
  // Dễ dàng mở rộng thêm các job types khác ở đây mà không vi phạm OCP
  throw new Error(`Unhandled job type: ${job.name} in Video Worker`);
}, {
  ...defaultConnection,
  concurrency: 2 // Giới hạn tối đa 2 luồng render video song song trên mỗi instance để tránh nghẽn CPU
});

// Event Listeners cho logging/monitoring
videoWorker.on('completed', (job) => {
  console.log(`[Video Worker] Job ${job.id} completed!`);
});

videoWorker.on('failed', (job, err) => {
  console.error(`[Video Worker] Job ${job.id} failed with error: ${err.message}`);
});

module.exports = videoWorker;
