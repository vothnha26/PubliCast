// Capture the handler registered via publishWorker.on('failed', handler) so tests
// can invoke it directly, without needing a real BullMQ/Redis connection.
const eventHandlers = {};

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn((event, handler) => {
      eventHandlers[event] = handler;
    })
  }))
}));

jest.mock('../../src/config/bullmq', () => ({ defaultConnection: {} }));
jest.mock('../../src/queues/publish.queue', () => ({ PUBLISH_QUEUE_NAME: 'social-publish-queue' }));
jest.mock('../../src/queues/handlers/publish-post.handler', () => ({ handle: jest.fn() }));
jest.mock('../../src/repositories/workspace/post.repository', () => ({ update: jest.fn() }));

describe('publish.worker on(\'failed\')', () => {
  let postRepository;
  let Worker;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require AFTER clearAllMocks/resetModules so this test's references to
    // postRepository/Worker point at the SAME mock instances the freshly
    // required publish.worker module closes over — otherwise eventHandlers.failed
    // (captured once, below) would invoke a stale postRepository.update from a
    // previous module load, and assertions against a newly required one would
    // never see the call.
    postRepository = require('../../src/repositories/workspace/post.repository');
    ({ Worker } = require('bullmq'));
    require('../../src/queues/publish.worker');
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('configures the Worker with a lockDuration long enough to cover slow gateway publishes', () => {
    const { QUEUE_CONFIG } = require('../../src/constants/video-publish.constants');
    const options = Worker.mock.calls[0][2];

    expect(options.lockDuration).toBe(QUEUE_CONFIG.PUBLISH.LOCK_DURATION_MS);
    expect(options.maxStalledCount).toBe(1);
  });

  it('marks the post FAILED once attemptsMade reaches the configured max', async () => {
    const job = { id: 'job-1', data: { postId: 'post-1' }, attemptsMade: 3, opts: { attempts: 3 } };

    await eventHandlers.failed(job, new Error('All platforms failed'));

    expect(postRepository.update).toHaveBeenCalledWith('post-1', { status: 'FAILED' });
  });

  it('does not touch the DB while attempts remain', async () => {
    const job = { id: 'job-1', data: { postId: 'post-1' }, attemptsMade: 1, opts: { attempts: 3 } };

    await eventHandlers.failed(job, new Error('Temporary failure'));

    expect(postRepository.update).not.toHaveBeenCalled();
  });

  describe('settings.backoffStrategy', () => {
    // Retrying an app-rate-limit failure within the default short backoff
    // just adds more requests against the same still-exhausted quota
    // (each publish attempt calls several Graph API endpoints), delaying
    // recovery instead of helping — this backoff must be much longer for
    // that specific error class.
    it('backs off for RATE_LIMIT_BACKOFF_MS on a Meta "(#4) Application request limit reached" error', () => {
      const { QUEUE_CONFIG } = require('../../src/constants/video-publish.constants');
      const options = Worker.mock.calls[0][2];
      const delay = options.settings.backoffStrategy(1, 'custom', new Error('(#4) Application request limit reached'));

      expect(delay).toBe(QUEUE_CONFIG.PUBLISH.RATE_LIMIT_BACKOFF_MS);
    });

    it('backs off for RATE_LIMIT_BACKOFF_MS on a generic "rate limit" error from any platform', () => {
      const { QUEUE_CONFIG } = require('../../src/constants/video-publish.constants');
      const options = Worker.mock.calls[0][2];
      const delay = options.settings.backoffStrategy(2, 'custom', new Error('TikTok rate limit exceeded'));

      expect(delay).toBe(QUEUE_CONFIG.PUBLISH.RATE_LIMIT_BACKOFF_MS);
    });

    it('falls back to exponential backoff for ordinary (non-rate-limit) errors', () => {
      const { QUEUE_CONFIG } = require('../../src/constants/video-publish.constants');
      const options = Worker.mock.calls[0][2];

      expect(options.settings.backoffStrategy(1, 'custom', new Error('Network timeout'))).toBe(QUEUE_CONFIG.PUBLISH.DEFAULT_BACKOFF_MS);
      expect(options.settings.backoffStrategy(2, 'custom', new Error('Network timeout'))).toBe(QUEUE_CONFIG.PUBLISH.DEFAULT_BACKOFF_MS * 2);
      expect(options.settings.backoffStrategy(3, 'custom', new Error('Network timeout'))).toBe(QUEUE_CONFIG.PUBLISH.DEFAULT_BACKOFF_MS * 4);
    });
  });
});
