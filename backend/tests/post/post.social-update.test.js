/**
 * Test Suite: POST Social Update/Delete Features
 * Tests: updatePost (PUBLISHED) + bulkDelete (deleteFromSocials)
 * Pattern: Strategy (mocking factory) + Isolation (no real DB/API calls)
 */
const postService = require('../../src/services/workspace/post.service');
const postRepository = require('../../src/repositories/workspace/post.repository');
const brandRepository = require('../../src/repositories/workspace/brand.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const { PLATFORMS, POST_STATUS } = require('../../src/utils/constants');
const outboxEventRepository = require('../../src/repositories/core/outbox-event.repository');
const { OUTBOX_EVENT_TYPES } = require('../../src/constants/outbox.constants');

// --- Mock all external dependencies ---
jest.mock('../../src/repositories/workspace/post.repository', () => ({
  findById: jest.fn(),
  update: jest.fn(),
  lockAndAssertFresh: jest.fn(),
  findManyByIdsAndBrand: jest.fn(),
  updateMany: jest.fn(),
  create: jest.fn(),
  findManyAndCount: jest.fn(),
  updateStatus: jest.fn(),
  deleteMany: jest.fn(),
  countActivePostsThisMonth: jest.fn()
}));

jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  findBrandWithSubscription: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  hasPermission: jest.fn()
}));

jest.mock('../../src/services/workspace/approval-workflow.service', () => ({
  createWorkflowRequest: jest.fn()
}));

jest.mock('../../src/queues/publish.queue', () => ({
  upsertPublishJob: jest.fn(),
  removePublishJob: jest.fn()
}));

jest.mock('../../src/repositories/core/outbox-event.repository', () => ({
  create: jest.fn()
}));

jest.mock('../../src/config/prisma', () => ({
  platformLimit: {
    findMany: jest.fn().mockResolvedValue([])
  },
  $transaction: jest.fn().mockImplementation((cb) => cb({}))
}));

// Mock the social platform factory
const mockFacebookService = {
  updatePublishedPost: jest.fn(),
  deletePost: jest.fn()
};
const mockYoutubeService = {
  deletePost: jest.fn()
};

jest.mock('../../src/services/social/social-platform.factory', () => ({
  getService: jest.fn()
}));
const socialPlatformFactory = require('../../src/services/social/social-platform.factory');

// --- Test Data ---
const BRAND_ID = 'brand-abc';
const USER_ID = 'user-111';
const POST_ID = 'post-published-123';

const publishedFacebookPost = {
  id: POST_ID,
  brandId: BRAND_ID,
  status: POST_STATUS.PUBLISHED,
  targetPlatforms: `${PLATFORMS.FACEBOOK}`,
  platformPostId: 'fb_post_xyz_987',
  title: 'Post đã xuất bản trên Facebook',
  caption: 'Nội dung gốc',
  creator: { name: 'Test User' }
};

const publishedYoutubePost = {
  id: 'post-youtube-999',
  brandId: BRAND_ID,
  status: POST_STATUS.PUBLISHED,
  targetPlatforms: `${PLATFORMS.YOUTUBE}`,
  platformPostId: 'yt_video_abc123',
  title: 'Video YouTube đã xuất bản',
  caption: '',
  mediaUrls: 'http://example.com/video.mp4',
  creator: { name: 'Test User' }
};

