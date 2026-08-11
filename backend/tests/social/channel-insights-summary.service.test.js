jest.mock('../../src/services/social/social.service', () => ({ getAggregatedMetrics: jest.fn() }));
jest.mock('../../src/services/social/social-platform.factory', () => ({ getService: jest.fn() }));
jest.mock('../../src/services/workspace/posting-usage.service', () => ({ getDailyUsageForBrand: jest.fn() }));
jest.mock('../../src/services/social/channel-group.service', () => ({ listByBrand: jest.fn() }));
jest.mock('../../src/services/workspace/post.service', () => ({ getPlatformLimits: jest.fn() }));
jest.mock('../../src/repositories/social/social-account.repository', () => ({ findByIdLite: jest.fn() }));

const socialService = require('../../src/services/social/social.service');
const socialPlatformFactory = require('../../src/services/social/social-platform.factory');
const postingUsageService = require('../../src/services/workspace/posting-usage.service');
const channelGroupService = require('../../src/services/social/channel-group.service');
const postService = require('../../src/services/workspace/post.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const channelInsightsSummaryService = require('../../src/services/social/channel-insights-summary.service');
const { PLATFORMS } = require('../../src/utils/constants');

describe('ChannelInsightsSummaryService#getSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socialService.getAggregatedMetrics.mockResolvedValue([{ id: 'acc-1' }]);
    postingUsageService.getDailyUsageForBrand.mockResolvedValue([{ socialAccountId: 'acc-1' }]);
    channelGroupService.listByBrand.mockResolvedValue([{ id: 'group-1' }]);
    postService.getPlatformLimits.mockResolvedValue([{ platform: 'YOUTUBE' }]);
  });

  it('runs all 4 brand-wide reads and returns publishedVideos:null when no socialAccountId is given', async () => {
    const result = await channelInsightsSummaryService.getSummary('brand-1', null, 'user-1');

    expect(socialAccountRepository.findByIdLite).not.toHaveBeenCalled();
    expect(socialPlatformFactory.getService).not.toHaveBeenCalled();
    expect(result.publishedVideos).toBeNull();
    expect(result.metrics).toEqual([{ id: 'acc-1' }]);
    expect(result.postingUsage).toEqual([{ socialAccountId: 'acc-1' }]);
    expect(result.channelGroups).toEqual([{ id: 'group-1' }]);
    expect(result.platformLimits).toEqual([{ platform: 'YOUTUBE' }]);
  });

  it('throws a 404 when socialAccountId does not belong to the given brand', async () => {
    socialAccountRepository.findByIdLite.mockResolvedValue({ id: 'acc-1', brandId: 'other-brand', platform: PLATFORMS.YOUTUBE });

    await expect(
      channelInsightsSummaryService.getSummary('brand-1', 'acc-1', 'user-1')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('calls YouTube getPublishedVideos with the forceSync argument in position 5', async () => {
    socialAccountRepository.findByIdLite.mockResolvedValue({ id: 'acc-1', brandId: 'brand-1', platform: PLATFORMS.YOUTUBE });
    const mockYtService = { getPublishedVideos: jest.fn().mockResolvedValue({ videos: [] }) };
    socialPlatformFactory.getService.mockReturnValue(mockYtService);

    await channelInsightsSummaryService.getSummary('brand-1', 'acc-1', 'user-1', {
      pageToken: 'tok', limit: 5, startDate: '2026-01-01', endDate: '2026-01-31'
    });

    expect(socialPlatformFactory.getService).toHaveBeenCalledWith(PLATFORMS.YOUTUBE);
    expect(mockYtService.getPublishedVideos).toHaveBeenCalledWith(
      'brand-1', 'tok', 5, 'acc-1', false, '2026-01-01', '2026-01-31'
    );
  });

  it('calls a non-YouTube platform getPublishedVideos WITHOUT the forceSync argument', async () => {
    socialAccountRepository.findByIdLite.mockResolvedValue({ id: 'acc-1', brandId: 'brand-1', platform: PLATFORMS.FACEBOOK });
    const mockFbService = { getPublishedVideos: jest.fn().mockResolvedValue({ videos: [] }) };
    socialPlatformFactory.getService.mockReturnValue(mockFbService);

    await channelInsightsSummaryService.getSummary('brand-1', 'acc-1', 'user-1', {
      pageToken: 'tok', limit: 5, startDate: '2026-01-01', endDate: '2026-01-31'
    });

    expect(mockFbService.getPublishedVideos).toHaveBeenCalledWith(
      'brand-1', 'tok', 5, 'acc-1', '2026-01-01', '2026-01-31'
    );
  });

  it('does not let a getPublishedVideos failure reject the whole summary', async () => {
    socialAccountRepository.findByIdLite.mockResolvedValue({ id: 'acc-1', brandId: 'brand-1', platform: PLATFORMS.YOUTUBE });
    const mockYtService = { getPublishedVideos: jest.fn().mockRejectedValue(new Error('YouTube API down')) };
    socialPlatformFactory.getService.mockReturnValue(mockYtService);

    const result = await channelInsightsSummaryService.getSummary('brand-1', 'acc-1', 'user-1');

    expect(result.publishedVideos).toEqual({ error: 'YouTube API down', data: [] });
    expect(result.metrics).toEqual([{ id: 'acc-1' }]);
  });
});
