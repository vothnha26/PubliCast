jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  setEx: jest.fn()
}));
jest.mock('../../src/services/social/facebook/facebook.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/config/prisma', () => ({
  postAnalyticsDailySnapshot: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn()
  },
  post: {
    findFirst: jest.fn()
  }
}));
jest.mock('../../src/services/social/distributed-lock.service', () => {
  return jest.fn().mockImplementation(() => ({
    acquireLock: jest.fn(),
    releaseLock: jest.fn()
  }));
});

const redisMock = require('../../src/config/redis');
const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const prismaMock = require('../../src/config/prisma');
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
    prismaMock.post.findFirst.mockResolvedValue(null);
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

  describe('getPostAnalytics', () => {
    it('mock token: returns a single-point mock series without calling the gateway', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([MOCK_ACCOUNT]);

      const result = await facebookPostService.getPostAnalytics(BRAND_ID, POST_ID, null, null);

      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
      expect(Array.isArray(result.series)).toBe(true);
      expect(result.series[0]).toEqual(
        expect.objectContaining({ date: expect.any(String), views: expect.any(Number), reach: expect.any(Number) })
      );
      expect(result.historicalDataAvailableFrom).toEqual(expect.any(String));
    });

    it('real token, snapshots already exist: reads the series from PostAnalyticsDailySnapshot instead of calling the gateway', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      prismaMock.postAnalyticsDailySnapshot.count.mockResolvedValue(1);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      prismaMock.postAnalyticsDailySnapshot.findMany.mockResolvedValue([
        { date: today, viewsCumulative: 400, reachCumulative: 250, clicksCumulative: 10, reactionsCumulative: 5, isEstimated: false }
      ]);
      prismaMock.postAnalyticsDailySnapshot.findFirst.mockResolvedValue({ date: today });

      const result = await facebookPostService.getPostAnalytics(
        BRAND_ID, POST_ID, today.toISOString().split('T')[0], today.toISOString().split('T')[0]
      );

      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
      expect(result.series[0].reach).toBe(250);
      expect(result.series[0].views).toBe(400);
      expect(result.series[0].isEstimated).toBe(false);
    });

    it('carries forward the last known cumulative totals into gap days and flags them isEstimated=true', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      prismaMock.postAnalyticsDailySnapshot.count.mockResolvedValue(1);

      const day0 = new Date(); day0.setUTCHours(0, 0, 0, 0);
      day0.setUTCDate(day0.getUTCDate() - 2); // range start
      const day2 = new Date(day0); day2.setUTCDate(day0.getUTCDate() + 2); // range end
      // Only day0 has a real row — day1 and day2 are gaps that must carry-forward.
      prismaMock.postAnalyticsDailySnapshot.findMany.mockResolvedValue([
        { date: day0, viewsCumulative: 100, reachCumulative: 60, clicksCumulative: 5, reactionsCumulative: 3, isEstimated: false }
      ]);
      prismaMock.postAnalyticsDailySnapshot.findFirst.mockResolvedValue({ date: day0 });

      const result = await facebookPostService.getPostAnalytics(
        BRAND_ID, POST_ID, day0.toISOString().split('T')[0], day2.toISOString().split('T')[0]
      );

      expect(result.series).toHaveLength(3);
      expect(result.series[0].isEstimated).toBe(false); // real row
      expect(result.series[1].isEstimated).toBe(true);  // gap day, carried forward
      expect(result.series[1].views).toBe(100);          // same cumulative as last known
      expect(result.series[1].reach).toBe(60);
      expect(result.series[2].isEstimated).toBe(true);
      expect(result.series[2].views).toBe(100);
      expect(result.historicalDataAvailableFrom).toBe(day0.toISOString().split('T')[0]);
    });
  });

  describe('getPostAnalytics — cold start (no snapshot rows yet)', () => {
    const DistributedLockService = require('../../src/services/social/distributed-lock.service');
    // facebook-post.service.js constructs its lock service ONCE at module load time
    // (`const lockService = new DistributedLockService(redisClient)`), so there is
    // exactly one constructor call for the lifetime of this test file — capture it
    // once here rather than re-reading .mock.results (which jest.clearAllMocks()
    // wipes in the outer beforeEach).
    const lockInstance = DistributedLockService.mock.results[0].value;

    beforeEach(() => {
      prismaMock.postAnalyticsDailySnapshot.count.mockResolvedValue(0);
      prismaMock.postAnalyticsDailySnapshot.findMany.mockResolvedValue([]);
      prismaMock.postAnalyticsDailySnapshot.findFirst.mockResolvedValue(null);
      prismaMock.postAnalyticsDailySnapshot.upsert.mockResolvedValue({});
      lockInstance.acquireLock.mockReset();
      lockInstance.releaseLock.mockReset();
    });

    it('acquires the cold-start lock, seeds a baseline snapshot, then reads the series', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      facebookGateway.getPostDetails.mockResolvedValue({ id: POST_ID, created_time: '2026-05-24T12:00:00+0000' });
      facebookGateway.getPostInsights.mockResolvedValue([
        { name: 'post_total_media_view_unique', values: [{ value: 250 }] },
        { name: 'post_media_view', values: [{ value: 400 }] }
      ]);
      facebookGateway.getPostReactionsBreakdown.mockResolvedValue({ LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 });
      facebookGateway.getPageDemographics.mockResolvedValue({
        ageGender: { available: false, reason: 'deprecated_by_platform', data: null },
        geography: { available: false, reason: 'insufficient_data', data: null }
      });

      lockInstance.acquireLock.mockResolvedValue('token-abc');
      lockInstance.releaseLock.mockResolvedValue(1);

      await facebookPostService.getPostAnalytics(BRAND_ID, POST_ID, null, null);

      expect(lockInstance.acquireLock).toHaveBeenCalledWith(`lock:cold-start:${POST_ID}`, 30);
      expect(prismaMock.postAnalyticsDailySnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ platformPostId: POST_ID, isEstimated: true, viewsCumulative: 400, reachCumulative: 250 })
        })
      );
      expect(lockInstance.releaseLock).toHaveBeenCalledWith(`lock:cold-start:${POST_ID}`, 'token-abc');
    });

    it('lock not acquired, another request seeds the row during the poll window: returns the series once it appears', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      lockInstance.acquireLock.mockResolvedValue(null);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      prismaMock.postAnalyticsDailySnapshot.count
        .mockResolvedValueOnce(0) // initial existingCount check
        .mockResolvedValueOnce(0) // 1st poll: still empty
        .mockResolvedValueOnce(1); // 2nd poll: row appeared
      prismaMock.postAnalyticsDailySnapshot.findMany.mockResolvedValue([
        { date: today, viewsCumulative: 10, reachCumulative: 5, clicksCumulative: 0, reactionsCumulative: 0, isEstimated: true }
      ]);
      prismaMock.postAnalyticsDailySnapshot.findFirst.mockResolvedValue({ date: today });

      const result = await facebookPostService.getPostAnalytics(BRAND_ID, POST_ID, null, null);

      expect(facebookGateway.getPostInsights).not.toHaveBeenCalled();
      expect(result.series).toBeDefined();
      expect(result.retryAfter).toBeUndefined();
    });

    it('poll window times out and the retry-lock-acquire also fails: returns {retryAfter: 5}', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
      lockInstance.acquireLock.mockResolvedValue(null); // never acquired, on first try or retry

      // count() never flips to >0 during polling or afterward
      prismaMock.postAnalyticsDailySnapshot.count.mockResolvedValue(0);

      const result = await facebookPostService.getPostAnalytics(BRAND_ID, POST_ID, null, null);

      expect(result).toEqual({ retryAfter: 5 });
    }, 10000);
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
