// getPostDetails is now DB-only (Smart Fetch): reads the latest PostMetricDaily
// row for the post and never calls the live Graph API — see
// FacebookPostService#getPostDetails/_formatDetailMetricRow. Per-reaction-type
// breakdown is no longer persisted (only the aggregate total is), so
// reactions.breakdown is always {} here — the live gateway call that used to
// populate it now only happens from syncPublishedPosts (Sync-only).
jest.mock('../../src/services/social/facebook/facebook.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/config/prisma', () => ({
  postMetricDaily: {
    findFirst: jest.fn()
  }
}));

const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const prismaMock = require('../../src/config/prisma');
const facebookPostService = require('../../src/services/social/facebook/facebook-post.service');

const BRAND_ID = 'brand_1';
const POST_ID = 'post_123';

describe('FacebookPostService — Post Insights & Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.postMetricDaily.findFirst.mockResolvedValue(null);
  });

  describe('getPostDetails — DB has no PostMetricDaily row for this post', () => {
    it('returns null and never calls the gateway', async () => {
      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(result).toBeNull();
      expect(facebookGateway.getPostDetails).not.toHaveBeenCalled();
      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
    });
  });

  describe('getPostDetails — DB has a PostMetricDaily row', () => {
    it('formats the row into the expected response shape without calling the gateway', async () => {
      prismaMock.postMetricDaily.findFirst.mockResolvedValue({
        platformPostId: POST_ID,
        postType: 'IMAGE',
        captionSnippet: 'Hello world',
        thumbnailUrl: 'http://img.jpg',
        postUrl: 'http://fb.com/post_123',
        publishedAt: new Date('2026-05-24T12:00:00Z'),
        reach: 999,
        comments: 4,
        shares: 2,
        metrics: {
          reactions: 20,
          videoViews: 500,
          linkClicks: 10,
          otherClicks: 5
        }
      });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(facebookGateway.getPostDetails).not.toHaveBeenCalled();
      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
      expect(result.postDetails.id).toBe(POST_ID);
      expect(result.postDetails.message).toBe('Hello world');
      expect(result.postDetails.platform).toBe('facebook');
      expect(result.reach).toBe(999);
      expect(result.views).toBe(500);
      expect(result.comments).toBe(4);
      expect(result.shares).toBe(2);
      expect(result.clicks).toBe(15);
      expect(result.reactions.total).toBe(20);
    });
  });

  describe('response shape consistency', () => {
    it('reactions.breakdown is always present (empty object — per-type breakdown is not persisted)', async () => {
      prismaMock.postMetricDaily.findFirst.mockResolvedValue({
        platformPostId: POST_ID,
        postType: 'IMAGE',
        captionSnippet: null,
        thumbnailUrl: null,
        postUrl: null,
        publishedAt: null,
        reach: 0,
        comments: 0,
        shares: 0,
        metrics: {}
      });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(result.reactions.breakdown).toEqual({});
      expect(result.reactions.total).toBe(0);
    });
  });
});
