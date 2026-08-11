jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findByBrandAndPlatform: jest.fn()
}));
jest.mock('../../src/services/social/social-platform.factory', () => ({
  isSupported: jest.fn().mockReturnValue(true)
}));
jest.mock('../../src/repositories/admin/platform-daily-limit.repository', () => ({
  findAll: jest.fn()
}));
jest.mock('../../src/repositories/workspace/post-target.repository', () => ({
  countPublishedInLast24hBatch: jest.fn()
}));

const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const platformDailyLimitRepository = require('../../src/repositories/admin/platform-daily-limit.repository');
const postTargetRepository = require('../../src/repositories/workspace/post-target.repository');
const postingUsageService = require('../../src/services/workspace/posting-usage.service');

describe('PostingUsageService#getDailyUsageForBrand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns configured usage with remaining count for accounts with a daily limit', async () => {
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
      { id: 'acc-1', platform: 'FACEBOOK', displayName: 'My Page', username: 'mypage', platformAccountId: 'fb-page-1' }
    ]);
    platformDailyLimitRepository.findAll.mockResolvedValue([{ platform: 'FACEBOOK', maxPostsPerDay: 35 }]);
    postTargetRepository.countPublishedInLast24hBatch.mockResolvedValue(new Map([['acc-1', 10]]));

    const result = await postingUsageService.getDailyUsageForBrand('brand-1');

    expect(postTargetRepository.countPublishedInLast24hBatch).toHaveBeenCalledWith([
      { socialAccountId: 'acc-1', platform: 'FACEBOOK', platformAccountId: 'fb-page-1' }
    ]);
    expect(result).toEqual([{
      socialAccountId: 'acc-1',
      platform: 'FACEBOOK',
      displayName: 'My Page',
      username: 'mypage',
      configured: true,
      publishedCount: 10,
      maxPostsPerDay: 35,
      remaining: 25
    }]);
  });

  it('clamps remaining to 0 instead of going negative when over the cap', async () => {
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
      { id: 'acc-1', platform: 'FACEBOOK', displayName: 'My Page', username: 'mypage', platformAccountId: 'fb-page-1' }
    ]);
    platformDailyLimitRepository.findAll.mockResolvedValue([{ platform: 'FACEBOOK', maxPostsPerDay: 35 }]);
    postTargetRepository.countPublishedInLast24hBatch.mockResolvedValue(new Map([['acc-1', 40]]));

    const result = await postingUsageService.getDailyUsageForBrand('brand-1');

    expect(result[0].remaining).toBe(0);
  });

  it('returns configured:false and excludes the platform from the batch count for platforms with no limit configured', async () => {
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
      { id: 'acc-1', platform: 'REDDIT', displayName: 'r/test', username: 'test', platformAccountId: 'reddit-1' }
    ]);
    platformDailyLimitRepository.findAll.mockResolvedValue([]);
    postTargetRepository.countPublishedInLast24hBatch.mockResolvedValue(new Map());

    const result = await postingUsageService.getDailyUsageForBrand('brand-1');

    expect(result).toEqual([{
      socialAccountId: 'acc-1',
      platform: 'REDDIT',
      displayName: 'r/test',
      username: 'test',
      configured: false,
      publishedCount: 0,
      maxPostsPerDay: null,
      remaining: null
    }]);
    expect(postTargetRepository.countPublishedInLast24hBatch).toHaveBeenCalledWith([]);
  });
});
