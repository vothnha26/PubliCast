const { channelInsightFacade, audienceInsightFacade, channelAdapterFactory, audienceAdapterFactory } = require('../../src/core/insights');
const socialAuthFactory = require('../../src/core/auth/social-auth.factory');
const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const channelSnapshotRepository = require('../../src/repositories/social/channel-snapshot.repository');
const { PLATFORMS } = require('../../src/utils/constants');

jest.mock('../../src/core/auth/social-auth.factory');
jest.mock('../../src/services/social/youtube/youtube.gateway');
jest.mock('../../src/repositories/social/channel-snapshot.repository');

describe('Core Insights Architecture (Vertical Slice: YouTube)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Factories', () => {
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
      expect(() => channelAdapterFactory.getAdapter('UNSUPPORTED')).toThrow();
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

    // Regression test (2026-08-10): the subscribers-count reconstructible
    // entry's `column` must be the literal 'followersCount' — that's the
    // only name ChannelSnapshotRepository's FOLLOWER_COLUMNS set recognizes
    // to route into the typed followersCount DB column. It used to be
    // 'subscribersCount' (YouTube's own terminology), which silently fell
    // through into the `metrics` JSON blob instead, leaving followersCount
    // stuck at 0 in every ChannelMetricDaily row despite the real value
    // being present under metrics.subscribersCount.
    it('routes the subscriber-count reconstructible entry to the typed followersCount column', async () => {
      channelSnapshotRepository.upsertChannelSnapshots.mockResolvedValue([{ id: 'snap1' }]);

      const analyticsData = {
        statistics: { videoCount: '7', subscriberCount: '16', viewCount: '5664' },
        growthRows: [{ date: '2026-08-10', subscribersGained: 0, subscribersLost: 0, views: 100 }]
      };

      await channelInsightFacade.upsertChannelSnapshots(
        PLATFORMS.YOUTUBE,
        'brand1',
        'acc123',
        analyticsData
      );

      const [, , , , current] = channelSnapshotRepository.upsertChannelSnapshots.mock.calls[0];
      const subscriberEntry = current.reconstructible.find((r) => r.currentValue === 16);
      expect(subscriberEntry).toBeDefined();
      expect(subscriberEntry.column).toBe('followersCount');
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
