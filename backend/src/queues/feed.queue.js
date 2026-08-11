const { Queue } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { QUEUE_CONFIG } = require('../constants/video-publish.constants');

const FEED_QUEUE_NAME = QUEUE_CONFIG.FEED.NAME;

let feedQueue;

if (process.env.NODE_ENV !== 'test') {
  feedQueue = new Queue(FEED_QUEUE_NAME, {
    ...defaultConnection,
    defaultJobOptions: {
      attempts: QUEUE_CONFIG.FEED.MAX_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: true,
      removeOnFail: 100, // keep a bounded trail of failures for debugging
    }
  });
} else {
  const mockFn = (val) => {
    try {
      return jest.fn().mockResolvedValue(val);
    } catch {
      return async () => val;
    }
  };
  feedQueue = {
    add: mockFn({ id: 'mock-job-id' }),
    upsertJobScheduler: mockFn(true),
    getJob: mockFn(null),
    close: mockFn(true),
    client: { on: () => {} }
  };
}

/**
 * Registers the repeatable SCAN job (idempotent — safe to call on every
 * server boot / across multiple instances, BullMQ dedupes by scheduler id).
 */
async function startFeedScheduler() {
  if (process.env.NODE_ENV === 'test') return;
  await feedQueue.upsertJobScheduler(
    QUEUE_CONFIG.FEED.SCHEDULER_ID,
    { pattern: QUEUE_CONFIG.FEED.CRON },
    { name: QUEUE_CONFIG.FEED.JOB_SCAN }
  );
}

module.exports = {
  feedQueue,
  FEED_QUEUE_NAME,
  startFeedScheduler
};
