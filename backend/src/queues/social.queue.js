const { Queue } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { QUEUE_CONFIG } = require('../constants/video-publish.constants');

const SOCIAL_QUEUE_NAME = QUEUE_CONFIG.SOCIAL.NAME;

/**
 * Social Sync Queue Engine (BullMQ)
 */
let socialQueue;

if (process.env.NODE_ENV !== 'test') {
  socialQueue = new Queue(SOCIAL_QUEUE_NAME, {
    ...defaultConnection,
    defaultJobOptions: {
      attempts: 3, // Thử lại tối đa 3 lần nếu API lỗi
      backoff: {
        type: 'exponential',
        delay: 10000 // 10 giây cho lần đầu, nhân đôi cho các lần tiếp theo (10s -> 20s -> 40s)
      },
      removeOnComplete: { count: 100 }, // Chỉ giữ 100 job thành công tránh phình RAM Redis
      removeOnFail: { count: 500 }      // Giữ lại 500 job lỗi để thuận tiện debug
    }
  });
} else {
  // Mock socialQueue cho môi trường kiểm thử
  const mockFn = (val) => {
    try {
      return jest.fn().mockResolvedValue(val);
    } catch {
      return async () => val;
    }
  };
  socialQueue = {
    add: mockFn({ id: 'mock-social-job-id' }),
    remove: mockFn(true),
    getJob: mockFn(null),
    close: mockFn(true),
    client: { on: () => {} }
  };
}

module.exports = {
  socialQueue,
  SOCIAL_QUEUE_NAME
};
