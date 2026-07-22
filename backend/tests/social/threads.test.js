/**
 * Regression tests for #97: Threads service previously masked real errors
 * and fabricated metrics as if they were measured data:
 * - getChannelInfo's catch fallback returned a fake account
 *   (followersCount:1500, followingCount:300, mediaCount:10) on ANY error.
 * - getAnalyticsReport estimated views as likes*12 from the feed when
 *   insights were unavailable, and derived viewsBreakdown from that
 *   already-fabricated number using a fixed 90/10 ratio.
 * - getPublishedVideos estimated views/reach as likes*12 / likes*8 per post.
 */
jest.mock('../../src/services/social/threads/threads.gateway');
jest.mock('../../src/repositories/social/social-account.repository');

const threadsGateway = require('../../src/services/social/threads/threads.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const threadsService = require('../../src/services/social/threads');
const { PLATFORMS } = require('../../src/utils/constants');

describe('ThreadsService (#97)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getChannelInfo', () => {
    it('does not fabricate followers/following/media counts when the real API call fails', async () => {
      threadsGateway.getAccountDetails.mockRejectedValue(new Error('Invalid OAuth access token'));

      const result = await threadsService.getChannelInfo({ accessToken: 'expired-token' });

      expect(result.followersCount).toBeNull();
      expect(result.followingCount).toBeNull();
      expect(result.mediaCount).toBeNull();
      expect(result.degraded).toBe(true);
      expect(result.error).toBe('Invalid OAuth access token');
    });

    it('returns real profile data on success', async () => {
      threadsGateway.getAccountDetails.mockResolvedValue({
        id: 'threads-1',
        username: 'real_user',
        name: 'Real User',
        threads_biography: 'bio'
      });

      const result = await threadsService.getChannelInfo({ accessToken: 'real-token' });

      expect(result.igAccountId).toBe('threads-1');
      expect(result.username).toBe('real_user');
      expect(result.degraded).toBeUndefined();
    });
  });

  describe('getAnalyticsReport', () => {
    it('does not estimate views from likes (no more reactions*12) and omits viewsBreakdown', async () => {
      threadsGateway.getInsights.mockRejectedValue(new Error('Missing threads_insights permission'));
      threadsGateway.getThreadsMediaFeed.mockResolvedValue({
        data: [{ id: 'p1', timestamp: new Date().toISOString(), like_count: 100, media_type: 'TEXT' }],
        nextPageToken: null,
        prevPageToken: null
      });

      const result = await threadsService.getAnalyticsReport(
        { accessToken: 'real-token', igAccountId: 'threads-1' },
        null,
        null
      );

      const parsed = JSON.parse(result.audienceDemographicsJson);
      const dayWithPost = parsed.growth.find(d => d.totalContent > 0);

      expect(dayWithPost).toBeDefined();
      expect(dayWithPost.views).toBe(0); // not 100 * 12
      expect(parsed.interactions.viewsBreakdown).toBeUndefined();
    });
  });

  describe('getPublishedVideos', () => {
    it('does not fabricate per-post views/reach/engagement from likes', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { platformAccountId: 'threads-1', accessToken: 'real-token' }
      ]);
      threadsGateway.getThreadsMediaFeed.mockResolvedValue({
        data: [{ id: 'p1', text: 'Hello', like_count: 50, timestamp: new Date().toISOString(), media_type: 'TEXT' }],
        nextPageToken: null,
        prevPageToken: null
      });

      const result = await threadsService.getPublishedVideos('brand-1');

      expect(result.data[0].views).toBeNull(); // not 50 * 12
      expect(result.data[0].reach).toBeNull(); // not 50 * 8
      expect(result.data[0].engagement).toBeNull();
      expect(result.data[0].reactions).toBe(50);
    });
  });
});