// =============================================================================
describe('POST_SOCIAL - updatePost trên nền tảng đã xuất bản (PUBLISHED)', () => {
  beforeEach(() => {
    brandRepository.findBrandWithSubscription.mockResolvedValue(null);
    postRepository.countActivePostsThisMonth.mockResolvedValue(0);
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('POST_SOCIAL_001 - updatePost trên Facebook (PUBLISHED)', () => {
    it('should call facebookService.updatePublishedPost and then update DB', async () => {
      postRepository.findById.mockResolvedValue(publishedFacebookPost);
      socialPlatformFactory.getService.mockReturnValue(mockFacebookService);
      mockFacebookService.updatePublishedPost.mockResolvedValue({ success: true });
      authorizationFacade.hasPermission.mockResolvedValue(true);
      postRepository.update.mockResolvedValue({
        ...publishedFacebookPost,
        caption: 'Nội dung đã cập nhật'
      });

      const result = await postService.updatePost(
        POST_ID,
        { caption: 'Nội dung đã cập nhật' },
        BRAND_ID,
        USER_ID
      );

      expect(socialPlatformFactory.getService).toHaveBeenCalledWith(PLATFORMS.FACEBOOK);
      expect(mockFacebookService.updatePublishedPost).toHaveBeenCalledWith(
        BRAND_ID,
        'fb_post_xyz_987',
        expect.objectContaining({ caption: 'Nội dung đã cập nhật' })
      );
      expect(postRepository.update).toHaveBeenCalled();
    });

    it('should still update DB even if Facebook API call fails (graceful degradation)', async () => {
      postRepository.findById.mockResolvedValue(publishedFacebookPost);
      socialPlatformFactory.getService.mockReturnValue(mockFacebookService);
      // Simulate Facebook API failure
      mockFacebookService.updatePublishedPost.mockRejectedValue(new Error('Facebook API error'));
      authorizationFacade.hasPermission.mockResolvedValue(true);
      postRepository.update.mockResolvedValue({ ...publishedFacebookPost, caption: 'Updated despite failure' });

      // Should NOT throw - error is caught internally and logged
      await expect(
        postService.updatePost(POST_ID, { caption: 'Updated despite failure' }, BRAND_ID, USER_ID)
      ).resolves.toBeDefined();

      expect(postRepository.update).toHaveBeenCalled();
    });

    it('should record a POST_DOMAIN_EVENT outbox row with statusChangedToPublished = false if post was already PUBLISHED', async () => {
      postRepository.findById.mockResolvedValue(publishedFacebookPost);
      socialPlatformFactory.getService.mockReturnValue(mockFacebookService);
      mockFacebookService.updatePublishedPost.mockResolvedValue({ success: true });
      authorizationFacade.hasPermission.mockResolvedValue(true);
      postRepository.update.mockResolvedValue({
        ...publishedFacebookPost,
        caption: 'Nội dung đã cập nhật'
      });

      await postService.updatePost(
        POST_ID,
        { caption: 'Nội dung đã cập nhật', status: 'PUBLISHED' },
        BRAND_ID,
        USER_ID
      );

      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT,
        POST_ID,
        expect.objectContaining({
          eventName: 'post.updated',
          eventArgs: expect.objectContaining({ statusChangedToPublished: false })
        }),
        {},
        expect.anything()
      );
    });

    it('should throw error if attempting to add media to a published text-only Facebook post', async () => {
      postRepository.findById.mockResolvedValue(publishedFacebookPost);
      authorizationFacade.hasPermission.mockResolvedValue(true);

      await expect(
        postService.updatePost(
          POST_ID,
          { caption: 'Nội dung đã cập nhật', mediaUrls: ['http://example.com/image.png'] },
          BRAND_ID,
          USER_ID
        )
      ).rejects.toThrow('[FACEBOOK] Facebook does not support updating/modifying media on an already published post.');

      expect(postRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if attempting to modify media on a published Facebook post that already has media', async () => {
      postRepository.findById.mockResolvedValue({
        ...publishedFacebookPost,
        mediaUrls: 'http://example.com/image1.png'
      });
      authorizationFacade.hasPermission.mockResolvedValue(true);

      await expect(
        postService.updatePost(
          POST_ID,
          { caption: 'Nội dung đã cập nhật', mediaUrls: ['http://example.com/image2.png'] },
          BRAND_ID,
          USER_ID
        )
      ).rejects.toThrow('[FACEBOOK] Facebook does not support updating/modifying media on an already published post.');

      expect(postRepository.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('POST_SOCIAL_003 - updatePost trên YouTube (PUBLISHED)', () => {
    it('should NOT throw error and update DB (database-only modifications for unsupported platforms)', async () => {
      const youtubePublishedPost = {
        ...publishedYoutubePost,
      };
      postRepository.findById.mockResolvedValue(youtubePublishedPost);
      authorizationFacade.hasPermission.mockResolvedValue(true);
      postRepository.update.mockResolvedValue({
        ...youtubePublishedPost,
        caption: 'New caption'
      });

      const result = await postService.updatePost(
        'post-youtube-999',
        { caption: 'New caption' },
        BRAND_ID,
        USER_ID
      );

      expect(socialPlatformFactory.getService).not.toHaveBeenCalled();
      expect(postRepository.update).toHaveBeenCalled();
      expect(result.caption).toBe('New caption');
    });
  });
});

// =============================================================================
describe('POST_SOCIAL - bulkDelete với deleteFromSocials = true', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('POST_SOCIAL_004 - bulkDelete xóa bài Facebook trên platform', () => {
    it('should call facebookService.deletePost for each published Facebook post', async () => {
      const posts = [
        { id: 'post-1', status: POST_STATUS.PUBLISHED, targetPlatforms: PLATFORMS.FACEBOOK, platformPostId: 'fb_111', autoListId: null },
        { id: 'post-2', status: POST_STATUS.DRAFT, targetPlatforms: PLATFORMS.FACEBOOK, platformPostId: null, autoListId: null }
      ];
      postRepository.findManyByIdsAndBrand.mockResolvedValue(posts);
      socialPlatformFactory.getService.mockReturnValue(mockFacebookService);
      mockFacebookService.deletePost.mockResolvedValue({ success: true });
      postRepository.deleteMany.mockResolvedValue({ count: 2 });

      await postService.bulkDelete(['post-1', 'post-2'], BRAND_ID, true);

      // Chỉ post-1 có status PUBLISHED và có platformPostId mới được gọi xóa
      expect(socialPlatformFactory.getService).toHaveBeenCalledWith(PLATFORMS.FACEBOOK);
      expect(mockFacebookService.deletePost).toHaveBeenCalledTimes(1);
      expect(mockFacebookService.deletePost).toHaveBeenCalledWith(BRAND_ID, 'fb_111');
      // Cả 2 bài đều bị xóa trong DB
      expect(postRepository.deleteMany).toHaveBeenCalledWith({
        id: { in: ['post-1', 'post-2'] },
        brandId: BRAND_ID
      }, expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  describe('POST_SOCIAL_005 - bulkDelete xóa bài YouTube trên platform', () => {
    it('should call youtubeService.deletePost for published YouTube post', async () => {
      const posts = [
        { id: 'post-yt-1', status: POST_STATUS.PUBLISHED, targetPlatforms: PLATFORMS.YOUTUBE, platformPostId: 'yt_video_xyz', autoListId: null }
      ];
      postRepository.findManyByIdsAndBrand.mockResolvedValue(posts);
      socialPlatformFactory.getService.mockReturnValue(mockYoutubeService);
      mockYoutubeService.deletePost.mockResolvedValue({ success: true });
      postRepository.deleteMany.mockResolvedValue({ count: 1 });

      await postService.bulkDelete(['post-yt-1'], BRAND_ID, true);

      expect(socialPlatformFactory.getService).toHaveBeenCalledWith(PLATFORMS.YOUTUBE);
      expect(mockYoutubeService.deletePost).toHaveBeenCalledWith(BRAND_ID, 'yt_video_xyz');
      expect(postRepository.deleteMany).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('POST_SOCIAL_006 - bulkDelete không xóa trên platform khi deleteFromSocials = false', () => {
    it('should NOT call any social service when deleteFromSocials is false', async () => {
      const posts = [
        { id: 'post-1', status: POST_STATUS.PUBLISHED, targetPlatforms: PLATFORMS.FACEBOOK, platformPostId: 'fb_111', autoListId: null }
      ];
      postRepository.findManyByIdsAndBrand.mockResolvedValue(posts);
      postRepository.deleteMany.mockResolvedValue({ count: 1 });

      // deleteFromSocials = false (default)
      await postService.bulkDelete(['post-1'], BRAND_ID, false);

      expect(socialPlatformFactory.getService).not.toHaveBeenCalled();
      expect(postRepository.deleteMany).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('POST_SOCIAL_007 - bulkDelete tiếp tục xóa DB nếu social API thất bại', () => {
    it('should still delete DB records even when Facebook API throws', async () => {
      const posts = [
        { id: 'post-fb-1', status: POST_STATUS.PUBLISHED, targetPlatforms: PLATFORMS.FACEBOOK, platformPostId: 'fb_msg_789', autoListId: null }
      ];
      postRepository.findManyByIdsAndBrand.mockResolvedValue(posts);
      socialPlatformFactory.getService.mockReturnValue(mockFacebookService);
      // Facebook API fails
      mockFacebookService.deletePost.mockRejectedValue(new Error('Facebook API error'));
      postRepository.deleteMany.mockResolvedValue({ count: 1 });

      // Should not throw - error is caught internally
      const count = await postService.bulkDelete(['post-fb-1'], BRAND_ID, true);

      expect(count).toBe(1);
      expect(postRepository.deleteMany).toHaveBeenCalledWith({
        id: { in: ['post-fb-1'] },
        brandId: BRAND_ID
      }, expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  describe('POST_SOCIAL_008 - bulkDelete với platformPostId dạng JSON map', () => {
    it('should parse platformPostId JSON map and call deletePost for each platform with its own ID', async () => {
      const platformMap = {
        [PLATFORMS.FACEBOOK]: 'fb_12345',
        [PLATFORMS.YOUTUBE]: 'yt_67890'
      };
      const posts = [
        { 
          id: 'post-multi-1', 
          status: POST_STATUS.PUBLISHED, 
          targetPlatforms: `${PLATFORMS.FACEBOOK}, ${PLATFORMS.YOUTUBE}`, 
          platformPostId: JSON.stringify(platformMap), 
          autoListId: null 
        }
      ];
      postRepository.findManyByIdsAndBrand.mockResolvedValue(posts);

      socialPlatformFactory.getService.mockImplementation((platform) => {
        if (platform === PLATFORMS.FACEBOOK) return mockFacebookService;
        if (platform === PLATFORMS.YOUTUBE) return mockYoutubeService;
        return null;
      });

      mockFacebookService.deletePost.mockResolvedValue({ success: true });
      mockYoutubeService.deletePost.mockResolvedValue({ success: true });
      postRepository.deleteMany.mockResolvedValue({ count: 1 });

      const count = await postService.bulkDelete(['post-multi-1'], BRAND_ID, true);

      expect(count).toBe(1);
      expect(mockFacebookService.deletePost).toHaveBeenCalledWith(BRAND_ID, 'fb_12345');
      expect(mockYoutubeService.deletePost).toHaveBeenCalledWith(BRAND_ID, 'yt_67890');
      expect(postRepository.deleteMany).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('POST_SOCIAL_009 - bulkDelete cho bài SCHEDULED', () => {
    it('should call facebookService.deletePost and record a POST_PUBLISH_REMOVE outbox row for scheduled Facebook post', async () => {
      const posts = [
        { id: 'post-sched-1', status: POST_STATUS.SCHEDULED, targetPlatforms: PLATFORMS.FACEBOOK, platformPostId: 'fb_sched_111', autoListId: null }
      ];
      postRepository.findManyByIdsAndBrand.mockResolvedValue(posts);
      socialPlatformFactory.getService.mockReturnValue(mockFacebookService);
      mockFacebookService.deletePost.mockResolvedValue({ success: true });
      postRepository.deleteMany.mockResolvedValue({ count: 1 });

      await postService.bulkDelete(['post-sched-1'], BRAND_ID, true);

      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.POST_PUBLISH_REMOVE,
        'post-sched-1',
        { postId: 'post-sched-1' },
        {},
        expect.anything()
      );
      expect(mockFacebookService.deletePost).toHaveBeenCalledWith(BRAND_ID, 'fb_sched_111');
      expect(postRepository.deleteMany).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('POST_SOCIAL_010 - updatePost hủy đặt lịch (SCHEDULED -> DRAFT)', () => {
    it('should delete post on platform and remove platformPostId in DB', async () => {
      const scheduledPost = {
        id: 'post-sched-2',
        brandId: BRAND_ID,
        status: POST_STATUS.SCHEDULED,
        targetPlatforms: PLATFORMS.FACEBOOK,
        platformPostId: 'fb_sched_222',
        creator: { name: 'Test User' }
      };

      postRepository.findById.mockResolvedValue(scheduledPost);
      socialPlatformFactory.getService.mockReturnValue(mockFacebookService);
      mockFacebookService.deletePost.mockResolvedValue({ success: true });
      authorizationFacade.hasPermission.mockResolvedValue(true);
      postRepository.update.mockResolvedValue({
        ...scheduledPost,
        status: POST_STATUS.DRAFT,
        platformPostId: null
      });

      await postService.updatePost('post-sched-2', { status: POST_STATUS.DRAFT }, BRAND_ID, USER_ID);

      expect(mockFacebookService.deletePost).toHaveBeenCalledWith(BRAND_ID, 'fb_sched_222');
      // verifies update is called with clean platformPostId
      expect(postRepository.update).toHaveBeenCalledWith('post-sched-2', expect.objectContaining({ platformPostId: null }));
    });
  });
});
