// getPostDetails is now DB-first via postInsightFacade -> FacebookPostInsightAdapter
// (see facebook-post.service.js), backed by prisma.facebookPostMetric instead of the
// old Redis-cached implementation this suite used to test — mocks below match that.
jest.mock('../../src/services/social/facebook/facebook.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/config/prisma', () => ({
  facebookPostMetric: {
    findUnique: jest.fn(),
    upsert: jest.fn()
  },
  post: {
    findFirst: jest.fn()
  }
}));

const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const prismaMock = require('../../src/config/prisma');
const facebookPostService = require('../../src/services/social/facebook/facebook-post.service');

const BRAND_ID = 'brand_1';
const POST_ID = 'post_123';
const REAL_ACCOUNT = {
  id: 'acc_real',
  brandId: BRAND_ID,
  platformAccountId: 'page_123',
  accessToken: 'real_page_token'
};
const MOCK_ACCOUNT = {
  id: 'acc_mock',
  brandId: BRAND_ID,
  platformAccountId: 'mock-page-123',
  accessToken: 'mock-page-token'
};

describe('FacebookPostService — Post Insights & Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.post.findFirst.mockResolvedValue(null);
    prismaMock.facebookPostMetric.findUnique.mockResolvedValue(null);
    prismaMock.facebookPostMetric.upsert.mockResolvedValue({});
  });

  describe('getPostDetails — mock token branch', () => {
    it('returns a fully-populated mock response without calling the gateway', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([MOCK_ACCOUNT]);

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(facebookGateway.getPostDetails).not.toHaveBeenCalled();
      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
      expect(result.postDetails.id).toBe(POST_ID);
      expect(result.postDetails.platform).toBe('facebook');
      expect(result.reactions.breakdown).toEqual(
        expect.objectContaining({ LIKE: expect.any(Number), LOVE: expect.any(Number) })
      );
    });
  });

  describe('getPostDetails — real token, DB cache miss', () => {
    it('calls the gateway, assembles the response, and persists it to facebookPostMetric', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      facebookGateway.getPostDetails.mockResolvedValue({
        id: POST_ID,
        message: 'Hello world',
        created_time: '2026-05-24T12:00:00+0000',
        full_picture: 'http://img.jpg',
        permalink_url: 'http://fb.com/post_123',
        comments: { summary: { total_count: 4 } },
        reactions: { summary: { total_count: 20 } },
        shares: { count: 2 },
        attachments: { data: [] }
      });
      facebookGateway.getPostInsights.mockResolvedValue([
        { name: 'post_total_media_view_unique', values: [{ value: 500 }] },
        { name: 'post_media_view', values: [{ value: 800 }] },
        { name: 'post_clicks_by_type', values: [{ value: { 'link clicks': 10, other: 5 } }] }
      ]);
      facebookGateway.getPostReactionsBreakdown.mockResolvedValue({
        LIKE: 15, LOVE: 3, HAHA: 1, WOW: 1, SAD: 0, ANGRY: 0
      });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(facebookGateway.getPostDetails).toHaveBeenCalledWith(POST_ID, REAL_ACCOUNT.accessToken);
      expect(facebookGateway.getPostInsights).toHaveBeenCalledWith(POST_ID, REAL_ACCOUNT.accessToken);
      expect(facebookGateway.getPostReactionsBreakdown).toHaveBeenCalledWith(POST_ID, REAL_ACCOUNT.accessToken);

      expect(result.comments).toBe(4);
      expect(result.shares).toBe(2);
      expect(result.reactions.total).toBe(20);
      expect(result.reactions.breakdown.LIKE).toBe(15);

      expect(prismaMock.facebookPostMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { socialAccountId_platformPostId: { socialAccountId: REAL_ACCOUNT.id, platformPostId: POST_ID } }
        })
      );
    });
  });

  describe('getPostDetails — DB cache hit', () => {
    it('returns the cached row and never calls the gateway', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      prismaMock.facebookPostMetric.findUnique.mockResolvedValue({
        platformPostId: POST_ID,
        postType: 'IMAGE',
        reach: 999,
        videoViews: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        reactions: 0,
        linkClicks: 0,
        otherClicks: 0,
        captionSnippet: null,
        thumbnailUrl: null,
        permalinkUrl: null,
        publishedAt: null,
        fetchedAt: new Date() // fresh — within FACEBOOK_POST_METRICS_TTL_MS
      });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(result.reach).toBe(999);
      expect(facebookGateway.getPostDetails).not.toHaveBeenCalled();
      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
    });
  });

  describe('getPostDetails — gateway failure', () => {
    it('does not fail the whole request when only insights fails — returns zeroed insights instead', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      const gatewayError = new Error('Token expired');
      gatewayError.code = 190;
      gatewayError.status = 401;
      gatewayError.postId = POST_ID;
      facebookGateway.getPostInsights.mockRejectedValue(gatewayError);
      facebookGateway.getPostDetails.mockResolvedValue({ id: POST_ID, created_time: '2026-05-24T12:00:00+0000' });
      facebookGateway.getPostReactionsBreakdown.mockResolvedValue({ LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(result.postDetails.id).toBe(POST_ID);
      expect(result.reach).toBe(0);
      expect(result.views).toBe(0);
      expect(result.clicks).toBe(0);
    });
  });

  describe('response shape consistency', () => {
    it('reactions breakdown always exposes all 6 reaction types, even at zero', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      facebookGateway.getPostDetails.mockResolvedValue({ id: POST_ID, created_time: '2026-05-24T12:00:00+0000' });
      facebookGateway.getPostInsights.mockResolvedValue([]);
      facebookGateway.getPostReactionsBreakdown.mockResolvedValue({
        LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0
      });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(Object.keys(result.reactions.breakdown).sort()).toEqual(
        ['ANGRY', 'HAHA', 'LOVE', 'LIKE', 'SAD', 'WOW'].sort()
      );
    });
  });
});
