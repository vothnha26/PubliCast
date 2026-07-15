jest.mock('../../src/repositories/workspace/post.repository', () => ({
  findById: jest.fn()
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

  it('skips publishing when the post is not found', async () => {
    postRepository.findById.mockResolvedValue(null);
    const job = { id: 'job-1', data: { postId: 'post-1' } };

    await expect(publishPostHandler.handle(job)).resolves.toBeUndefined();

    expect(postService.publishToPlatforms).not.toHaveBeenCalled();
  });

  it('skips publishing when the post status is not SCHEDULED/DRAFT/RETRYING', async () => {
    postRepository.findById.mockResolvedValue({ id: 'post-1', status: 'PUBLISHED' });
    const job = { id: 'job-1', data: { postId: 'post-1' } };

    await expect(publishPostHandler.handle(job)).resolves.toBeUndefined();

    expect(postService.publishToPlatforms).not.toHaveBeenCalled();
  });

  it('proceeds when the post status is RETRYING (retry job re-processing a previously failed post)', async () => {
    postRepository.findById.mockResolvedValue({ id: 'post-1', status: 'RETRYING' });
    postService.publishToPlatforms.mockResolvedValue(undefined);
    const job = { id: 'job-1', data: { postId: 'post-1' } };

    await expect(publishPostHandler.handle(job)).resolves.toBeUndefined();

    expect(postService.publishToPlatforms).toHaveBeenCalledWith('post-1', { retryPlatforms: undefined, partialRetryCount: undefined });
  });

  it('passes retryPlatforms and partialRetryCount through from job.data to the pipeline', async () => {
    postRepository.findById.mockResolvedValue({ id: 'post-1', status: 'RETRYING' });
    postService.publishToPlatforms.mockResolvedValue(undefined);
    const job = { id: 'job-1', data: { postId: 'post-1', retryPlatforms: ['INSTAGRAM'], partialRetryCount: 1 } };

    await publishPostHandler.handle(job);

    expect(postService.publishToPlatforms).toHaveBeenCalledWith('post-1', { retryPlatforms: ['INSTAGRAM'], partialRetryCount: 1 });
  });

  it('re-throws errors from the pipeline so BullMQ can retry the job', async () => {
    postRepository.findById.mockResolvedValue({ id: 'post-1', status: 'SCHEDULED' });
    const err = new Error('All platforms failed');
    postService.publishToPlatforms.mockRejectedValue(err);
    const job = { id: 'job-1', data: { postId: 'post-1' } };

    await expect(publishPostHandler.handle(job)).rejects.toThrow('All platforms failed');
  });
});
