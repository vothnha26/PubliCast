const UpdatePostStatusStep = require('../../src/services/workspace/post/publish-steps/update-db.step');
const { PublishFailedError } = UpdatePostStatusStep;

jest.mock('../../src/repositories/workspace/post.repository', () => ({
  update: jest.fn(),
  create: jest.fn()
}));
jest.mock('../../src/repositories/workspace/auto-list.repository', () => ({
  findById: jest.fn(),
  update: jest.fn(),
  updateStats: jest.fn()
}));
jest.mock('../../src/services/workspace/auto-list.service', () => ({
  updateLastPostedAt: jest.fn().mockResolvedValue(undefined),
  recalculateQueueSchedules: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../src/services/core/notification.service', () => ({
  create: jest.fn().mockResolvedValue({})
}));
jest.mock('../../src/queues/publish.queue', () => ({
  publishQueue: { remove: jest.fn(), add: jest.fn() }
}));

const postRepository = require('../../src/repositories/workspace/post.repository');
const autoListRepository = require('../../src/repositories/workspace/auto-list.repository');
const autoListService = require('../../src/services/workspace/auto-list.service');
const { publishQueue } = require('../../src/queues/publish.queue');

describe('UpdatePostStatusStep', () => {
  let step;
  const post = { id: 'post-1', autoListId: null, createdByUserId: 'user-1', brandId: 'brand-1', title: 'Test Post' };

  beforeEach(() => {
    jest.clearAllMocks();
    step = new UpdatePostStatusStep();
    autoListRepository.findById.mockResolvedValue(null);
  });

  it('marks PUBLISHED and does not throw when all platforms succeed', async () => {
    const context = {
      post,
      results: [
        { platform: 'FACEBOOK', success: true, result: { id: 'fb-1', publishedAt: new Date() } },
        { platform: 'INSTAGRAM', success: true, result: { id: 'ig-1' } }
      ],
      options: {}
    };

    await expect(step.execute(context)).resolves.toBeUndefined();

    expect(postRepository.update).toHaveBeenCalledWith('post-1', expect.objectContaining({ status: 'PUBLISHED' }));
    expect(publishQueue.add).not.toHaveBeenCalled();
  });

  it('marks RETRYING and throws PublishFailedError when all platforms fail', async () => {
    const context = {
      post,
      results: [
        { platform: 'FACEBOOK', success: false, error: 'Token expired' },
        { platform: 'INSTAGRAM', success: false, error: 'Rate limited' }
      ],
      options: {}
    };

    await expect(step.execute(context)).rejects.toThrow(PublishFailedError);

    expect(postRepository.update).toHaveBeenCalledWith('post-1', expect.objectContaining({ status: 'RETRYING' }));
    expect(publishQueue.add).not.toHaveBeenCalled();
    expect(publishQueue.remove).not.toHaveBeenCalled();
  });

  it('marks RETRYING, does not throw, and enqueues a scoped retry job on partial failure', async () => {
    const context = {
      post,
      results: [
        { platform: 'FACEBOOK', success: true, result: { id: 'fb-1' } },
        { platform: 'INSTAGRAM', success: false, error: 'Rate limited' }
      ],
      options: {}
    };

    await expect(step.execute(context)).resolves.toBeUndefined();

    expect(postRepository.update).toHaveBeenCalledWith('post-1', expect.objectContaining({ status: 'RETRYING' }));
    expect(publishQueue.remove).toHaveBeenCalledWith('publish-post-post-1');
    expect(publishQueue.add).toHaveBeenCalledWith(
      'publish-post',
      { postId: 'post-1', retryPlatforms: ['INSTAGRAM'], partialRetryCount: 1 },
      { jobId: 'publish-post-post-1', delay: 5000 }
    );
  });

  it('marks FAILED (not RETRYING) and does not enqueue once partialRetryCount reaches the max', async () => {
    const context = {
      post,
      results: [
        { platform: 'FACEBOOK', success: true, result: { id: 'fb-1' } },
        { platform: 'INSTAGRAM', success: false, error: 'Rate limited' }
      ],
      options: { partialRetryCount: 3 }
    };

    await expect(step.execute(context)).resolves.toBeUndefined();

    // First update (inside execute) sets RETRYING; the second (in
    // _enqueuePartialRetry's exhausted branch) overwrites it to FAILED.
    expect(postRepository.update).toHaveBeenCalledWith('post-1', { status: 'FAILED' });
    expect(publishQueue.add).not.toHaveBeenCalled();
  });

  it('loop mode (shouldLoop) never throws or enqueues a retry, keeping its own snapshot-and-recycle behavior', async () => {
    const loopPost = { ...post, autoListId: 'list-1' };
    autoListRepository.findById.mockResolvedValue({ id: 'list-1', loopEnabled: true });

    const context = {
      post: loopPost,
      results: [{ platform: 'FACEBOOK', success: false, error: 'Token expired' }],
      options: {}
    };

    // Loop mode is exempt from the new BullMQ throw/partial-retry logic — it
    // keeps its existing snapshot-and-recycle behavior unchanged and never throws.
    await expect(step.execute(context)).resolves.toBeUndefined();

    // Snapshot record created with FAILED status.
    expect(postRepository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED' }));
    // Original post recycled back to DRAFT, not left at RETRYING/FAILED.
    expect(postRepository.update).toHaveBeenCalledWith('post-1', expect.objectContaining({ status: 'DRAFT' }));
    expect(publishQueue.add).not.toHaveBeenCalled();
  });

  it('does not let AutoList sync failure (e.g. deleted mid-publish) break the post status update', async () => {
    const autoListPost = { ...post, autoListId: 'list-1' };
    autoListService.updateLastPostedAt.mockRejectedValue(Object.assign(new Error('Record not found'), { code: 'P2025' }));

    const context = {
      post: autoListPost,
      results: [
        { platform: 'FACEBOOK', success: true, result: { id: 'fb-1', publishedAt: new Date() } }
      ],
      options: {}
    };

    await expect(step.execute(context)).resolves.toBeUndefined();

    expect(postRepository.update).toHaveBeenCalledWith('post-1', expect.objectContaining({ status: 'PUBLISHED' }));
  });

  it('swallows AutoList sync failure on the RETRYING branch too, still enqueuing the partial retry', async () => {
    const autoListPost = { ...post, autoListId: 'list-1' };
    autoListService.recalculateQueueSchedules.mockRejectedValue(new Error('DB unavailable'));

    const context = {
      post: autoListPost,
      results: [
        { platform: 'FACEBOOK', success: true, result: { id: 'fb-1' } },
        { platform: 'INSTAGRAM', success: false, error: 'Rate limited' }
      ],
      options: {}
    };

    await expect(step.execute(context)).resolves.toBeUndefined();

    expect(publishQueue.add).toHaveBeenCalled();
  });
});
