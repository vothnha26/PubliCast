const { postInsightFacade, channelInsightFacade, audienceInsightFacade, postAdapterFactory, channelAdapterFactory, audienceAdapterFactory } = require('../../src/core/insights');
const socialAuthFactory = require('../../src/core/auth/social-auth.factory');
const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const postInsightRepository = require('../../src/repositories/social/post-insight.repository');
const channelSnapshotRepository = require('../../src/repositories/social/channel-snapshot.repository');
const { PLATFORMS } = require('../../src/utils/constants');

jest.mock('../../src/core/auth/social-auth.factory');
jest.mock('../../src/services/social/youtube/youtube.gateway');
jest.mock('../../src/repositories/social/post-insight.repository');
jest.mock('../../src/repositories/social/channel-snapshot.repository');

describe('Core Insights Architecture (Vertical Slice: YouTube)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Factories', () => {
    it('should correctly register and retrieve YouTube PostInsightAdapter', () => {
      expect(postAdapterFactory.isSupported(PLATFORMS.YOUTUBE)).toBe(true);
      const adapter = postAdapterFactory.getAdapter(PLATFORMS.YOUTUBE);
      expect(adapter.platform).toBe(PLATFORMS.YOUTUBE);
    });

    it('should correctly register and retrieve YouTube ChannelAdapter', () => {
      expect(channelAdapterFactory.isSupported(PLATFORMS.YOUTUBE)).toBe(true);
      const adapter = channelAdapterFactory.getAdapter(PLATFORMS.YOUTUBE);
      expect(adapter.platform).toBe(PLATFORMS.YOUTUBE);
    });

    it('should correctly register and retrieve YouTube AudienceAdapter', () => {
      expect(audienceAdapterFactory.isSupported(PLATFORMS.YOUTUBE)).toBe(true);
      const adapter = audienceAdapterFactory.getAdapter(PLATFORMS.YOUTUBE);
      expect(adapter.platform).toBe(PLATFORMS.YOUTUBE);
    });

    it('should throw error for unsupported platform', () => {
      expect(() => postAdapterFactory.getAdapter('UNSUPPORTED')).toThrow();
    });
  });

  describe('PostInsightFacade & YouTubePostInsightAdapter', () => {
    it('should return empty metrics if auth fails', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue(null);

      const result = await postInsightFacade.getPostInsights('brand1', PLATFORMS.YOUTUBE, 'video123');

      expect(result).toEqual({
        views: 0,
        watchTime: 0,
        totalWatchHrs: 0,
        avgViewDuration: 0,
        likes: 0,
        comments: 0,
        shares: 0
      });
    });

    it('should return cached metrics if cache hit', async () => {
      const mockAuth = { auth: {}, socialAccountId: 'acc123' };
      const mockCacheData = { views: 500, likes: 50, comments: 5 };
      socialAuthFactory.getAuthClient.mockResolvedValue(mockAuth);
      postInsightRepository.getFresh.mockResolvedValue({
        rawInsightsJson: JSON.stringify(mockCacheData)
      });

      const result = await postInsightFacade.getPostInsights('brand1', PLATFORMS.YOUTUBE, 'video123');

      expect(result).toEqual(mockCacheData);
      expect(youtubeGateway.getAnalyticsReportQuery).not.toHaveBeenCalled();
    });

    it('should fetch live metrics from API and persist when cache miss', async () => {
      const mockAuth = { auth: {}, socialAccountId: 'acc123' };
      socialAuthFactory.getAuthClient.mockResolvedValue(mockAuth);
      postInsightRepository.getFresh.mockResolvedValue(null);
      youtubeGateway.getAnalyticsReportQuery.mockResolvedValue({
        data: {
          rows: [['1000', '100', '10', '5', '120.0', '120']]
        }
      });
      postInsightRepository.persist.mockResolvedValue({});

      const result = await postInsightFacade.getPostInsights('brand1', PLATFORMS.YOUTUBE, 'video123');

      expect(result).toEqual({
        views: 1000,
        watchTime: 2,
        totalWatchHrs: 2,
        avgViewDuration: 120,
        likes: 100,
        comments: 10,
        shares: 5
      });
      expect(postInsightRepository.persist).toHaveBeenCalled();
    });
  });

  describe('ChannelInsightFacade & YouTubeChannelAdapter', () => {
    it('should execute upsertChannelSnapshots via channelInsightFacade', async () => {
      channelSnapshotRepository.upsertChannelSnapshots.mockResolvedValue([{ id: 'snap1' }]);

      const analyticsData = {
        statistics: { videoCount: '10', subscriberCount: '500', viewCount: '20000' },
        growthRows: [{ date: '2026-08-08', subscribersGained: 5, views: 100 }]
      };

      const result = await channelInsightFacade.upsertChannelSnapshots(
        PLATFORMS.YOUTUBE,
        'brand1',
        'acc123',
        analyticsData
      );

      expect(result).toEqual([{ id: 'snap1' }]);
      expect(channelSnapshotRepository.upsertChannelSnapshots).toHaveBeenCalledWith(
        expect.anything(),
        'brand1',
        'acc123',
        PLATFORMS.YOUTUBE,
        expect.objectContaining({
          staticColumns: { totalVideosCount: 10 }
        }),
        expect.any(Array),
        true
      );
    });
  });

  describe('AudienceInsightFacade & YouTubeAudienceAdapter', () => {
    it('should fetch demographics, geography, trafficSources and persist formatted JSON', async () => {
      const mockAuth = { auth: {}, socialAccountId: 'acc123' };
      socialAuthFactory.getAuthClient.mockResolvedValue(mockAuth);

      youtubeGateway.getAnalyticsReportQuery
        .mockResolvedValueOnce({
          data: { rows: [['age18-24', 'male', '25.4'], ['age25-34', 'female', '18.2']] }
        })
        .mockResolvedValueOnce({
          data: { rows: [['VN', '1500'], ['US', '350']] }
        })
        .mockResolvedValueOnce({
          data: { rows: [['SUGGESTED_VIDEO', '800', '2400.0']] }
        });

      const mockModel = {
        upsert: jest.fn().mockResolvedValue({ id: 'aud-snap-1' })
      };

      const adapter = audienceAdapterFactory.getAdapter(PLATFORMS.YOUTUBE);
      jest.spyOn(adapter, 'getPrismaModel').mockReturnValue(mockModel);

      const result = await audienceInsightFacade.syncAudienceSnapshot(
        PLATFORMS.YOUTUBE,
        'brand1',
        'acc123'
      );

      expect(result).toEqual({ id: 'aud-snap-1' });
      expect(mockModel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            socialAccountId_snapshotDate_platform: expect.objectContaining({
              socialAccountId: 'acc123',
              platform: PLATFORMS.YOUTUBE
            })
          },
          create: expect.objectContaining({
            platform: PLATFORMS.YOUTUBE,
            ageDistribution: [
              { ageGroup: '18-24', gender: 'male', percentage: 25.4 },
              { ageGroup: '25-34', gender: 'female', percentage: 18.2 }
            ],
            genderDistribution: null,
            countryDistribution: [
              { countryCode: 'VN', views: 1500 },
              { countryCode: 'US', views: 350 }
            ],
            trafficSourceDistribution: [
              { sourceType: 'SUGGESTED_VIDEO', views: 800, minutesWatched: 2400 }
            ]
          })
        })
      );
    });
  });
});
