/**
 * Regression test for #108 I9: terminal-attempt handling (marking the trim
 * task FAILED in Redis + notifying the user) moved from inside
 * trim-video.handler.js (racy vs. BullMQ's own attemptsMade bookkeeping) to
 * video.worker.js's 'failed' listener, mirroring the publish.worker.js
 * convention — only the Worker's 'failed' event is guaranteed to fire once
 * per attempt with the final, authoritative attempt count.
 */
const eventHandlers = {};

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn((event, handler) => {
      eventHandlers[event] = handler;
    })
  }))
}));

jest.mock('../../src/config/bullmq', () => ({ defaultConnection: {} }));
jest.mock('../../src/queues/video.queue', () => ({ VIDEO_QUEUE_NAME: 'video-processing-queue' }));
jest.mock('../../src/queues/handlers/trim-video.handler', () => ({ handle: jest.fn() }));
jest.mock('../../src/services/workspace/socket/socket.manager', () => ({ emitToUser: jest.fn() }));
jest.mock('../../src/config/redis', () => ({ set: jest.fn().mockResolvedValue('OK') }));

describe("video.worker on('failed')", () => {
  let socketManager;
  let redisClient;

  beforeEach(() => {
    jest.clearAllMocks();
    socketManager = require('../../src/services/workspace/socket/socket.manager');
    redisClient = require('../../src/config/redis');
    require('../../src/queues/video.worker');
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('marks the task FAILED in Redis and notifies the user once attemptsMade reaches the max', async () => {
    const job = {
      id: 'job-1',
      data: { userId: 'user-1', videoUrl: 'http://example.com/v.mp4' },
      attemptsMade: 3,
      opts: { attempts: 3 }
    };

    await eventHandlers.failed(job, new Error('Render failed'));

    expect(redisClient.set).toHaveBeenCalledWith(
      expect.stringContaining('job-1'),
      expect.stringContaining('"status":"FAILED"'),
      { EX: 86400 }
    );
    expect(socketManager.emitToUser).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
      expect.objectContaining({ taskId: 'job-1', error: 'Render failed' })
    );
  });

  it('does not mark FAILED or notify while attempts remain', async () => {
    const job = {
      id: 'job-1',
      data: { userId: 'user-1', videoUrl: 'http://example.com/v.mp4' },
      attemptsMade: 1,
      opts: { attempts: 3 }
    };

    await eventHandlers.failed(job, new Error('Transient failure'));

    expect(redisClient.set).not.toHaveBeenCalled();
    expect(socketManager.emitToUser).not.toHaveBeenCalled();
  });
});
