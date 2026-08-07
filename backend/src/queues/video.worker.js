const { Worker } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { VIDEO_QUEUE_NAME } = require('./video.queue');
const trimVideoHandler = require('./handlers/trim-video.handler');
const socketManager = require('../services/workspace/socket/socket.manager');
const redisClient = require('../config/redis');
const { QUEUE_CONFIG, TASK_STATUS, SOCKET_EVENTS, REDIS_PREFIXES } = require('../constants/video-publish.constants');
const logger = require('../utils/logger');

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
  concurrency: 2, // Giới hạn tối đa 2 luồng render video song song trên mỗi instance để tránh nghẽn CPU
  // drainDelay only bounds how long a worker blocks on BZPOPMIN while the
  // queue sits EMPTY — a job added via .add() pushes a "marker" that wakes
  // the blocked BZPOPMIN immediately regardless of this value (BullMQ v5
  // marker mechanism), so raising it doesn't delay a user waiting on their
  // trim. It only controls the idle re-poll interval, which was still
  // costing ~5.7k Upstash commands/day at 30s for a queue that's empty
  // the vast majority of the time.
  drainDelay: 300
});

// Event Listeners cho logging/monitoring
videoWorker.on('completed', (job) => {
  logger.debug(`[Video Worker] Job ${job.id} completed!`);
});

// job.attemptsMade/job.opts.attempts are BullMQ-specific — this is the only
// layer allowed to know about them (mirrors publish.worker.js). Only here do
// we know for certain a trim job has truly exhausted every retry (#108 I9).
videoWorker.on('failed', async (job, err) => {
  console.error(`[Video Worker] Job ${job.id} failed with error: ${err.message}`);

  const attemptsMade = job?.attemptsMade ?? 0;
  const maxAttempts = job?.opts?.attempts ?? 1;
  const { userId, videoUrl } = job?.data || {};

  if (attemptsMade >= maxAttempts) {
    logger.debug(`[Video Worker] 🚨 Max attempts (${maxAttempts}) reached for job ${job.id}. Setting status to FAILED.`);
    const taskKey = `${REDIS_PREFIXES.TASK_VIDEO_TRIM}${job.id}`;
    try {
      await redisClient.set(taskKey, JSON.stringify({
        status: TASK_STATUS.FAILED,
        userId,
        error: err.message,
        completedAt: Date.now()
      }), { EX: 86400 });

      if (userId) {
        socketManager.emitToUser(userId, SOCKET_EVENTS.VIDEO_FAILED, {
          taskId: job.id,
          originalVideoUrl: videoUrl,
          error: err.message
        });
      }
    } catch (notifyErr) {
      console.error(`[Video Worker] Failed to record/notify FAILED state for job ${job.id}:`, notifyErr.message);
    }
  } else {
    logger.debug(`[Video Worker] 🔄 Attempt ${attemptsMade}/${maxAttempts} failed for job ${job.id}. BullMQ will retry automatically.`);
  }
});

module.exports = videoWorker;
