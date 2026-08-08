/**
 * Regression test for #68: youtube-analytics-enhanced.service.js's video
 * insights query used `ids: 'contentOwner==MINE'` — only valid for YouTube
 * Content Owner (CMS/MCN) accounts. A normal channel account gets a 403 from
 * that call, silently nulling out the metric. Must be `channel==MINE` for
 * regular accounts.
 *
 * The 6 separate per-metric sub-queries this originally covered
 * (_fetchInsightsSummary/TrafficSource/DeviceType/Demographics/Geography/
 * SearchTerms) were since consolidated into a single _buildInsights() call
 * to cut quota usage — this test now covers that one call site instead.
 */
jest.mock('../../src/config/redis', () => ({}));
jest.mock('../../src/services/social/youtube/youtube.gateway', () => ({
  getAnalyticsReportQuery: jest.fn().mockResolvedValue({ data: { rows: [] } })
}));

const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const YouTubeAnalyticsEnhancedService = require('../../src/services/social/youtube/youtube-analytics-enhanced.service');
const youtubeAnalyticsEnhanced = new YouTubeAnalyticsEnhancedService();

const AUTH = { credentials: { access_token: 'real-token' } };
const VIDEO_ID = 'video-123';

describe('YouTubeAnalyticsEnhancedService per-video insight fetcher (#68)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('_buildInsights queries channel==MINE, not contentOwner==MINE', async () => {
    await youtubeAnalyticsEnhanced._buildInsights(AUTH, VIDEO_ID);

    const callArgs = youtubeGateway.getAnalyticsReportQuery.mock.calls[0][1];
    expect(callArgs.ids).toBe('channel==MINE');
  });
});
