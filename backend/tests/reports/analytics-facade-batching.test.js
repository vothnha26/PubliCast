/**
 * Regression tests for #76: analytics.facade.js#getAggregatedData previously
 * ran per-account analytics.findFirst x2 + post.count, and per-post-per-
 * platform facebookPostMetric/trackedVideo.findFirst — an N+1 fan-out.
 * These verify the batched findMany/groupBy replacements are actually used
 * (not per-row queries) and still produce the same channel/post metrics.
 */
jest.mock('../../src/config/prisma', () => ({
  brand: { findUnique: jest.fn() },
  socialAccount: { findMany: jest.fn() },
  analytics: { findMany: jest.fn() },
  post: { groupBy: jest.fn(), findMany: jest.fn() },
  facebookPostMetric: { findMany: jest.fn() },
  trackedVideo: { findMany: jest.fn() }
}));
jest.mock('../../src/services/social/social-platform.factory', () => ({
  getService: jest.fn(() => ({
    getPublishedVideos: jest.fn().mockResolvedValue({ data: [] })
  }))
}));

const prisma = require('../../src/config/prisma');
const analyticsFacade = require('../../src/services/reports/analytics.facade');

const DATE_FROM = new Date('2026-06-01');
const DATE_TO = new Date('2026-06-30');

describe('analyticsFacade.getAggregatedData batching (#76)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.brand.findUnique.mockResolvedValue({ id: 'brand-1', name: 'Test Brand' });
  });

  it('issues one analytics.findMany per pass (not one per account) for multiple accounts', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([
      { id: 'acc-1', platform: 'FACEBOOK', displayName: 'Page 1', facebookPage: { followersCount: 100 } },
      { id: 'acc-2', platform: 'YOUTUBE', displayName: 'Channel 1', youtubeChannel: { subscribersCount: 200 } }
    ]);
    prisma.analytics.findMany.mockResolvedValue([]);
    prisma.post.groupBy.mockResolvedValue([]);
    prisma.post.findMany.mockResolvedValue([]);

    await analyticsFacade.getAggregatedData('brand-1', DATE_FROM, DATE_TO, ['Facebook', 'YouTube']);

    // 2 calls total (in-range pass + any-time fallback pass), not 2 per account (would be 4).
    expect(prisma.analytics.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.analytics.findMany.mock.calls[0][0].where.socialAccountId).toEqual({ in: ['acc-1', 'acc-2'] });
  });

  it('uses post.groupBy instead of one post.count per account', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([
      { id: 'acc-1', platform: 'FACEBOOK', displayName: 'Page 1', facebookPage: { followersCount: 100 } },
      { id: 'acc-2', platform: 'YOUTUBE', displayName: 'Channel 1', youtubeChannel: { subscribersCount: 200 } }
    ]);
    prisma.analytics.findMany.mockResolvedValue([]);
    prisma.post.groupBy.mockResolvedValue([
      { targetPlatforms: 'FACEBOOK', _count: 3 },
      { targetPlatforms: 'YOUTUBE,FACEBOOK', _count: 2 }
    ]);
    prisma.post.findMany.mockResolvedValue([]);

    const result = await analyticsFacade.getAggregatedData('brand-1', DATE_FROM, DATE_TO, ['Facebook', 'YouTube']);

    expect(prisma.post.groupBy).toHaveBeenCalledTimes(1);
    const fbChannel = result.channels.find(c => c.platform === 'FACEBOOK');
    const ytChannel = result.channels.find(c => c.platform === 'YOUTUBE');
    // FACEBOOK matches both grouped rows (3 + 2 = 5); YOUTUBE matches only the second row (2).
    expect(fbChannel.postsCount).toBe(5);
    expect(ytChannel.postsCount).toBe(2);
  });

  it('batches facebookPostMetric/trackedVideo lookups by ID instead of one findFirst per post', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([]);
    prisma.post.groupBy.mockResolvedValue([]);
    prisma.post.findMany.mockResolvedValue([
      { id: 'post-1', title: 'Post 1', caption: 'c1', targetPlatforms: 'FACEBOOK', platformPostId: 'fb-post-1', publishedAt: DATE_FROM },
      { id: 'post-2', title: 'Post 2', caption: 'c2', targetPlatforms: 'YOUTUBE', platformPostId: 'yt-video-1', publishedAt: DATE_FROM }
    ]);
    prisma.facebookPostMetric.findMany.mockResolvedValue([
      { platformPostId: 'fb-post-1', likes: 10, comments: 2, shares: 1, reach: 500 }
    ]);
    prisma.trackedVideo.findMany.mockResolvedValue([
      { videoId: 'yt-video-1', lastLikes: 20, lastComments: 3, lastViews: 1000 }
    ]);

    const result = await analyticsFacade.getAggregatedData('brand-1', DATE_FROM, DATE_TO, ['Facebook', 'YouTube']);

    expect(prisma.facebookPostMetric.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.facebookPostMetric.findMany).toHaveBeenCalledWith({
      where: { platformPostId: { in: ['fb-post-1'] }, brandId: 'brand-1' }
    });
    expect(prisma.trackedVideo.findMany).toHaveBeenCalledTimes(1);

    const fbPost = result.topPosts.find(p => p.platform === 'FACEBOOK');
    const ytPost = result.topPosts.find(p => p.platform === 'YOUTUBE');
    expect(fbPost.likes).toBe(10);
    expect(ytPost.likes).toBe(20);
  });

  it('does not call facebookPostMetric/trackedVideo findMany at all when there are no matching posts', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([]);
    prisma.post.groupBy.mockResolvedValue([]);
    prisma.post.findMany.mockResolvedValue([]);

    await analyticsFacade.getAggregatedData('brand-1', DATE_FROM, DATE_TO, ['Facebook']);

    expect(prisma.facebookPostMetric.findMany).not.toHaveBeenCalled();
    expect(prisma.trackedVideo.findMany).not.toHaveBeenCalled();
  });
});
