const tiktokService = require('../../src/services/social/tiktok');
const tiktokGateway = require('../../src/services/social/tiktok/tiktok.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');

jest.mock('../../src/services/social/tiktok/tiktok.gateway');
jest.mock('../../src/repositories/social/social-account.repository');

describe('TikTok Integration Service Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('TikTokService.getAnalyticsReport', () => {
    it('should generate structured TikTok metrics matching the design spec', async () => {
      const startDate = '2026-05-01';
      const endDate = '2026-05-15';
      const currentFollowers = 1000;

      tiktokGateway.getVideoList.mockResolvedValue({
        videos: [
          {
            id: 'vid1',
            create_time: Math.floor(Date.now() / 1000) - 86400,
            cover_image_url: 'http://pic.jpg',
            share_url: 'http://share',
            video_description: 'desc',
            duration: 15,
            title: 'title',
            like_count: 50,
            comment_count: 10,
            share_count: 5,
            view_count: 500
          }
        ],
        cursor: 0,
        has_more: false
      });

      const result = await tiktokService.getAnalyticsReport({ accessToken: 'mock_token' }, startDate, endDate, currentFollowers);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.followers).toBe(currentFollowers);
      expect(result.summary.views).toBeGreaterThanOrEqual(0);
      expect(result.summary.totalContent).toBeGreaterThanOrEqual(0);

      // reach/balance/clicks/viewsBreakdown were removed — TikTok's
      // video-list API has no real reach, click, or follower-delta data;
      // those fields used to be fabricated percentages of view/like
      // counts presented as measured data (#97-equivalent fix).
      expect(result.summary.reach).toBeUndefined();
      expect(result.balance).toBeUndefined();
      expect(result.clicks).toBeUndefined();

      expect(result.growth).toBeDefined();
      expect(result.growth.length).toBeGreaterThan(0);
      expect(result.growth[0].date).toBeDefined();
      expect(result.growth[0].followers).toBeDefined();
      expect(result.growth[0].views).toBeDefined();

      expect(result.postsPeriod).toBeDefined();
      expect(result.interactions).toBeDefined();
      expect(result.interactions.likes).toBeDefined();
      expect(result.interactions.comments).toBeDefined();
      expect(result.interactions.shares).toBeDefined();
      expect(result.interactions.viewsBreakdown).toBeUndefined();
    });
  });

  describe('TikTokService.syncChannelMetrics', () => {
    it('should query the repository, generate mock data, and call upsertTikTokAccount', async () => {
      const mockAccount = {
        id: 'sa_tiktok_1',
        brandId: 'brand_123',
        platform: 'TIKTOK',
        platformAccountId: 'user_tiktok_id',
        username: 'tiktok_test_user',
        displayName: 'TikTok Test User',
        profilePictureUrl: 'http://pic.jpg/avatar',
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // Not expired
        tikTokAccount: {
          followersCount: 1500,
          followingCount: 150,
          likesCount: 5000,
          videoCount: 25
        }
      };

      socialAccountRepository.findById.mockResolvedValue(mockAccount);
      tiktokGateway.getUserInfo.mockResolvedValue({
        open_id: 'user_tiktok_id',
        union_id: 'union_id',
        username: 'tiktok_test_user',
        avatar_url: 'http://pic.jpg/avatar',
        display_name: 'TikTok Test User',
        follower_count: 1500,
        following_count: 150,
        likes_count: 5000,
        video_count: 25
      });
      tiktokGateway.getVideoList.mockResolvedValue({
        videos: [],
        cursor: 0,
        has_more: false
      });
      socialAccountRepository.upsertTikTokAccount.mockResolvedValue({ id: 'sa_tiktok_1' });

      const result = await tiktokService.syncChannelMetrics('sa_tiktok_1', '2026-05-01', '2026-05-15');

      expect(socialAccountRepository.findById).toHaveBeenCalledWith('sa_tiktok_1');
      expect(socialAccountRepository.upsertTikTokAccount).toHaveBeenCalledWith(
        'brand_123',
        expect.objectContaining({
          pageId: 'user_tiktok_id',
          username: 'tiktok_test_user',
          followersCount: 1500,
          analytics: expect.any(Object)
        }),
        expect.objectContaining({
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token'
        }),
        // enqueueSync: false — syncChannelMetrics IS the sync job; it must not
        // re-enqueue another one via the outbox or it loops forever.
        { enqueueSync: false }
      );
      expect(result.id).toBe('sa_tiktok_1');
    });
  });
});
