/**
 * Regression tests for #107 (I7): posts stuck at RETRYING because their
 * self-enqueued partial-retry job was lost (Redis restart, or a #106
 * active-job dedup skip) have nothing left to move them forward on their
 * own. publishReconcilerService sweeps them periodically and either
 * re-enqueues (using the persisted publishRetryCount) or marks FAILED once
 * MAX_PUBLISH_ATTEMPTS is exhausted.
 */
jest.mock('../../src/repositories/workspace/post.repository', () => ({
  findStaleRetrying: jest.fn(),
  update: jest.fn()
}));
jest.mock('../../src/queues/publish.queue', () => ({
  safeUpsertPublishJob: jest.fn()
}));

const postRepository = require('../../src/repositories/workspace/post.repository');
const { safeUpsertPublishJob } = require('../../src/queues/publish.queue');
const publishReconcilerService = require('../../src/services/workspace/post/publish-reconciler.service');
const { QUEUE_CONFIG } = require('../../src/constants/video-publish.constants');

describe('PublishReconcilerService.runOnce (#107 I7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-enqueues a stale RETRYING post that has not exhausted its attempts', async () => {
    postRepository.findStaleRetrying.mockResolvedValue([
      { id: 'post-1', publishRetryCount: 1 }
    ]);
    safeUpsertPublishJob.mockResolvedValue({ applied: true });

    const result = await publishReconcilerService.runOnce();

    expect(safeUpsertPublishJob).toHaveBeenCalledWith(
      'publish-post-post-1',
      QUEUE_CONFIG.PUBLISH.JOB_PUBLISH,
      { postId: 'post-1', partialRetryCount: 1 },
      { delay: 0 }
    );
    expect(postRepository.update).not.toHaveBeenCalledWith('post-1', { status: 'FAILED' });
    expect(result).toEqual({ swept: 1, reenqueued: 1, failed: 0 });
  });

  it('marks FAILED instead of re-enqueuing once publishRetryCount has exhausted MAX_PUBLISH_ATTEMPTS', async () => {
    postRepository.findStaleRetrying.mockResolvedValue([
      { id: 'post-1', publishRetryCount: QUEUE_CONFIG.PUBLISH.MAX_PUBLISH_ATTEMPTS }
    ]);

    const result = await publishReconcilerService.runOnce();

    expect(postRepository.update).toHaveBeenCalledWith('post-1', { status: 'FAILED' });
    expect(safeUpsertPublishJob).not.toHaveBeenCalled();
    expect(result).toEqual({ swept: 1, reenqueued: 0, failed: 1 });
  });

  it('does not count a skipped re-enqueue (job unexpectedly already active) as reenqueued', async () => {
    postRepository.findStaleRetrying.mockResolvedValue([
      { id: 'post-1', publishRetryCount: 0 }
    ]);
    safeUpsertPublishJob.mockResolvedValue({ applied: false });

    const result = await publishReconcilerService.runOnce();

    expect(result).toEqual({ swept: 1, reenqueued: 0, failed: 0 });
  });

  it('processes multiple stale posts independently, one failure does not block the rest', async () => {
    postRepository.findStaleRetrying.mockResolvedValue([
      { id: 'post-1', publishRetryCount: 0 },
      { id: 'post-2', publishRetryCount: 0 }
    ]);
    safeUpsertPublishJob
      .mockRejectedValueOnce(new Error('Redis unavailable'))
      .mockResolvedValueOnce({ applied: true });

    const result = await publishReconcilerService.runOnce();

    expect(result).toEqual({ swept: 2, reenqueued: 1, failed: 0 });
  });

  it('returns an empty summary when there is nothing stale to sweep', async () => {
    postRepository.findStaleRetrying.mockResolvedValue([]);

    const result = await publishReconcilerService.runOnce();

    expect(result).toEqual({ swept: 0, reenqueued: 0, failed: 0 });
    expect(safeUpsertPublishJob).not.toHaveBeenCalled();
  });
});
