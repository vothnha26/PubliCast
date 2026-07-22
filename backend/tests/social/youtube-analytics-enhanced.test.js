/**
 * Regression test for #68: youtube-analytics-enhanced.service.js's 6 per-video
 * insight fetchers used `ids: 'contentOwner==MINE'` — only valid for YouTube
 * Content Owner (CMS/MCN) accounts. A normal channel account gets a 403 from
 * every one of these calls, silently nulling out the metric. Must be
 * `channel==MINE` for regular accounts.
 */
jest.mock('../../src/config/redis', () => ({}));
jest.mock('../../src/services/social/youtube/youtube.gateway', () => ({
  getAnalyticsReportQuery: jest.fn().mockResolvedValue({ rows: [] })
}));

const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const YouTubeAnalyticsEnhancedService = require('../../src/services/social/youtube/youtube-analytics-enhanced.service');
const youtubeAnalyticsEnhanced = new YouTubeAnalyticsEnhancedService();

const AUTH = { credentials: { access_token: 'real-token' } };
const VIDEO_ID = 'video-123';

describe('YouTubeAnalyticsEnhancedService per-video insight fetchers (#68)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['_fetchInsightsSummary'],
    ['_fetchInsightsTrafficSource'],
    ['_fetchInsightsDeviceType'],
    ['_fetchInsightsDemographics'],
    ['_fetchInsightsGeography'],
    ['_fetchInsightsSearchTerms']
  ])('%s queries channel==MINE, not contentOwner==MINE', async (methodName) => {
    await youtubeAnalyticsEnhanced[methodName](AUTH, VIDEO_ID);

    const callArgs = youtubeGateway.getAnalyticsReportQuery.mock.calls[0][1];
    expect(callArgs.ids).toBe('channel==MINE');
  });
});
