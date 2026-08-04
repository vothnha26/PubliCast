const { Queue } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { QUEUE_CONFIG } = require('../constants/help-center.constants');

const HELP_CENTER_EMBEDDING_QUEUE_NAME = QUEUE_CONFIG.HELP_CENTER_EMBEDDING.NAME;

/**
 * Help Center Article Embedding Queue (BullMQ)
 */
let helpCenterEmbeddingQueue;

if (process.env.NODE_ENV !== 'test') {
  helpCenterEmbeddingQueue = new Queue(HELP_CENTER_EMBEDDING_QUEUE_NAME, {
    ...defaultConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 }
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
  helpCenterEmbeddingQueue = {
    add: mockFn({ id: 'mock-help-center-embedding-job-id' }),
    remove: mockFn(true),
    getJob: mockFn(null),
    close: mockFn(true),
    client: { on: () => {} }
  };
}

module.exports = {
  helpCenterEmbeddingQueue,
  HELP_CENTER_EMBEDDING_QUEUE_NAME
};
