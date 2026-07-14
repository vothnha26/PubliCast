jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  setEx: jest.fn()
}));
jest.mock('../../src/services/social/facebook/facebook.gateway');
jest.mock('../../src/repositories/social/social-account.repository');

const redisMock = require('../../src/config/redis');
const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const facebookPostService = require('../../src/services/social/facebook/facebook-post.service');

const BRAND_ID = 'brand_1';
const POST_ID = 'post_123';
const REAL_ACCOUNT = {
  platformAccountId: 'page_123',
  accessToken: 'real_page_token'
};
const MOCK_ACCOUNT = {
  platformAccountId: 'mock-page-123',
  accessToken: 'mock-page-token'
};

/**
 * Recursively compute the "shape" of an object — same key set and value
 * types, ignoring actual values. Used to assert mock and real responses
 * are structurally interchangeable (implementation_plan.md Verification
 * Plan: "Kiểm thử tự động tính nhất quán cấu trúc dữ liệu (Mock vs Real)").
 */
function getShape(obj) {
  if (Array.isArray(obj)) return ['array'];
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, getShape(v)])
    );
  }
  return typeof obj;
}

describe('FacebookPostService — Post Insights & Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.get.mockResolvedValue(null);
    redisMock.setEx.mockResolvedValue('OK');
  });

  describe('getPostDetails — mock token branch', () => {
    it('returns a fully-populated mock response without calling the gateway', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([MOCK_ACCOUNT]);

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(facebookGateway.getPostDetails).not.toHaveBeenCalled();
      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
      expect(result.id).toBe(POST_ID);
      expect(result.platform).toBe('facebook');
      expect(result.reactions.breakdown).toEqual(
        expect.objectContaining({ LIKE: expect.any(Number), LOVE: expect.any(Number) })
      );
      expect(result.demographics).toEqual({ available: false, reason: 'deprecated_by_platform', data: null });
    });
  });

  describe('getPostDetails — real token, cache miss', () => {
    it('calls the gateway, assembles the response, and writes it to Redis', async () => {
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
      facebookGateway.getPageDemographics.mockResolvedValue({
        ageGender: { available: false, reason: 'deprecated_by_platform', data: null },
        geography: { available: true, reason: null, data: { Vietnam: 400, 'United States': 100 } }
      });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(facebookGateway.getPostDetails).toHaveBeenCalledWith(POST_ID, REAL_ACCOUNT.accessToken);
      expect(facebookGateway.getPostInsights).toHaveBeenCalledWith(POST_ID, REAL_ACCOUNT.accessToken);
      expect(facebookGateway.getPostReactionsBreakdown).toHaveBeenCalledWith(POST_ID, REAL_ACCOUNT.accessToken);

      expect(result.reach).toBe(500);
      expect(result.views).toBe(800);
      expect(result.clicks).toBe(15);
      expect(result.linkClicks).toBe(10);
      expect(result.comments).toBe(4);
      expect(result.shares).toBe(2);
      expect(result.reactions.total).toBe(20);
      expect(result.reactions.breakdown.LIKE).toBe(15);
      expect(result.geography.available).toBe(true);

      expect(redisMock.setEx).toHaveBeenCalledWith(
        `fb:post-insights:${BRAND_ID}:${POST_ID}`,
        300,
        expect.any(String)
      );
    });

    it('caches page demographics separately from post insights (fb:page-demographics)', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      facebookGateway.getPostDetails.mockResolvedValue({ id: POST_ID, created_time: '2026-05-24T12:00:00+0000' });
      facebookGateway.getPostInsights.mockResolvedValue([]);
      facebookGateway.getPostReactionsBreakdown.mockResolvedValue({ LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 });
      facebookGateway.getPageDemographics.mockResolvedValue({
        ageGender: { available: false, reason: 'deprecated_by_platform', data: null },
        geography: { available: false, reason: 'insufficient_data', data: null }
      });

      await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(redisMock.setEx).toHaveBeenCalledWith(
        `fb:page-demographics:${BRAND_ID}`,
        3600,
        expect.any(String)
      );
    });
  });

  describe('getPostDetails — cache hit', () => {
    it('returns the cached value and never calls the gateway', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      const cached = { id: POST_ID, platform: 'facebook', reach: 999 };
      redisMock.get.mockImplementation(async (key) => {
        if (key === `fb:post-insights:${BRAND_ID}:${POST_ID}`) return JSON.stringify(cached);
        return null;
      });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(result).toEqual(cached);
      expect(facebookGateway.getPostDetails).not.toHaveBeenCalled();
      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
    });
  });

  describe('getPostDetails — gateway failure (FacebookInsightsError)', () => {
    it('propagates the error instead of silently swallowing it', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      const gatewayError = new Error('Token expired');
      gatewayError.code = 190;
      gatewayError.status = 401;
      gatewayError.postId = POST_ID;
      facebookGateway.getPostInsights.mockRejectedValue(gatewayError);
      facebookGateway.getPostDetails.mockResolvedValue({ id: POST_ID, created_time: '2026-05-24T12:00:00+0000' });
      facebookGateway.getPostReactionsBreakdown.mockResolvedValue({ LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 });

      await expect(facebookPostService.getPostDetails(BRAND_ID, POST_ID)).rejects.toThrow('Token expired');
      expect(redisMock.setEx).not.toHaveBeenCalled();
    });
  });

  describe('getPostAnalytics', () => {
    it('mock token: returns a single-point mock series without calling the gateway', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([MOCK_ACCOUNT]);

      const result = await facebookPostService.getPostAnalytics(BRAND_ID, POST_ID, null, null);

      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual(
        expect.objectContaining({ date: expect.any(String), views: expect.any(Number), reach: expect.any(Number) })
      );
    });

    it('real token: derives a timeseries point from post insights', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      facebookGateway.getPostInsights.mockResolvedValue([
        { name: 'post_total_media_view_unique', values: [{ value: 250 }] },
        { name: 'post_media_view', values: [{ value: 400 }] }
      ]);

      const result = await facebookPostService.getPostAnalytics(BRAND_ID, POST_ID, null, null);

      expect(result[0].reach).toBe(250);
      expect(result[0].views).toBe(400);
    });
  });

  describe('Mock vs Real response shape consistency', () => {
    it('getPostDetails: mock and real responses have identical shape (available: true case)', async () => {
      socialAccountRepository.findByBrandAndPlatform
        .mockResolvedValueOnce([MOCK_ACCOUNT])
        .mockResolvedValueOnce([REAL_ACCOUNT]);

      const mockResult = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      facebookGateway.getPostDetails.mockResolvedValue({
        id: POST_ID,
        message: 'Real post',
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
        { name: 'post_media_view', values: [{ value: 800 }] }
      ]);
      facebookGateway.getPostReactionsBreakdown.mockResolvedValue({
        LIKE: 15, LOVE: 3, HAHA: 1, WOW: 1, SAD: 0, ANGRY: 0
      });
      facebookGateway.getPageDemographics.mockResolvedValue({
        ageGender: { available: false, reason: 'deprecated_by_platform', data: null },
        geography: { available: true, reason: null, data: { Vietnam: 400 } }
      });

      const realResult = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      // geography.data is a dynamic country->count map — compare everything else structurally
      const stripDynamicGeoData = (r) => ({ ...r, geography: { ...r.geography, data: null } });

      expect(getShape(stripDynamicGeoData(mockResult))).toEqual(getShape(stripDynamicGeoData(realResult)));
    });

    it('getPostDetails: geography available:false (insufficient_data) keeps the same shape as available:true', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      facebookGateway.getPostDetails.mockResolvedValue({ id: POST_ID, created_time: '2026-05-24T12:00:00+0000' });
      facebookGateway.getPostInsights.mockResolvedValue([]);
      facebookGateway.getPostReactionsBreakdown.mockResolvedValue({ LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 });
      facebookGateway.getPageDemographics.mockResolvedValue({
        ageGender: { available: false, reason: 'deprecated_by_platform', data: null },
        geography: { available: false, reason: 'insufficient_data', data: null }
      });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(result.geography).toEqual({ available: false, reason: 'insufficient_data', data: null });
      // available:false must still expose the same keys as available:true so the
      // frontend never has to special-case a missing field (implementation_plan.md
      // "Field optional có mặt dù rỗng" checklist item).
      expect(Object.keys(result.geography).sort()).toEqual(['available', 'data', 'reason']);
    });

    it('reactions breakdown always exposes all 6 reaction types, even at zero', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      facebookGateway.getPostDetails.mockResolvedValue({ id: POST_ID, created_time: '2026-05-24T12:00:00+0000' });
      facebookGateway.getPostInsights.mockResolvedValue([]);
      facebookGateway.getPostReactionsBreakdown.mockResolvedValue({
        LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0
      });
      facebookGateway.getPageDemographics.mockResolvedValue({
        ageGender: { available: false, reason: 'deprecated_by_platform', data: null },
        geography: { available: false, reason: 'insufficient_data', data: null }
      });

      const result = await facebookPostService.getPostDetails(BRAND_ID, POST_ID);

      expect(Object.keys(result.reactions.breakdown).sort()).toEqual(
        ['ANGRY', 'HAHA', 'LOVE', 'LIKE', 'SAD', 'WOW'].sort()
      );
    });
  });
});
