const { Queue } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');

const { QUEUE_CONFIG } = require('../constants/video-publish.constants');
// Định nghĩa tên của hàng đợi xử lý video
const VIDEO_QUEUE_NAME = QUEUE_CONFIG.VIDEO.NAME;

/**
 * Main Video Processing Queue
 */
let videoQueue;

if (process.env.NODE_ENV !== 'test') {
  videoQueue = new Queue(VIDEO_QUEUE_NAME, {
    ...defaultConnection,
    defaultJobOptions: {
      attempts: 3, // Thử lại tối đa 3 lần nếu FFmpeg gặp lỗi bất ngờ
      backoff: {
        type: 'exponential',
        delay: 10000, // Chờ 10s trước khi thử lại
      },
      removeOnComplete: true, // Làm sạch Redis sau khi thành công
      removeOnFail: false, // Giữ lại job lỗi để debug và hỗ trợ retry
    },
    limiter: {
      max: 3, // Tối đa 3 job trim video được xử lý
      duration: 5000 // Trong chu kỳ mỗi 5 giây
    }
  });
} else {
  // Mock videoQueue cho môi trường test
  const mockFn = (val) => {
    try {
      return jest.fn().mockResolvedValue(val);
    } catch {
      return async () => val;
    }
  };
  videoQueue = {
    add: mockFn({ id: 'mock-job-id' }),
    remove: mockFn(true),
    getJob: mockFn(null),
    close: mockFn(true),
    client: { on: () => {} }
  };
}

module.exports = {
  videoQueue,
  VIDEO_QUEUE_NAME
};
