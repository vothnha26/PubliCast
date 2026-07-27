jest.mock('../../src/repositories/workspace/post.repository', () => ({
  claimForPublishing: jest.fn(),
  updateMany: jest.fn()
}));
jest.mock('../../src/services/workspace/post.service', () => ({
  publishToPlatforms: jest.fn()
}));

const postRepository = require('../../src/repositories/workspace/post.repository');
const postService = require('../../src/services/workspace/post.service');
const publishPostHandler = require('../../src/queues/handlers/publish-post.handler');

describe('PublishPostHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // #54: the handler now claims the post via an atomic compare-and-swap
  // (status -> PUBLISHING) instead of a plain findById + status check, so a
  // losing claim (post not found / wrong status / already being published by
  // a concurrent job) is what "skip" means now.
  it('skips publishing when the claim is lost (post not found or already claimed)', async () => {
    postRepository.claimForPublishing.mockResolvedValue(false);
    const job = { id: 'job-1', data: { postId: 'post-1' } };

    await expect(publishPostHandler.handle(job)).resolves.toBeUndefined();

    expect(postService.publishToPlatforms).not.toHaveBeenCalled();
  });

  it('skips publishing when the post status is not SCHEDULED/DRAFT/RETRYING', async () => {
    postRepository.claimForPublishing.mockResolvedValue(false);
    const job = { id: 'job-1', data: { postId: 'post-1' } };

    await expect(publishPostHandler.handle(job)).resolves.toBeUndefined();

    expect(postRepository.claimForPublishing).toHaveBeenCalledWith('post-1', ['SCHEDULED', 'DRAFT', 'RETRYING']);
    expect(postService.publishToPlatforms).not.toHaveBeenCalled();
  });

  it('proceeds when the claim succeeds (post was RETRYING and this job won the claim)', async () => {
    postRepository.claimForPublishing.mockResolvedValue(true);
    postService.publishToPlatforms.mockResolvedValue(undefined);
    const job = { id: 'job-1', data: { postId: 'post-1' } };

    await expect(publishPostHandler.handle(job)).resolves.toBeUndefined();

    expect(postService.publishToPlatforms).toHaveBeenCalledWith('post-1', { retryPlatforms: undefined, partialRetryCount: undefined });
  });

  it('passes retryPlatforms and partialRetryCount through from job.data to the pipeline', async () => {
    postRepository.claimForPublishing.mockResolvedValue(true);
    postService.publishToPlatforms.mockResolvedValue(undefined);
    const job = { id: 'job-1', data: { postId: 'post-1', retryPlatforms: ['INSTAGRAM'], partialRetryCount: 1 } };

    await publishPostHandler.handle(job);

    expect(postService.publishToPlatforms).toHaveBeenCalledWith('post-1', { retryPlatforms: ['INSTAGRAM'], partialRetryCount: 1 });
  });

  it('re-throws errors from the pipeline so BullMQ can retry the job, and resets the stuck PUBLISHING status', async () => {
    postRepository.claimForPublishing.mockResolvedValue(true);
    postRepository.updateMany.mockResolvedValue({ count: 1 });
    const err = new Error('All platforms failed');
    postService.publishToPlatforms.mockRejectedValue(err);
    const job = { id: 'job-1', data: { postId: 'post-1' } };

    await expect(publishPostHandler.handle(job)).rejects.toThrow('All platforms failed');

    expect(postRepository.updateMany).toHaveBeenCalledWith(
      { id: 'post-1', status: 'PUBLISHING' },
      { status: 'RETRYING' }
    );
  });
});
