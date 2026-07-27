const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const instagramGateway = require('../../src/services/social/instagram/instagram.gateway');
const facebookPostService = require('../../src/services/social/facebook/facebook-post.service');
const instagramPostService = require('../../src/services/social/instagram/instagram-post.service');
const postService = require('../../src/services/workspace/post.service');
const socialPlatformFactory = require('../../src/services/social/social-platform.factory');
const postRepository = require('../../src/repositories/workspace/post.repository');
const { POST_TYPES, PLATFORMS, POST_STATUS } = require('../../src/utils/constants');

jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/repositories/workspace/post.repository');
jest.mock('../../src/services/social/social-platform.factory');

describe('Meta Native Scheduling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock _getAccountCredentials
    jest.spyOn(facebookPostService, '_getAccountCredentials').mockResolvedValue({
      pageId: 'fb_page_123',
      pageAccessToken: 'fb_token_123'
    });
    jest.spyOn(instagramPostService, '_getAccountCredentials').mockResolvedValue({
      igAccountId: 'ig_acc_123',
      accessToken: 'ig_token_123'
    });

    socialPlatformFactory.getService = jest.fn().mockImplementation((platform) => {
      if (platform === PLATFORMS.YOUTUBE) {
        return {
          publishPost: jest.fn().mockResolvedValue({ platformVideoId: 'mock_yt_123' })
        };
      }
      if (platform === PLATFORMS.FACEBOOK) {
        return facebookPostService;
      }
      if (platform === PLATFORMS.INSTAGRAM) {
        return instagramPostService;
      }
      return null;
    });
  });

  describe('1. Gateway parameter handling with scheduledAt', () => {
    it('FacebookGateway should send published=false and scheduled_publish_time', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'fb_post_scheduled_123' })
      });

      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day later
      const expectedTime = Math.floor(new Date(scheduledAt).getTime() / 1000);

      // We test the publishTextPost
      await facebookGateway.publishTextPost('fb_page_123', 'fb_token_123', 'Hello scheduled!', scheduledAt);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = global.fetch.mock.calls[0];
      const calledUrl = callArgs[0];
      expect(calledUrl).toContain('published=false');
      expect(calledUrl).toContain(`scheduled_publish_time=${expectedTime}`);
    });

    it('InstagramGateway should send scheduled_publish_time on createImageContainer', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'ig_container_scheduled_123' })
      });

      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const expectedTime = Math.floor(new Date(scheduledAt).getTime() / 1000);

      await instagramGateway.createImageContainer('ig_acc_123', 'ig_token_123', 'http://img.jpg', 'Cap scheduled', scheduledAt);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = global.fetch.mock.calls[0];
      const bodyParsed = JSON.parse(callArgs[1].body);
      expect(bodyParsed.scheduled_publish_time).toBe(expectedTime);
    });
  });

  describe('2. Service Layer Short-Circuiting', () => {
    it('FacebookPostService should short-circuit if platformPostId already exists', async () => {
      const postData = {
        platformPostId: 'existing_fb_id_456',
        type: POST_TYPES.TEXT,
        caption: 'Hello'
      };

      const result = await facebookPostService.publishPost('brand_123', postData);

      expect(result.platformVideoId).toBe('existing_fb_id_456');
      expect(result.publishedAt).toBeNull();
    });

    it('InstagramPostService should short-circuit if platformPostId already exists', async () => {
      const postData = {
        platformPostId: 'existing_ig_id_456',
        type: POST_TYPES.PHOTO,
        caption: 'Hello'
      };

      const result = await instagramPostService.publishPost('brand_123', postData);

      expect(result.platformVideoId).toBe('existing_ig_id_456');
      expect(result.publishedAt).toBeNull();
    });
  });

  describe('3. Meta Scheduling Window & Fallback Checks', () => {
    it('FacebookPostService should fallback to queue if scheduledAt is less than 10 minutes in the future', async () => {
      const scheduledAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes in future
      const postData = {
        type: POST_TYPES.TEXT,
        caption: 'Should fallback to queue',
        scheduledAt
      };

      // Mock strategy behavior: we mock facebookGateway call
      jest.spyOn(facebookGateway, 'publishTextPost').mockResolvedValue({ id: 'fb_immediate_id' });

      const result = await facebookPostService.publishPost('brand_123', postData);

      // In facebookPostService, when we fallback, finalScheduledAt becomes null, and we call strategy with scheduledAt: null
      expect(facebookGateway.publishTextPost).toHaveBeenCalledWith(
        'fb_page_123',
        'fb_token_123',
        'Should fallback to queue',
        null
      );
      // And publishedAt should be returned as a new Date (not null)
      expect(result.publishedAt).not.toBeNull();
    });

    it('FacebookPostService should use native scheduling if scheduledAt is within valid Meta window (e.g., 2 hours)', async () => {
      const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
      const postData = {
        type: POST_TYPES.TEXT,
        caption: 'Native schedule this',
        scheduledAt
      };

      jest.spyOn(facebookGateway, 'publishTextPost').mockResolvedValue({ id: 'fb_scheduled_id_789' });

      const result = await facebookPostService.publishPost('brand_123', postData);

      expect(facebookGateway.publishTextPost).toHaveBeenCalledWith(
        'fb_page_123',
        'fb_token_123',
        'Native schedule this',
        scheduledAt
      );
      expect(result.publishedAt).toBeNull(); // publishedAt is null because it is natively scheduled
      expect(result.platformVideoId).toBe('fb_scheduled_id_789');
    });
  });

  describe('4. PostService Multi-platform Native Scheduling', () => {
    it('should schedule on supported platforms and save platformPostId as JSON map', async () => {
      const post = {
        id: 'post_123',
        brandId: 'brand_123',
        title: 'Title',
        caption: 'Caption',
        type: POST_TYPES.TEXT,
        targetPlatforms: 'YOUTUBE,FACEBOOK',
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        platformPostId: null
      };

      // Mock Facebook publish
      jest.spyOn(facebookGateway, 'publishTextPost').mockResolvedValue({ id: 'fb_native_id' });

      await postService._handleNativeScheduling(post);

      // postRepository.update should have been called with JSON map
      expect(postRepository.update).toHaveBeenCalled();
      const lastCallArgs = postRepository.update.mock.calls[0];
      const updateData = lastCallArgs[1];
      const platformMap = JSON.parse(updateData.platformPostId);
      expect(platformMap.YOUTUBE).toBe('mock_yt_123');
      expect(platformMap.FACEBOOK).toBe('fb_native_id');
    });
  });
});
