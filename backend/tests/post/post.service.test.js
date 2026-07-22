const postService = require('../../src/services/workspace/post.service');
const postRepository = require('../../src/repositories/workspace/post.repository');
const brandRepository = require('../../src/repositories/workspace/brand.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const approvalWorkflowService = require('../../src/services/workspace/approval-workflow.service');
const { upsertPublishJob, removePublishJob } = require('../../src/queues/publish.queue');
const outboxEventRepository = require('../../src/repositories/core/outbox-event.repository');
const { OUTBOX_EVENT_TYPES } = require('../../src/constants/outbox.constants');
const { POST_STATUS } = require('../../src/utils/constants');

jest.mock('../../src/repositories/workspace/post.repository', () => ({
  findManyAndCount: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  lockAndAssertFresh: jest.fn(),
  findManyByIdsAndBrand: jest.fn(),
  updateMany: jest.fn(),
  deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
  countActivePostsThisMonth: jest.fn()
}));

jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  findBrandWithSubscription: jest.fn()
}));

jest.mock('../../src/repositories/billing/subscription.repository', () => ({
  lockSubscriptionForUpdate: jest.fn().mockResolvedValue(undefined)
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
  postAnalyticsDailySnapshot: {
    findMany: jest.fn()
  },
  platformLimit: {
    findMany: jest.fn().mockResolvedValue([])
  },
  $transaction: jest.fn().mockImplementation((cb) => cb({}))
}));

jest.mock('../../src/services/social/social-platform.factory', () => {
  const mockYouTubeService = {
    publishPost: jest.fn().mockResolvedValue({ platformVideoId: 'ytVideoIdMock' })
  };
  return {
    getService: jest.fn().mockImplementation((platform) => {
      if (platform === 'YOUTUBE') return mockYouTubeService;
      return null;
    })
  };
});

