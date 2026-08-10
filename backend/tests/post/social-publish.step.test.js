const SocialPublishStep = require('../../src/services/workspace/post/publish-steps/social-publish.step');

jest.mock('../../src/repositories/workspace/post-target.repository', () => ({
  updateStatus: jest.fn().mockResolvedValue(undefined),
  countPublishedInLast24h: jest.fn()
}));
jest.mock('../../src/repositories/admin/platform-daily-limit.repository', () => ({
  findByPlatform: jest.fn()
}));
jest.mock('../../src/repositories/workspace/posting-usage-daily.repository', () => ({
  incrementTodayUsage: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../src/services/core/socket-invalidation.service', () => ({
  invalidateBrandScope: jest.fn().mockReturnValue({ catch: jest.fn() })
}));
jest.mock('../../src/services/social/social-platform.factory', () => ({
  getService: jest.fn()
}));

const postTargetRepository = require('../../src/repositories/workspace/post-target.repository');
const platformDailyLimitRepository = require('../../src/repositories/admin/platform-daily-limit.repository');
const postingUsageDailyRepository = require('../../src/repositories/workspace/posting-usage-daily.repository');
const socialPlatformFactory = require('../../src/services/social/social-platform.factory');

describe('SocialPublishStep — Fair Use daily posting limit (Layer 3)', () => {
  let step;
  const post = { id: 'post-1', title: 'Test', caption: 'hello', mediaUrls: '', platformPostId: null };
  const publishPost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    step = new SocialPublishStep();
    socialPlatformFactory.getService.mockReturnValue({ publishPost });
    postTargetRepository.updateStatus.mockResolvedValue(undefined);
  });

  it('publishes normally and logs usage when no daily limit is configured for the platform', async () => {
    platformDailyLimitRepository.findByPlatform.mockResolvedValue(null);
    publishPost.mockResolvedValue({ id: 'fb-1', publishedAt: new Date() });

    const context = {
      post,
      platforms: ['FACEBOOK'],
      options: {},
      brandId: 'brand-1',
      targetsByPlatform: { FACEBOOK: ['acc-1'] }
    };

    await step.execute(context);

    expect(publishPost).toHaveBeenCalled();
    expect(context.results).toEqual([
      { platform: 'FACEBOOK', socialAccountId: 'acc-1', success: true, result: { id: 'fb-1', publishedAt: expect.any(Date) } }
    ]);
    expect(postingUsageDailyRepository.incrementTodayUsage).toHaveBeenCalledWith('brand-1', 'acc-1', 'FACEBOOK', undefined);
  });

  it('publishes and logs usage with the limit when under the cap', async () => {
    platformDailyLimitRepository.findByPlatform.mockResolvedValue({ maxPostsPerDay: 35 });
    postTargetRepository.countPublishedInLast24h.mockResolvedValue(10);
    publishPost.mockResolvedValue({ id: 'fb-1', publishedAt: new Date() });

    const context = {
      post,
      platforms: ['FACEBOOK'],
      options: {},
      brandId: 'brand-1',
      targetsByPlatform: { FACEBOOK: ['acc-1'] }
    };

    await step.execute(context);

    expect(publishPost).toHaveBeenCalled();
    expect(context.results[0]).toEqual(expect.objectContaining({ success: true }));
    expect(postingUsageDailyRepository.incrementTodayUsage).toHaveBeenCalledWith('brand-1', 'acc-1', 'FACEBOOK', 35);
  });

  it('skips the live publish call and marks FAILED when the daily cap has been reached since scheduling', async () => {
    platformDailyLimitRepository.findByPlatform.mockResolvedValue({ maxPostsPerDay: 35 });
    postTargetRepository.countPublishedInLast24h.mockResolvedValue(35);

    const context = {
      post,
      platforms: ['FACEBOOK'],
      options: {},
      brandId: 'brand-1',
      targetsByPlatform: { FACEBOOK: ['acc-1'] }
    };

    await step.execute(context);

    expect(publishPost).not.toHaveBeenCalled();
    expect(context.results).toEqual([
      { platform: 'FACEBOOK', socialAccountId: 'acc-1', success: false, error: expect.stringContaining('Daily posting limit of 35 reached') }
    ]);
    expect(postTargetRepository.updateStatus).toHaveBeenCalledWith(
      'post-1', 'FACEBOOK', 'acc-1',
      expect.objectContaining({ publishStatus: 'FAILED', errorMessage: expect.stringContaining('Daily posting limit of 35 reached') })
    );
    expect(postingUsageDailyRepository.incrementTodayUsage).not.toHaveBeenCalled();
  });

  it('does not let a usage-logging failure fail the publish result', async () => {
    platformDailyLimitRepository.findByPlatform.mockResolvedValue(null);
    publishPost.mockResolvedValue({ id: 'fb-1', publishedAt: new Date() });
    postingUsageDailyRepository.incrementTodayUsage.mockRejectedValue(new Error('DB unavailable'));

    const context = {
      post,
      platforms: ['FACEBOOK'],
      options: {},
      brandId: 'brand-1',
      targetsByPlatform: { FACEBOOK: ['acc-1'] }
    };

    await expect(step.execute(context)).resolves.toBeUndefined();
    expect(context.results[0]).toEqual(expect.objectContaining({ success: true }));
  });

  it('checks the cap independently per fanned-out account, failing only the one at cap', async () => {
    platformDailyLimitRepository.findByPlatform.mockResolvedValue({ maxPostsPerDay: 10 });
    postTargetRepository.countPublishedInLast24h.mockImplementation((socialAccountId) =>
      Promise.resolve(socialAccountId === 'acc-1' ? 10 : 2)
    );
    publishPost.mockResolvedValue({ id: 'yt-2', publishedAt: new Date() });

    const context = {
      post,
      platforms: ['YOUTUBE'],
      options: {},
      brandId: 'brand-1',
      targetsByPlatform: { YOUTUBE: ['acc-1', 'acc-2'] }
    };

    await step.execute(context);

    const byAccount = Object.fromEntries(context.results.map((r) => [r.socialAccountId, r]));
    expect(byAccount['acc-1'].success).toBe(false);
    expect(byAccount['acc-2'].success).toBe(true);
    expect(publishPost).toHaveBeenCalledTimes(1);
  });

  it('rejects at publish time even though the post passed the schedule-time check, when a congested queue fills the cap in between (Layer 3 vs Layer 1/2)', async () => {
    // Simulates: post.service.js#createPost's Layer 1/2 check ran when the
    // schedule was accepted and saw room under the cap — but this step runs
    // later (e.g. a backlog of due posts), by which point other posts to the
    // same account already consumed the day's remaining slots. Layer 3 is
    // the only thing standing between a congested queue and an over-cap
    // publish reaching the live platform API.
    platformDailyLimitRepository.findByPlatform.mockResolvedValue({ maxPostsPerDay: 5 });
    postTargetRepository.countPublishedInLast24h.mockResolvedValue(5); // filled up since scheduling

    const context = {
      post,
      platforms: ['FACEBOOK'],
      options: {},
      brandId: 'brand-1',
      targetsByPlatform: { FACEBOOK: ['acc-1'] }
    };

    await step.execute(context);

    expect(publishPost).not.toHaveBeenCalled();
    expect(context.results[0]).toEqual(expect.objectContaining({
      success: false,
      error: expect.stringContaining('Daily posting limit of 5 reached')
    }));
    // The other fanned-out targets in the same Promise.all must be
    // unaffected by this one target's rejection.
  });
});
