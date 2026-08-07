/**
 * Regression tests for #107 (I7): posts stuck at RETRYING because their
 * self-published partial-retry QStash message was lost have nothing left to
 * move them forward on their own. publishReconcilerService sweeps them
 * periodically and either re-publishes a delivery (using the persisted
 * publishRetryCount) or marks FAILED once MAX_PUBLISH_ATTEMPTS is exhausted.
 */
jest.mock('../../src/repositories/workspace/post.repository', () => ({
  findStaleRetrying: jest.fn(),
  update: jest.fn()
}));
jest.mock('../../src/services/workspace/post/publish-qstash.service', () => ({
  enqueueImmediate: jest.fn()
}));

const postRepository = require('../../src/repositories/workspace/post.repository');
const { enqueueImmediate } = require('../../src/services/workspace/post/publish-qstash.service');
const publishReconcilerService = require('../../src/services/workspace/post/publish-reconciler.service');
const { QUEUE_CONFIG } = require('../../src/constants/video-publish.constants');

describe('PublishReconcilerService.runOnce (#107 I7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-publishes a delivery for a stale RETRYING post that has not exhausted its attempts', async () => {
    postRepository.findStaleRetrying.mockResolvedValue([
      { id: 'post-1', publishRetryCount: 1 }
    ]);
    enqueueImmediate.mockResolvedValue('msg-new');

    const result = await publishReconcilerService.runOnce();

    expect(enqueueImmediate).toHaveBeenCalledWith('post-1', { partialRetryCount: 1 });
    expect(postRepository.update).not.toHaveBeenCalledWith('post-1', { status: 'FAILED' });
    expect(result).toEqual({ swept: 1, reenqueued: 1, failed: 0 });
  });

  it('marks FAILED instead of re-publishing once publishRetryCount has exhausted MAX_PUBLISH_ATTEMPTS', async () => {
    postRepository.findStaleRetrying.mockResolvedValue([
      { id: 'post-1', publishRetryCount: QUEUE_CONFIG.PUBLISH.MAX_PUBLISH_ATTEMPTS }
    ]);

    const result = await publishReconcilerService.runOnce();

    expect(postRepository.update).toHaveBeenCalledWith('post-1', { status: 'FAILED' });
    expect(enqueueImmediate).not.toHaveBeenCalled();
    expect(result).toEqual({ swept: 1, reenqueued: 0, failed: 1 });
  });

  it('processes multiple stale posts independently, one failure does not block the rest', async () => {
    postRepository.findStaleRetrying.mockResolvedValue([
      { id: 'post-1', publishRetryCount: 0 },
      { id: 'post-2', publishRetryCount: 0 }
    ]);
    enqueueImmediate
      .mockRejectedValueOnce(new Error('QStash unavailable'))
      .mockResolvedValueOnce('msg-new');

    const result = await publishReconcilerService.runOnce();

    expect(result).toEqual({ swept: 2, reenqueued: 1, failed: 0 });
  });

  it('returns an empty summary when there is nothing stale to sweep', async () => {
    postRepository.findStaleRetrying.mockResolvedValue([]);

    const result = await publishReconcilerService.runOnce();

    expect(result).toEqual({ swept: 0, reenqueued: 0, failed: 0 });
    expect(enqueueImmediate).not.toHaveBeenCalled();
  });
});
