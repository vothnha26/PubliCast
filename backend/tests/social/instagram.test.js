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
          username: 'publicast_ig',
          displayName: 'PubliCast Instagram'
        }),
        expect.any(Object)
      );
      expect(result.id).toBe('sa_ig_1');
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
