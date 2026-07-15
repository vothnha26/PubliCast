const { Queue } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');

const { QUEUE_CONFIG } = require('../constants/video-publish.constants');
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
      backoff: {
        type: 'exponential',
        delay: 5000, // Wait 5s before first retry, then 10s, 20s...
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
    close: mockFn(true),
    client: { on: () => {} }
  };
}

/**
 * Upsert a publishing job
 * @param {string} postId 
 * @param {Date} scheduledAt 
 */
const upsertPublishJob = async (postId, scheduledAt) => {
  const delay = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
  const jobId = `publish-post-${postId}`;
  
  // Remove existing job if any to reset the delay
  await publishQueue.remove(jobId);
  
  await publishQueue.add(QUEUE_CONFIG.PUBLISH.JOB_PUBLISH, { postId }, {
    jobId,
    delay
  });

  console.log(`[BullMQ Queue] 📅 Scheduled post ${postId} in ${Math.round(delay / 1000)}s`);
};

/**
 * Remove a publishing job
 * @param {string} postId 
 */
const removePublishJob = async (postId) => {
  const jobId = `publish-post-${postId}`;
  await publishQueue.remove(jobId);
  console.log(`[BullMQ Queue] 🗑️ Removed scheduled job for post ${postId}`);
};

module.exports = {
  publishQueue,
  PUBLISH_QUEUE_NAME,
  upsertPublishJob,
  removePublishJob
};
