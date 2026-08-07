/**
 * YouTube Quota Guard Tests — youtube-analytics.service.js#getVideoAnalytics
 *
 * Verifies the quota-aware getVideoAnalytics wiring added on top of the
 * existing real-API-call path:
 * 1. Over-budget: returns isFallback:true rows WITHOUT calling the gateway
 * 2. Under-budget: calls the gateway and records quota usage
 * 3. Gateway/API error: also returns isFallback:true (not a bare zero-fill)
 *    so callers never mistake a failure for a genuine 0-view day
 * 4. Fallback rows are distinguishable from genuine zero-view rows
 */

jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  incr: jest.fn(),
  incrBy: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  del: jest.fn()
}));
jest.mock('../../src/services/social/quota-tracker.service', () => {
  return jest.fn().mockImplementation(() => ({
    getCurrentUsage: jest.fn().mockResolvedValue(0),
    incrementAndGet: jest.fn().mockResolvedValue(1)
  }));
});
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/youtube/youtube.gateway');
jest.mock('../../src/config/prisma', () => ({
  postAnalyticsDailySnapshot: { count: jest.fn().mockResolvedValue(1) }
}));
const QuotaTrackerService = require('../../src/services/social/quota-tracker.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const { ANALYTICS } = require('../../src/utils/constants');
const { YOUTUBE_QUOTA_THRESHOLD, YOUTUBE_DAILY_QUOTA_LIMIT } = ANALYTICS;
const youtubeAnalytics = require('../../src/services/social/youtube/youtube-analytics.service');

const BRAND_ID = 'brand_1';
const VIDEO_ID = 'video_123';
const REAL_ACCOUNT = { platformAccountId: 'channel_1', accessToken: 'real_token' };

describe('YouTubeAnalyticsService — quota guard on getVideoAnalytics', () => {
  const quotaInstance = QuotaTrackerService.mock.results[0].value;

  beforeEach(() => {
    jest.clearAllMocks();
    quotaInstance.getCurrentUsage.mockResolvedValue(0);
    quotaInstance.incrementAndGet.mockResolvedValue(1);
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([REAL_ACCOUNT]);
  });

  it('returns isFallback:true rows without calling the gateway when quota usage is over budget', async () => {
    // Threshold (1500) is a remaining-budget floor out of the real 10000-unit
    // daily cap — the guard fires once usage climbs within that floor of the
    // limit (see youtube-analytics.service.js _isQuotaBudgetExceeded). #67:
    // previously compared against threshold*10 (15000), above the real daily
    // cap, so this guard never fired before Google's own 403 hit first.
    quotaInstance.getCurrentUsage.mockResolvedValue(YOUTUBE_DAILY_QUOTA_LIMIT - YOUTUBE_QUOTA_THRESHOLD);

    const rows = await youtubeAnalytics.getVideoAnalytics(BRAND_ID, VIDEO_ID, '2026-06-01', '2026-06-03');

    expect(youtubeGateway.getAnalyticsReportQuery).not.toHaveBeenCalled();
    expect(rows.every(r => r.isFallback === true)).toBe(true);
    expect(rows.every(r => r.views === 0)).toBe(true);
  });

  it('does not fire the guard just below the remaining-budget floor (#67 boundary)', async () => {
    quotaInstance.getCurrentUsage.mockResolvedValue(YOUTUBE_DAILY_QUOTA_LIMIT - YOUTUBE_QUOTA_THRESHOLD - 1);
    youtubeGateway.getAnalyticsReportQuery.mockResolvedValue({ data: { rows: [] } });

    await youtubeAnalytics.getVideoAnalytics(BRAND_ID, VIDEO_ID, '2026-06-01', '2026-06-01');

    expect(youtubeGateway.getAnalyticsReportQuery).toHaveBeenCalled();
  });

  it('calls the gateway and records quota usage when under budget', async () => {
    quotaInstance.getCurrentUsage.mockResolvedValue(0);
    youtubeGateway.getAnalyticsReportQuery.mockResolvedValue({
      data: { rows: [['2026-06-01', 100, 10, 2, 300]] }
    });

    const rows = await youtubeAnalytics.getVideoAnalytics(BRAND_ID, VIDEO_ID, '2026-06-01', '2026-06-01');

    expect(youtubeGateway.getAnalyticsReportQuery).toHaveBeenCalled();
    expect(quotaInstance.incrementAndGet).toHaveBeenCalledWith('youtube-analytics', 1);
    expect(rows[0].views).toBe(100);
    expect(rows[0].isFallback).toBeUndefined();
  });

  it('returns isFallback:true (not a bare zero-fill) when the gateway call throws', async () => {
    youtubeGateway.getAnalyticsReportQuery.mockRejectedValue(new Error('quotaExceeded'));

    const rows = await youtubeAnalytics.getVideoAnalytics(BRAND_ID, VIDEO_ID, '2026-06-01', '2026-06-02');

    expect(rows.every(r => r.isFallback === true)).toBe(true);
  });

  it('does NOT flag isFallback when the API genuinely returns no rows for the video (real zero)', async () => {
    youtubeGateway.getAnalyticsReportQuery.mockResolvedValue({ data: { rows: [] } });

    const rows = await youtubeAnalytics.getVideoAnalytics(BRAND_ID, VIDEO_ID, '2026-06-01', '2026-06-01');

    // No rows from a successful API call is the "real 0 views" case, not a failure —
    // _getMockVideoAnalytics(start, end) defaults isFallback to false here.
    expect(rows.every(r => r.isFallback === false)).toBe(true);
  });

  it('proceeds without the quota guard if the quota check itself throws (fail open)', async () => {
    quotaInstance.getCurrentUsage.mockRejectedValue(new Error('Redis down'));
    youtubeGateway.getAnalyticsReportQuery.mockResolvedValue({
      data: { rows: [['2026-06-01', 5, 1, 0, 100]] }
    });

    const rows = await youtubeAnalytics.getVideoAnalytics(BRAND_ID, VIDEO_ID, '2026-06-01', '2026-06-01');

    expect(youtubeGateway.getAnalyticsReportQuery).toHaveBeenCalled();
    expect(rows[0].views).toBe(5);
  });
});
