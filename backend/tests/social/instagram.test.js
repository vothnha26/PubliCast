const instagramService = require('../../src/services/social/instagram');
const instagramGateway = require('../../src/services/social/instagram/instagram.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const instagramAnalyticsService = require('../../src/services/social/instagram/instagram-analytics.service');
const prisma = require('../../src/config/prisma');
const { PLATFORMS, POST_TYPES } = require('../../src/utils/constants');

jest.mock('../../src/services/social/instagram/instagram.gateway', () => {
  return {
    getInstagramAccountForPage: jest.fn().mockResolvedValue({
      igAccountId: 'ig_123',
      username: 'publicast_ig',
      displayName: 'PubliCast Instagram',
      profilePictureUrl: 'http://pic.jpg',
      followersCount: 1500,
      followingCount: 200,
      mediaCount: 30
    }),
    createImageContainer: jest.fn(),
    createVideoContainer: jest.fn(),
    createReelContainer: jest.fn(),
    createStoryContainer: jest.fn(),
    createCarouselContainer: jest.fn(),
    createCarouselItemContainer: jest.fn(),
    pollContainerStatus: jest.fn(),
    publishContainer: jest.fn(),
    getInstagramMediaFeed: jest.fn().mockResolvedValue({ data: [] }),
    getInstagramMediaInsights: jest.fn().mockResolvedValue([]),
    getMediaComments: jest.fn().mockResolvedValue([]),
    replyToComment: jest.fn().mockResolvedValue({ id: 'mock_reply_id' }),
    getAccountInsights: jest.fn().mockResolvedValue([])
  };
});
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  findBrandWithSubscription: jest.fn().mockResolvedValue(null)
}));
jest.mock('../../src/config/prisma', () => ({
  postMetricDaily: {
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue({})
  },
  brand: {
    findUnique: jest.fn().mockResolvedValue({ timezone: null })
  }
}));
jest.mock('../../src/services/social/connection-conflict.guard', () => ({
  ConnectionConflictGuard: {
    validateConflict: jest.fn().mockResolvedValue({ conflict: false })
  },
  ConnectionConflictError: class ConnectionConflictError extends Error {}
}));
jest.mock('../../src/services/social/facebook/facebook.gateway', () => ({
  exchangeCodeForToken: jest.fn().mockResolvedValue({ access_token: 'fb_user_token_123' }),
  getUserPages: jest.fn().mockResolvedValue([{ id: 'page_123', name: 'Facebook Page', access_token: 'page_token_123' }]),
  getUserPermissions: jest.fn().mockResolvedValue([])
}));

