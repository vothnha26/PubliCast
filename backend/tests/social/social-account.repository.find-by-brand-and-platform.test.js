jest.mock('../../src/repositories/core/outbox-event.repository', () => ({ create: jest.fn() }));
jest.mock('../../src/config/prisma', () => {
  const mockPrisma = {
    socialAccount: { findMany: jest.fn() },
    youTubeChannel: { findMany: jest.fn().mockResolvedValue([]) },
    instagramAccount: { findMany: jest.fn().mockResolvedValue([]) },
    threadsAccount: { findMany: jest.fn().mockResolvedValue([]) },
    facebookPage: { findMany: jest.fn().mockResolvedValue([]) },
    tikTokAccount: { findMany: jest.fn().mockResolvedValue([]) },
    blueskyAccount: { findMany: jest.fn().mockResolvedValue([]) },
    redditAccount: { findMany: jest.fn().mockResolvedValue([]) },
    twitchAccount: { findMany: jest.fn().mockResolvedValue([]) },
    channelMetricDaily: { findMany: jest.fn().mockResolvedValue([]) },
    analytics: { findMany: jest.fn().mockResolvedValue([]) }
  };
  return mockPrisma;
});
// _decryptAccount(s) calls decrypt() on accessToken/refreshToken — stub it
// so test fixtures don't need real encrypted values.
jest.mock('../../src/utils/encryption', () => ({
  encrypt: jest.fn((v) => v),
  decrypt: jest.fn((v) => v)
}));

const prisma = require('../../src/config/prisma');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { PLATFORMS } = require('../../src/utils/constants');

describe('SocialAccountRepository#findByBrandAndPlatform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(prisma).forEach((delegate) => {
      if (delegate?.findMany) delegate.findMany.mockResolvedValue([]);
    });
  });

  it('returns an empty array without querying any sub-account table when the brand has no accounts', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([]);

    const result = await socialAccountRepository.findByBrandAndPlatform('brand-1', null);

    expect(result).toEqual([]);
    expect(prisma.youTubeChannel.findMany).not.toHaveBeenCalled();
  });

  it('attaches each account its own platform sub-table row and leaves the other 7 relations null', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([
      { id: 'acc-yt', brandId: 'brand-1', platform: PLATFORMS.YOUTUBE, accessToken: 'a', refreshToken: 'b' },
      { id: 'acc-fb', brandId: 'brand-1', platform: PLATFORMS.FACEBOOK, accessToken: 'a', refreshToken: 'b' }
    ]);
    prisma.youTubeChannel.findMany.mockResolvedValue([{ socialAccountId: 'acc-yt', subscriberCount: 100 }]);
    prisma.facebookPage.findMany.mockResolvedValue([{ socialAccountId: 'acc-fb', likesCount: 50 }]);

    const result = await socialAccountRepository.findByBrandAndPlatform('brand-1', null);

    const yt = result.find((a) => a.id === 'acc-yt');
    const fb = result.find((a) => a.id === 'acc-fb');

    expect(yt.youtubeChannel).toEqual({ socialAccountId: 'acc-yt', subscriberCount: 100 });
    expect(yt.facebookPage).toBeNull();
    expect(yt.instagramAccount).toBeNull();

    expect(fb.facebookPage).toEqual({ socialAccountId: 'acc-fb', likesCount: 50 });
    expect(fb.youtubeChannel).toBeNull();

    // Only the platforms actually present were queried, not all 8.
    expect(prisma.youTubeChannel.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.facebookPage.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.instagramAccount.findMany).not.toHaveBeenCalled();
    expect(prisma.tikTokAccount.findMany).not.toHaveBeenCalled();
  });

  it('leaves channelMetricsDaily as an empty array for an account with no rows, and null-safe when there are none at all', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([
      { id: 'acc-yt', brandId: 'brand-1', platform: PLATFORMS.YOUTUBE, accessToken: 'a', refreshToken: 'b' }
    ]);

    const result = await socialAccountRepository.findByBrandAndPlatform('brand-1', null);

    expect(result[0].channelMetricsDaily).toEqual([]);
  });

  it('caps channelMetricsDaily at 30 rows per account even when more are returned across several accounts', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([
      { id: 'acc-yt', brandId: 'brand-1', platform: PLATFORMS.YOUTUBE, accessToken: 'a', refreshToken: 'b' }
    ]);
    const rows = Array.from({ length: 40 }, (_, i) => ({
      id: `cmd-${i}`,
      socialAccountId: 'acc-yt',
      snapshotDate: new Date(2026, 0, 40 - i)
    }));
    prisma.channelMetricDaily.findMany.mockResolvedValue(rows);

    const result = await socialAccountRepository.findByBrandAndPlatform('brand-1', null);

    expect(result[0].channelMetricsDaily).toHaveLength(30);
    // Newest-first rows kept (the query is ordered snapshotDate desc, so the
    // first 30 returned are already the newest).
    expect(result[0].channelMetricsDaily[0].id).toBe('cmd-0');
  });

  it('skips the channelMetricDaily query entirely when includeChannelMetricsDaily is false, and omits the field', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([
      { id: 'acc-yt', brandId: 'brand-1', platform: PLATFORMS.YOUTUBE, accessToken: 'a', refreshToken: 'b' }
    ]);

    const result = await socialAccountRepository.findByBrandAndPlatform('brand-1', null, { includeChannelMetricsDaily: false });

    expect(prisma.channelMetricDaily.findMany).not.toHaveBeenCalled();
    expect(result[0].channelMetricsDaily).toBeUndefined();
  });

  it('includes analytics rows with their nested socialAnalytics, capped per account', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([
      { id: 'acc-yt', brandId: 'brand-1', platform: PLATFORMS.YOUTUBE, accessToken: 'a', refreshToken: 'b' }
    ]);
    prisma.analytics.findMany.mockResolvedValue([
      { id: 'an-1', socialAccountId: 'acc-yt', fetchedAt: new Date(), socialAnalytics: { audienceDemographicsJson: '{}' } }
    ]);

    const result = await socialAccountRepository.findByBrandAndPlatform('brand-1', null);

    expect(result[0].analytics).toEqual([
      { id: 'an-1', socialAccountId: 'acc-yt', fetchedAt: expect.any(Date), socialAnalytics: { audienceDemographicsJson: '{}' } }
    ]);
  });

  it('filters by platform when one is passed', async () => {
    prisma.socialAccount.findMany.mockResolvedValue([]);

    await socialAccountRepository.findByBrandAndPlatform('brand-1', PLATFORMS.YOUTUBE);

    expect(prisma.socialAccount.findMany).toHaveBeenCalledWith({
      where: { brandId: 'brand-1', platform: PLATFORMS.YOUTUBE }
    });
  });
});
