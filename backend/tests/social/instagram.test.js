const instagramService = require('../../src/services/social/instagram');
const instagramGateway = require('../../src/services/social/instagram/instagram.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const instagramAnalyticsService = require('../../src/services/social/instagram/instagram-analytics.service');
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
    it('enriches published posts using the "views" metric, not the deprecated "impressions" metric', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
        platformAccountId: 'ig_123',
        accessToken: 'ig_access_token'
      }]);
      instagramGateway.getInstagramMediaFeed.mockResolvedValue({
        data: [{ id: 'media_1', like_count: 5, comments_count: 2, media_type: 'IMAGE', timestamp: '2026-05-20T00:00:00+0000' }],
        nextPageToken: null,
        prevPageToken: null
      });
      instagramGateway.getInstagramMediaInsights.mockResolvedValue([
        { name: 'views', values: [{ value: 42 }] },
        { name: 'reach', values: [{ value: 30 }] },
        { name: 'shares', values: [{ value: 1 }] }
      ]);

      const result = await instagramService.getPublishedVideos('brand_views_metric_test');

      expect(instagramGateway.getInstagramMediaInsights).toHaveBeenCalledWith('media_1', 'ig_access_token');
      expect(result.data[0].views).toBe(42);
      expect(result.data[0].reach).toBe(30);
    });

    // Regression guard: for VIDEO/Reels posts, `media_url` points at the raw
    // .mp4 file — an <img> tag can't render that as a thumbnail. The
    // dedicated `thumbnail_url` field (the actual preview image) must be
    // surfaced separately as `thumbnailUrl`, not collapsed into `mediaUrl`.
    it('exposes a separate thumbnailUrl distinct from the raw video mediaUrl for VIDEO posts', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{
        platformAccountId: 'ig_123',
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
          timestamp: '2026-05-20T00:00:00+0000'
        }],
        nextPageToken: null,
        prevPageToken: null
      });
      instagramGateway.getInstagramMediaInsights.mockResolvedValue([]);

      const result = await instagramService.getPublishedVideos('brand_thumbnail_test');

      expect(result.data[0].mediaUrl).toBe('https://instagram.example.com/video.mp4');
      expect(result.data[0].thumbnailUrl).toBe('https://scontent.example.com/preview.jpg');
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

      expect(instagramGateway.createImageContainer).toHaveBeenCalledWith('ig_123', 'ig_access_token', 'http://pic.jpg', 'Hello Instagram!', null, undefined);
      expect(instagramGateway.publishContainer).toHaveBeenCalledWith('ig_123', 'ig_access_token', 'container_photo_123');
      expect(result.platformVideoId).toBe('ig_post_photo_123');
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