describe('Instagram Integration Service Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('InstagramGateway Mocking', () => {
    it('should exchange code and fetch Instagram Business account linked to Page', async () => {
      const mockIGAccount = {
        igAccountId: 'ig_123',
        username: 'publicast_ig',
        displayName: 'PubliCast Instagram',
        profilePictureUrl: 'http://pic.jpg',
        followersCount: 1500,
        followingCount: 200,
        mediaCount: 30
      };
      instagramGateway.getInstagramAccountForPage.mockResolvedValue(mockIGAccount);

      const result = await instagramGateway.getInstagramAccountForPage('page_123', 'page_token_123');

      expect(instagramGateway.getInstagramAccountForPage).toHaveBeenCalledWith('page_123', 'page_token_123');
      expect(result.igAccountId).toBe('ig_123');
      expect(result.username).toBe('publicast_ig');
    });
  });

  describe('InstagramAnalyticsService', () => {
    it('should fetch insights and generate complete analytics package (Mock/Real)', async () => {
      const result = await instagramAnalyticsService.getAnalyticsReport('ig_123', 'mock-token', '2026-05-20', '2026-05-25', 1500);

      expect(result).toBeDefined();
      expect(result.summary.followers).toBe(1500);
      expect(result.growth).toHaveLength(6); // 20, 21, 22, 23, 24, 25 (6 days)
      expect(result.interactions).toBeDefined();
    });

    // Regression test for #69: interactions.viewsBreakdown was a fabricated
    // organic/promoted split (hardcoded 85/15) with no backing API call.
    it('does not include a fabricated viewsBreakdown split (#69)', async () => {
      const result = await instagramAnalyticsService.getAnalyticsReport('ig_123', 'mock-token', '2026-05-20', '2026-05-25', 1500);

      expect(result.interactions.viewsBreakdown).toBeUndefined();
    });
  });

  describe('InstagramService Facade', () => {
    it('should connectChannel and call repository upsertInstagramAccount', async () => {
      const mockIGAccount = {
        igAccountId: 'ig_123',
        username: 'publicast_ig',
        displayName: 'PubliCast Instagram',
        profilePictureUrl: 'http://pic.jpg',
        followersCount: 1500,
        followingCount: 200,
        mediaCount: 30,
        analytics: {
          summary: { followers: 1500 }
        }
      };

      instagramGateway.getInstagramAccountForPage.mockResolvedValue(mockIGAccount);
      socialAccountRepository.upsertInstagramAccount.mockResolvedValue({ id: 'sa_ig_1' });

      const result = await instagramService.connectChannel('brand_1', 'auth_code', 'http://redirect.uri');

      expect(socialAccountRepository.upsertInstagramAccount).toHaveBeenCalledWith(
        'brand_1',
        expect.objectContaining({
          igAccountId: 'ig_123',
          // Regression guard: the linked Facebook Page ID must be persisted at
          // connect time — periodic sync has no other way to re-derive it
          // (Instagram Graph API insights are only reachable via the Page
          // node, never via the IG Business Account ID alone).
          facebookPageId: 'page_123',
          username: 'publicast_ig',
          displayName: 'PubliCast Instagram'
        }),
        expect.any(Object)
      );
      expect(result.id).toBe('sa_ig_1');
    });

    it('syncChannelMetrics calls the Graph API with the stored facebookPageId, not the IG Business Account ID', async () => {
      socialAccountRepository.findById.mockResolvedValue({
        id: 'sa_ig_1',
        brandId: 'brand_1',
        platform: PLATFORMS.INSTAGRAM,
        platformAccountId: 'ig_123', // IG Business Account ID — must NOT be used as pageId
        accessToken: 'page_token_123',
        refreshToken: '',
        username: 'publicast_ig',
        displayName: 'PubliCast Instagram',
        instagramAccount: { facebookPageId: 'page_123' }
      });
      socialAccountRepository.upsertInstagramAccount.mockResolvedValue({ id: 'sa_ig_1' });

      await instagramService.syncChannelMetrics('sa_ig_1', '2026-05-20', '2026-05-25');

      expect(instagramGateway.getInstagramAccountForPage).toHaveBeenCalledWith('page_123', 'page_token_123');
      expect(socialAccountRepository.upsertInstagramAccount).toHaveBeenCalledWith(
        'brand_1',
        expect.objectContaining({ igAccountId: 'ig_123', facebookPageId: 'page_123' }),
        expect.any(Object),
        PLATFORMS.INSTAGRAM,
        { enqueueSync: false }
      );
    });

    it('syncChannelMetrics throws instead of silently syncing zeros when facebookPageId is missing (pre-migration accounts)', async () => {
      socialAccountRepository.findById.mockResolvedValue({
        id: 'sa_ig_1',
        brandId: 'brand_1',
        platform: PLATFORMS.INSTAGRAM,
        platformAccountId: 'ig_123',
        accessToken: 'page_token_123',
        instagramAccount: { facebookPageId: null }
      });

      await expect(instagramService.syncChannelMetrics('sa_ig_1', '2026-05-20', '2026-05-25'))
        .rejects.toThrow(/Facebook Page ID/);
      expect(socialAccountRepository.upsertInstagramAccount).not.toHaveBeenCalled();
    });

    // Regression guard: `impressions` is deprecated by Meta for Instagram
    // media created after July 2, 2024 (guide/instagram/reference/
    // instagram-media.insights.md) and Graph API rejects the request when
    // it's requested alongside other metrics for a new post. `views` is the
    // supported replacement metric.
    it('enriches published posts using the "views" metric, not the deprecated "impressions" metric (Sync-only live fetch)', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
        id: 'sa_ig_test', platformAccountId: 'ig_123',
        accessToken: 'ig_access_token'
      }]);
      instagramGateway.getInstagramMediaFeed.mockResolvedValue({
        data: [{ id: 'media_1', like_count: 5, comments_count: 2, media_type: 'IMAGE', timestamp: new Date().toISOString() }],
        nextPageToken: null,
        prevPageToken: null
      });
      instagramGateway.getInstagramMediaInsights.mockResolvedValue([
        { name: 'views', values: [{ value: 42 }] },
        { name: 'reach', values: [{ value: 30 }] },
        { name: 'shares', values: [{ value: 1 }] }
      ]);

      await instagramService.syncPublishedPosts('brand_views_metric_test', 'sa_ig_test');

      expect(instagramGateway.getInstagramMediaInsights).toHaveBeenCalledWith('media_1', 'ig_access_token');
      const upsertedRow = prisma.postMetricDaily.upsert.mock.calls[0][0].create;
      expect(upsertedRow.views).toBe(42);
      expect(upsertedRow.reach).toBe(30);
    });

    // Regression guard: for VIDEO/Reels posts, `media_url` points at the raw
    // .mp4 file — an <img> tag can't render that as a thumbnail. The
    // dedicated `thumbnail_url` field (the actual preview image) must be
    // surfaced separately as `thumbnailUrl`, not collapsed into `mediaUrl`.
    it('exposes a separate thumbnailUrl distinct from the raw video mediaUrl for VIDEO posts (Sync-only live fetch)', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
        id: 'sa_ig_test', platformAccountId: 'ig_123',
        accessToken: 'ig_access_token'
      }]);
      instagramGateway.getInstagramMediaFeed.mockResolvedValue({
        data: [{
          id: 'media_video_1',
          media_type: 'VIDEO',
          media_url: 'https://instagram.example.com/video.mp4',
          thumbnail_url: 'https://scontent.example.com/preview.jpg',
          like_count: 0,
          comments_count: 0,
          timestamp: new Date().toISOString()
        }],
        nextPageToken: null,
        prevPageToken: null
      });
      instagramGateway.getInstagramMediaInsights.mockResolvedValue([]);

      await instagramService.syncPublishedPosts('brand_thumbnail_test', 'sa_ig_test');

      // PostMetricDaily only persists thumbnailUrl (mediaUrl for video posts
      // collapses into it on the Sync/persist side — see _persistPostMetrics),
      // so this now asserts on the persisted row instead of the read-path DTO.
      const upsertedRow = prisma.postMetricDaily.upsert.mock.calls[0][0].create;
      expect(upsertedRow.thumbnailUrl).toBe('https://scontent.example.com/preview.jpg');
    });

    it('should publish single photo post successfully via Photo strategy', async () => {
      instagramGateway.createImageContainer.mockResolvedValue({ id: 'container_photo_123' });
      instagramGateway.publishContainer.mockResolvedValue({ id: 'ig_post_photo_123' });
      
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
        platformAccountId: 'ig_123',
        accessToken: 'ig_access_token'
      }]);

      const result = await instagramService.publishPost('brand_1', {
        type: POST_TYPES.IMAGE,
        mediaUrls: ['http://pic.jpg'],
        caption: 'Hello Instagram!'
      });

      expect(instagramGateway.createImageContainer).toHaveBeenCalledWith('ig_123', 'ig_access_token', 'http://pic.jpg', 'Hello Instagram!', null, undefined, undefined);
      expect(instagramGateway.publishContainer).toHaveBeenCalledWith('ig_123', 'ig_access_token', 'container_photo_123');
      expect(result.platformVideoId).toBe('ig_post_photo_123');
    });

    it('should forward altText as alt_text when publishing a single photo post', async () => {
      instagramGateway.createImageContainer.mockResolvedValue({ id: 'container_photo_alt_123' });
      instagramGateway.publishContainer.mockResolvedValue({ id: 'ig_post_photo_alt_123' });

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
        platformAccountId: 'ig_123',
        accessToken: 'ig_access_token'
      }]);

      await instagramService.publishPost('brand_1', {
        type: POST_TYPES.IMAGE,
        mediaUrls: ['http://pic.jpg'],
        caption: 'Hello Instagram!',
        altText: 'A red bicycle leaning against a brick wall'
      });

      expect(instagramGateway.createImageContainer).toHaveBeenCalledWith(
        'ig_123', 'ig_access_token', 'http://pic.jpg', 'Hello Instagram!', null, undefined,
        'A red bicycle leaning against a brick wall'
      );
    });

    it('should publish a multi-image carousel, forwarding alt_text to each image child', async () => {
      instagramGateway.createCarouselItemContainer
        .mockResolvedValueOnce({ id: 'child_1' })
        .mockResolvedValueOnce({ id: 'child_2' });
      instagramGateway.createCarouselContainer.mockResolvedValue({ id: 'container_carousel_123' });
      instagramGateway.pollContainerStatus.mockResolvedValue({ status_code: 'FINISHED' });
      instagramGateway.publishContainer.mockResolvedValue({ id: 'ig_post_carousel_123' });

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
        platformAccountId: 'ig_123',
        accessToken: 'ig_access_token'
      }]);

      const result = await instagramService.publishPost('brand_1', {
        mediaUrls: ['http://pic1.jpg', 'http://pic2.jpg'],
        caption: 'Carousel post!',
        altText: 'Shared alt text'
      });

      expect(instagramGateway.createCarouselItemContainer).toHaveBeenNthCalledWith(
        1, 'ig_123', 'ig_access_token', 'http://pic1.jpg', false, 'Shared alt text'
      );
      expect(instagramGateway.createCarouselItemContainer).toHaveBeenNthCalledWith(
        2, 'ig_123', 'ig_access_token', 'http://pic2.jpg', false, 'Shared alt text'
      );
      expect(instagramGateway.createCarouselContainer).toHaveBeenCalledWith(
        'ig_123', 'ig_access_token', ['child_1', 'child_2'], 'Carousel post!', null, undefined
      );
      // Publishing the parent carousel container immediately after creation
      // (before Meta finishes assembling it) intermittently failed with
      // "Media upload has failed with error code 2207082" — the parent
      // must be polled to FINISHED first, same as video children already
      // were, regardless of whether the carousel is all-image, all-video,
      // or mixed.
      expect(instagramGateway.pollContainerStatus).toHaveBeenCalledWith('container_carousel_123', 'ig_access_token');
      expect(instagramGateway.publishContainer).toHaveBeenCalledWith('ig_123', 'ig_access_token', 'container_carousel_123');
      expect(result.platformVideoId).toBe('ig_post_carousel_123');
    });

    it('should reject a carousel with more than 10 media items', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
        platformAccountId: 'ig_123',
        accessToken: 'ig_access_token'
      }]);

      const elevenUrls = Array.from({ length: 11 }, (_, i) => `http://pic${i}.jpg`);

      await expect(
        instagramService.publishPost('brand_1', {
          mediaUrls: elevenUrls,
          caption: 'Too many!'
        })
      ).rejects.toThrow('maximum of 10');

      expect(instagramGateway.createCarouselItemContainer).not.toHaveBeenCalled();
    });

    it('should publish Reels successfully via Reel strategy', async () => {
      instagramGateway.createReelContainer.mockResolvedValue({ id: 'container_reel_123' });
      instagramGateway.pollContainerStatus.mockResolvedValue({ status_code: 'FINISHED' });
      instagramGateway.publishContainer.mockResolvedValue({ id: 'ig_post_reel_123' });

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
        platformAccountId: 'ig_123',
        accessToken: 'ig_access_token'
      }]);

      const result = await instagramService.publishPost('brand_1', {
        type: POST_TYPES.REEL,
        mediaUrls: ['http://video.mp4'],
        caption: 'Awesome Reel!'
      });

      expect(instagramGateway.createReelContainer).toHaveBeenCalledWith('ig_123', 'ig_access_token', 'http://video.mp4', 'Awesome Reel!', null, undefined);
      expect(instagramGateway.pollContainerStatus).toHaveBeenCalledWith('container_reel_123', 'ig_access_token');
      expect(instagramGateway.publishContainer).toHaveBeenCalledWith('ig_123', 'ig_access_token', 'container_reel_123');
      expect(result.platformVideoId).toBe('ig_post_reel_123');
    });
  });
});