describe('PostService Unit Tests', () => {
  beforeEach(() => {
    brandRepository.findBrandWithSubscription.mockResolvedValue(null);
    postRepository.countActivePostsThisMonth.mockResolvedValue(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPostData = {
    id: 'post-123',
    title: 'Học lập trình NodeJS',
    caption: 'NodeJS cơ bản đến nâng cao cùng PubliCast',
    status: 'DRAFT',
    targetPlatforms: 'FACEBOOK,YOUTUBE',
    mediaUrls: 'https://cloudinary.com/image1.png',
    mediaThumbnailUrls: 'https://cloudinary.com/image1_thumb.png',
    scheduledAt: null,
    publishedAt: null,
    createdAt: new Date(),
    deletedAt: null,
    creator: { name: 'Thanh Nha' },
    altText: 'NodeJS tutorial banner'
  };

  describe('POST_001 - getPosts (Pagination, Sorting & Filters)', () => {
    it('should query repository with mapped filters and pagination parameters', async () => {
      postRepository.findManyAndCount.mockResolvedValue({
        posts: [mockPostData],
        total: 1
      });

      const queryParams = { page: 2, limit: 5, sortBy: 'scheduledAt', sortOrder: 'asc' };
      const brandId = 'brand-abc';
      const result = await postService.getPosts(queryParams, brandId);

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(1);
      expect(postRepository.findManyAndCount).toHaveBeenCalledWith(
        expect.any(Object),
        {
          skip: 5,
          take: 5,
          orderBy: { scheduledAt: 'asc' }
        }
      );
    });
  });

  describe('POST_002 - createPost (DRAFT status)', () => {
    it('should save post directly as DRAFT without permission checking', async () => {
      const newPostInput = {
        title: 'New Draft Post',
        caption: 'Draft caption',
        status: 'DRAFT',
        targetPlatforms: ['FACEBOOK']
      };

      postRepository.create.mockResolvedValue({
        ...mockPostData,
        title: 'New Draft Post',
        caption: 'Draft caption',
        status: 'DRAFT',
        targetPlatforms: 'FACEBOOK'
      });

      const result = await postService.createPost(newPostInput, 'user-111', 'brand-abc');

      expect(result.status).toBe('draft');
      expect(postRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Draft Post',
        status: 'DRAFT',
        targetPlatforms: 'FACEBOOK'
      }), expect.anything());
      expect(authorizationFacade.hasPermission).not.toHaveBeenCalled();
      expect(approvalWorkflowService.createWorkflowRequest).not.toHaveBeenCalled();
    });

    it('should not write any outbox row if postRepository.create fails inside the transaction', async () => {
      const scheduleTime = new Date(Date.now() + 3600000);
      postRepository.create.mockRejectedValue(new Error('DB write failed'));

      await expect(
        postService.createPost(
          { title: 'Will fail', status: 'SCHEDULED', scheduledAt: scheduleTime.toISOString() },
          'user-111',
          'brand-abc'
        )
      ).rejects.toThrow('DB write failed');

      // Cả outbox lẫn create đều nằm trong cùng prisma.$transaction callback — nếu
      // create throw, callback dừng ngay và không có outbox row nào được ghi (đúng
      // atomic: rollback đồng thời cả post lẫn outbox).
      expect(outboxEventRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('POST_003 - createPost (PENDING_APPROVAL fallback)', () => {
    it('should force status to PENDING_APPROVAL and initiate workflow request if user lacks permission', async () => {
      const schedulePostInput = {
        title: 'Direct Schedule Post',
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        reviewerIds: ['reviewer-999'],
        requesterNote: 'Phê duyệt gấp bài viết'
      };

      authorizationFacade.hasPermission.mockResolvedValue(false); // User lacks permission
      postRepository.create.mockResolvedValue({
        ...mockPostData,
        title: 'Direct Schedule Post',
        status: 'PENDING_APPROVAL'
      });

      const result = await postService.createPost(schedulePostInput, 'user-111', 'brand-abc');

      expect(result.status).toBe('pending_approval');
      expect(authorizationFacade.hasPermission).toHaveBeenCalledWith('user-111', 'brand-abc', 'APPROVE_POSTS');
      expect(approvalWorkflowService.createWorkflowRequest).toHaveBeenCalledWith(
        'post-123',
        'user-111',
        'brand-abc',
        ['reviewer-999'],
        'AT_LEAST_ONE',
        'Phê duyệt gấp bài viết'
      );
      expect(outboxEventRepository.create).not.toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.POST_PUBLISH_UPSERT,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('POST_004 - createPost (SCHEDULED success)', () => {
    it('should allow SCHEDULED status and register BullMQ job if user has permission', async () => {
      const scheduleTime = new Date(Date.now() + 3600000);
      const schedulePostInput = {
        title: 'Authorized Schedule Post',
        status: 'SCHEDULED',
        scheduledAt: scheduleTime.toISOString()
      };

      authorizationFacade.hasPermission.mockResolvedValue(true); // Authorized
      postRepository.create.mockResolvedValue({
        ...mockPostData,
        id: 'post-999',
        title: 'Authorized Schedule Post',
        status: 'SCHEDULED',
        scheduledAt: scheduleTime
      });

      const result = await postService.createPost(schedulePostInput, 'user-111', 'brand-abc');

      expect(result.status).toBe('scheduled');
      expect(authorizationFacade.hasPermission).toHaveBeenCalledWith('user-111', 'brand-abc', 'APPROVE_POSTS');
      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.POST_PUBLISH_UPSERT,
        'post-999',
        { postId: 'post-999', scheduledAt: scheduleTime },
        {},
        expect.anything()
      );
      expect(approvalWorkflowService.createWorkflowRequest).not.toHaveBeenCalled();
    });
  });

  describe('POST_005 - updatePost (General Update)', () => {
    it('should update draft post content successfully', async () => {
      postRepository.findById.mockResolvedValue({
        id: 'post-123',
        brandId: 'brand-abc',
        status: 'DRAFT'
      });

      postRepository.update.mockResolvedValue({
        ...mockPostData,
        title: 'Updated Title'
      });

      const result = await postService.updatePost('post-123', { title: 'Updated Title' }, 'brand-abc', 'user-111');

      expect(result.title).toBe('Updated Title');
      expect(postRepository.update).toHaveBeenCalledWith('post-123', expect.objectContaining({
        title: 'Updated Title'
      }), expect.anything());
    });

    it('should lock the row and check staleness before writing (inside the transaction, before update)', async () => {
      const snapshotUpdatedAt = new Date('2026-01-01T00:00:00Z');
      postRepository.findById.mockResolvedValue({
        id: 'post-123',
        brandId: 'brand-abc',
        status: 'DRAFT',
        updatedAt: snapshotUpdatedAt
      });
      postRepository.update.mockResolvedValue({ ...mockPostData, title: 'Updated Title' });

      const callOrder = [];
      postRepository.lockAndAssertFresh.mockImplementation(async () => { callOrder.push('lock'); });
      postRepository.update.mockImplementation(async () => { callOrder.push('update'); return { ...mockPostData, title: 'Updated Title' }; });

      await postService.updatePost('post-123', { title: 'Updated Title' }, 'brand-abc', 'user-111');

      expect(postRepository.lockAndAssertFresh).toHaveBeenCalledWith('post-123', snapshotUpdatedAt, expect.anything());
      expect(callOrder).toEqual(['lock', 'update']);
    });

    it('should reject with a 409 conflict when another request modified the post in between (lockAndAssertFresh throws)', async () => {
      postRepository.findById.mockResolvedValue({
        id: 'post-123',
        brandId: 'brand-abc',
        status: 'DRAFT',
        updatedAt: new Date('2026-01-01T00:00:00Z')
      });
      const conflictError = new Error('Post was modified by another request during update. Please reload and try again.');
      conflictError.statusCode = 409;
      postRepository.lockAndAssertFresh.mockRejectedValue(conflictError);

      await expect(
        postService.updatePost('post-123', { title: 'Updated Title' }, 'brand-abc', 'user-111')
      ).rejects.toMatchObject({ message: expect.stringContaining('modified by another request'), statusCode: 409 });

      expect(postRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('POST_006 - updatePost (Error handling)', () => {
    it('should throw error when trying to update media of an already published Facebook post', async () => {
      postRepository.findById.mockResolvedValue({
        id: 'post-123',
        brandId: 'brand-abc',
        status: 'PUBLISHED',
        targetPlatforms: 'FACEBOOK',
        mediaUrls: 'url1.jpg'
      });

      await expect(
        postService.updatePost('post-123', { mediaUrls: ['url1.jpg', 'url2.jpg'] }, 'brand-abc', 'user-111')
      ).rejects.toThrow('Facebook does not support updating/modifying media on an already published post');

      expect(postRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('POST_007 - Bulk Operations', () => {
    it('should support bulk approval', async () => {
      postRepository.findManyByIdsAndBrand.mockResolvedValue([
        { id: 'post-1', status: 'PENDING_APPROVAL' },
        { id: 'post-2', status: 'DRAFT' },
        { id: 'post-3', status: 'PENDING_APPROVAL' }
      ]);

      const count = await postService.bulkApprove(['post-1', 'post-2', 'post-3'], 'brand-abc');

      expect(count).toBe(2); // Only posts in PENDING_APPROVAL are approved
      expect(postRepository.updateStatus).toHaveBeenCalledTimes(2);
    });

    it('should support bulk delete', async () => {
      postRepository.findManyByIdsAndBrand.mockResolvedValue([
        { id: 'post-1', autoListId: 'autolist-99' }
      ]);
      postRepository.deleteMany.mockResolvedValue({ count: 3 });

      const count = await postService.bulkDelete(['post-1', 'post-2', 'post-3'], 'brand-abc');

      expect(count).toBe(3);
      expect(postRepository.deleteMany).toHaveBeenCalledWith(
        { id: { in: ['post-1', 'post-2', 'post-3'] }, brandId: 'brand-abc' },
        expect.anything()
      );
    });
  });

  describe('POST_008 - createPost (Monthly Limit Check)', () => {
    it('should throw a 403 error if the monthly post limit is reached', async () => {
      brandRepository.findBrandWithSubscription.mockResolvedValue({
        id: 'brand-abc',
        subscription: {
          status: 'ACTIVE',
          plan: {
            planLimit: {
              maxPostsPerMonth: 10
            }
          }
        }
      });
      postRepository.countActivePostsThisMonth.mockResolvedValue(10); // Limit reached

      const newPostInput = {
        title: 'New Post',
        status: 'DRAFT'
      };

      await expect(
        postService.createPost(newPostInput, 'user-111', 'brand-abc')
      ).rejects.toThrow('Monthly post limit of 10 reached. Please upgrade your plan.');

      expect(postRepository.create).not.toHaveBeenCalled();
    });

    it('should allow post creation if the limit is not reached', async () => {
      brandRepository.findBrandWithSubscription.mockResolvedValue({
        id: 'brand-abc',
        subscription: {
          status: 'ACTIVE',
          plan: {
            planLimit: {
              maxPostsPerMonth: 10
            }
          }
        }
      });
      postRepository.countActivePostsThisMonth.mockResolvedValue(5); // 5/10 posts

      postRepository.create.mockResolvedValue({
        ...mockPostData,
        title: 'New Post'
      });

      const result = await postService.createPost({ title: 'New Post', status: 'DRAFT' }, 'user-111', 'brand-abc');
      expect(result.title).toBe('New Post');
      expect(postRepository.create).toHaveBeenCalled();
    });
  });

  describe('YouTube Native Scheduling integration', () => {
    const socialPlatformFactory = require('../../src/services/social/social-platform.factory');
    const initPostSubscribers = require('../../src/events/subscribers/post.subscriber');
    const { POST_DOMAIN_EVENT_HANDLERS } = initPostSubscribers;

    it('should queue the publish job and a POST_DOMAIN_EVENT outbox row when creating a scheduled post', async () => {
      const scheduleTime = new Date(Date.now() + 3600000);
      const schedulePostInput = {
        title: 'YouTube Native Title',
        status: 'SCHEDULED',
        scheduledAt: scheduleTime.toISOString(),
        targetPlatforms: ['YOUTUBE'],
        mediaUrls: ['http://example.com/video.mp4'],
        options: { privacyStatus: 'public' }
      };

      authorizationFacade.hasPermission.mockResolvedValue(true);
      const createdPost = {
        ...mockPostData,
        id: 'post-yt-native',
        brandId: 'brand-abc',
        title: 'YouTube Native Title',
        status: 'SCHEDULED',
        scheduledAt: scheduleTime,
        targetPlatforms: 'YOUTUBE',
        mediaUrls: 'http://example.com/video.mp4'
      };
      postRepository.create.mockResolvedValue(createdPost);

      await postService.createPost(schedulePostInput, 'user-111', 'brand-abc');

      // post.service.js không còn gọi upsertPublishJob/eventEmitter.emit trực tiếp —
      // cả job publish lẫn domain event (Native Scheduling) đi qua outbox trong cùng
      // transaction với việc tạo post.
      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.POST_PUBLISH_UPSERT,
        'post-yt-native',
        { postId: 'post-yt-native', scheduledAt: scheduleTime },
        {},
        expect.anything()
      );
      expect(outboxEventRepository.create).toHaveBeenCalledWith(
        OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT,
        'post-yt-native',
        expect.objectContaining({ eventName: 'post.created' }),
        {},
        expect.anything()
      );
      expect(upsertPublishJob).not.toHaveBeenCalled();
    });

    it('should trigger YouTube native scheduling when the outbox dispatcher invokes the POST.CREATED domain handler', async () => {
      const scheduleTime = new Date(Date.now() + 3600000);
      const post = {
        id: 'post-yt-native',
        brandId: 'brand-abc',
        title: 'YouTube Native Title',
        status: 'SCHEDULED',
        scheduledAt: scheduleTime,
        targetPlatforms: 'YOUTUBE',
        mediaUrls: 'http://example.com/video.mp4',
        platformPostId: null
      };
      const mockYtServiceInstance = socialPlatformFactory.getService('YOUTUBE');
      postRepository.update.mockResolvedValue({ ...post, platformPostId: JSON.stringify({ YOUTUBE: 'ytVideoIdMock' }) });

      // Simula dispatcher gọi trực tiếp handler đã ghi trong outbox row POST_DOMAIN_EVENT.
      await POST_DOMAIN_EVENT_HANDLERS['post.created']({ post, options: { privacyStatus: 'public' } });

      expect(mockYtServiceInstance.publishPost).toHaveBeenCalledWith('brand-abc', expect.objectContaining({
        title: 'YouTube Native Title',
        scheduledAt: scheduleTime
      }));
      expect(postRepository.update).toHaveBeenCalledWith('post-yt-native', { platformPostId: JSON.stringify({ YOUTUBE: 'ytVideoIdMock' }) });
    });
  });

  describe('getPostAnalytics', () => {
    it('should retrieve post metric history from prisma', async () => {
      postRepository.findById.mockResolvedValue({
        id: 'post-123',
        brandId: 'brand-abc'
      });

      const mockHistory = [
        { id: 1, viewsCumulative: 100, reactionsCumulative: 10 }
      ];

      const prismaMock = require('../../src/config/prisma');
      prismaMock.postAnalyticsDailySnapshot.findMany.mockResolvedValue(mockHistory);

      const result = await postService.getPostAnalytics('post-123', 'brand-abc');

      expect(result).toEqual(mockHistory);
      expect(prismaMock.postAnalyticsDailySnapshot.findMany).toHaveBeenCalledWith({
        where: { postId: 'post-123', brandId: 'brand-abc' },
        orderBy: { date: 'asc' }
      });
    });

    it('should throw error if post is not found or brand unauthorized', async () => {
      postRepository.findById.mockResolvedValue(null);

      await expect(
        postService.getPostAnalytics('post-123', 'brand-abc')
      ).rejects.toThrow('Post not found or unauthorized');
    });
  });

  describe('Path Normalization & Sanitization', () => {
    it('should recursively normalize Windows backslashes to forward slashes in post media paths and metadata', () => {
      const input = {
        title: 'Spain vs Austria',
        caption: 'Tây Ban Nha \\ Áo \\u',
        mediaUrls: ['D:\\projects\\uploads\\media.mp4'],
        mediaThumbnailUrls: ['D:\\projects\\uploads\\thumb.jpg'],
        options: {
          youtubeThumbnail: 'D:\\projects\\uploads\\thumb.jpg',
          albumMedia: [
            'D:\\projects\\uploads\\image.jpg',
            { url: 'D:\\projects\\uploads\\image2.jpg' }
          ],
          nested: {
            path: 'D:\\projects\\uploads\\nested.jpg'
          },
          plainText: 'Tây Ban Nha \\ Áo'
        }
      };

      const result = postService._preparePostData(input, 'user-123', 'brand-123');

      expect(result.mediaUrls).toBe('D:/projects/uploads/media.mp4');
      expect(result.mediaThumbnailUrls).toBe('D:/projects/uploads/thumb.jpg');
      
      const parsedMetadata = JSON.parse(result.metadata);
      expect(parsedMetadata.youtubeThumbnail).toBe('D:/projects/uploads/thumb.jpg');
      expect(parsedMetadata.albumMedia[0]).toBe('D:/projects/uploads/image.jpg');
      expect(parsedMetadata.albumMedia[1].url).toBe('D:/projects/uploads/image2.jpg');
      expect(parsedMetadata.nested.path).toBe('D:/projects/uploads/nested.jpg');
      expect(parsedMetadata.plainText).toBe('Tây Ban Nha \\ Áo');
      expect(result.caption).toBe('Tây Ban Nha \\ Áo \\u');
    });

    it('should convert lone surrogate Unicode strings into safe well-formed strings using toWellFormed', () => {
      // \uD83D is a lone surrogate character (half of an emoji)
      const input = {
        title: 'Title with lone surrogate \uD83D',
        caption: 'Caption',
        options: {
          badText: 'Bad \uD83D text'
        }
      };

      const result = postService._preparePostData(input, 'user-123', 'brand-123');
      expect(result.title.toWellFormed()).toBe(result.title);
      
      const parsedMetadata = JSON.parse(result.metadata);
      expect(parsedMetadata.badText.toWellFormed()).toBe(parsedMetadata.badText);
    });
  });
});

