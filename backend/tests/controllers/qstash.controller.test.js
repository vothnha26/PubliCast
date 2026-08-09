/**
 * Tests for handlePublishPost/handlePublishPostFailed in qstash.controller.js
 * — replaces publish-post.handler.test.js (BullMQ handler) and
 * publish.worker.test.js's on('failed') coverage (the QStash equivalent is
 * the failureCallback-driven handlePublishPostFailed, not a job event).
 */
jest.mock('../../src/repositories/workspace/post.repository', () => ({
  claimForPublishing: jest.fn(),
  updateMany: jest.fn(),
  update: jest.fn()
}));
jest.mock('../../src/services/workspace/post.service', () => ({
  publishToPlatforms: jest.fn()
}));
jest.mock('../../src/services/social/social-platform.factory');
jest.mock('../../src/repositories/social/social-account.repository', () => ({
  updateSyncStatus: jest.fn(),
  updateLastSyncAt: jest.fn(),
  updateLastPostsSyncAt: jest.fn(),
  findById: jest.fn()
}));
const postRepository = require('../../src/repositories/workspace/post.repository');
const postService = require('../../src/services/workspace/post.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const socialPlatformFactory = require('../../src/services/social/social-platform.factory');
const { handlePublishPost, handlePublishPostFailed, handlePostsSync } = require('../../src/controllers/webhooks/qstash.controller');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('handlePublishPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // #54: claims the post via an atomic compare-and-swap (status -> PUBLISHING)
  // instead of a plain findById + status check — a losing claim (post not
  // found / wrong status / already being published by a concurrent delivery)
  // is what "skip" means. This is the real guard against double-publish now
  // that QStash has no BullMQ-style "job is active" check to lean on.
  it('skips publishing when the claim is lost (post not found or already claimed)', async () => {
    postRepository.claimForPublishing.mockResolvedValue(false);
    const req = { body: { postId: 'post-1' } };
    const res = mockRes();

    await handlePublishPost(req, res);

    expect(postService.publishToPlatforms).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ skipped: true }));
  });

  it('calls claimForPublishing with the valid source statuses', async () => {
    postRepository.claimForPublishing.mockResolvedValue(false);
    const req = { body: { postId: 'post-1' } };

    await handlePublishPost(req, mockRes());

    expect(postRepository.claimForPublishing).toHaveBeenCalledWith('post-1', ['SCHEDULED', 'DRAFT', 'RETRYING']);
  });

  it('proceeds and returns 200 when the claim succeeds', async () => {
    postRepository.claimForPublishing.mockResolvedValue(true);
    postService.publishToPlatforms.mockResolvedValue(undefined);
    const req = { body: { postId: 'post-1' } };
    const res = mockRes();

    await handlePublishPost(req, res);

    expect(postService.publishToPlatforms).toHaveBeenCalledWith('post-1', { retryTargets: undefined, retryPlatforms: undefined, partialRetryCount: undefined });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('passes retryTargets/retryPlatforms/partialRetryCount through from the request body', async () => {
    postRepository.claimForPublishing.mockResolvedValue(true);
    postService.publishToPlatforms.mockResolvedValue(undefined);
    const req = { body: { postId: 'post-1', retryTargets: [{ platform: 'INSTAGRAM' }], partialRetryCount: 1 } };

    await handlePublishPost(req, mockRes());

    expect(postService.publishToPlatforms).toHaveBeenCalledWith('post-1', {
      retryTargets: [{ platform: 'INSTAGRAM' }],
      retryPlatforms: undefined,
      partialRetryCount: 1
    });
  });

  it('returns 500 and resets the stuck PUBLISHING status when the pipeline throws', async () => {
    postRepository.claimForPublishing.mockResolvedValue(true);
    postRepository.updateMany.mockResolvedValue({ count: 1 });
    postService.publishToPlatforms.mockRejectedValue(new Error('All platforms failed'));
    const req = { body: { postId: 'post-1' } };
    const res = mockRes();

    await handlePublishPost(req, res);

    expect(postRepository.updateMany).toHaveBeenCalledWith(
      { id: 'post-1', status: 'PUBLISHING' },
      { status: 'RETRYING' }
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('handlePostsSync', () => {
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = { syncPublishedPosts: jest.fn() };
    socialPlatformFactory.getService.mockReturnValue(mockService);
  });

  it('dispatches via socialPlatformFactory and stamps lastPostsSyncAt on success', async () => {
    mockService.syncPublishedPosts.mockResolvedValue({ synced: 3 });
    socialAccountRepository.updateLastPostsSyncAt.mockResolvedValue(undefined);
    const req = { body: { socialAccountId: 'acc-1', platform: 'YOUTUBE', brandId: 'brand-1' } };
    const res = mockRes();

    await handlePostsSync(req, res);

    expect(socialPlatformFactory.getService).toHaveBeenCalledWith('YOUTUBE');
    expect(mockService.syncPublishedPosts).toHaveBeenCalledWith('brand-1', 'acc-1');
    expect(socialAccountRepository.updateLastPostsSyncAt).toHaveBeenCalledWith('acc-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('returns 500 and does not stamp lastPostsSyncAt when the sync throws', async () => {
    mockService.syncPublishedPosts.mockRejectedValue(new Error('Platform API down'));
    const req = { body: { socialAccountId: 'acc-1', platform: 'FACEBOOK', brandId: 'brand-1' } };
    const res = mockRes();

    await handlePostsSync(req, res);

    expect(socialAccountRepository.updateLastPostsSyncAt).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe('handlePublishPostFailed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const encodeSourceBody = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');

  it('marks the post FAILED once QStash reports retries exhausted', async () => {
    const req = {
      body: {
        sourceBody: encodeSourceBody({ postId: 'post-1' }),
        retried: 3,
        maxRetries: 3
      }
    };
    const res = mockRes();

    await handlePublishPostFailed(req, res);

    expect(postRepository.update).toHaveBeenCalledWith('post-1', { status: 'FAILED' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does not touch the DB when sourceBody has no postId', async () => {
    const req = { body: { sourceBody: encodeSourceBody({}) } };

    await handlePublishPostFailed(req, mockRes());

    expect(postRepository.update).not.toHaveBeenCalled();
  });

  it('still responds 200 if updating the post fails, to avoid infinite failure-callback redelivery', async () => {
    const req = { body: { sourceBody: encodeSourceBody({ postId: 'post-1' }) } };
    postRepository.update.mockRejectedValue(new Error('DB unavailable'));
    const res = mockRes();

    await handlePublishPostFailed(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
