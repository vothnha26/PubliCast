jest.mock('../../src/config/prisma', () => ({}));

const postTargetRepository = require('../../src/repositories/workspace/post-target.repository');

describe('PostTargetRepository#countPublishedInLast24hBatch', () => {
  it('returns an empty Map for an empty accounts list without querying the DB', async () => {
    const client = { postTarget: { count: jest.fn() } };
    const result = await postTargetRepository.countPublishedInLast24hBatch([], client);
    expect(result.size).toBe(0);
    expect(client.postTarget.count).not.toHaveBeenCalled();
  });

  it('counts each account concurrently by its real channel identity (platformAccountId + platform)', async () => {
    const counts = { 'acc-1': 3, 'acc-2': 7 };
    const client = {
      postTarget: {
        count: jest.fn((args) => {
          const { platformAccountId, platform } = args.where.socialAccount;
          if (platformAccountId === 'yt-channel-1' && platform === 'YOUTUBE') return Promise.resolve(counts['acc-1']);
          if (platformAccountId === 'fb-page-1' && platform === 'FACEBOOK') return Promise.resolve(counts['acc-2']);
          return Promise.resolve(0);
        })
      }
    };

    const result = await postTargetRepository.countPublishedInLast24hBatch(
      [
        { socialAccountId: 'acc-1', platform: 'YOUTUBE', platformAccountId: 'yt-channel-1' },
        { socialAccountId: 'acc-2', platform: 'FACEBOOK', platformAccountId: 'fb-page-1' }
      ],
      client
    );

    expect(result.get('acc-1')).toBe(3);
    expect(result.get('acc-2')).toBe(7);
    expect(client.postTarget.count).toHaveBeenCalledTimes(2);
  });

  it('gives two socialAccountIds sharing the same real channel the same count', async () => {
    const client = {
      postTarget: {
        count: jest.fn().mockResolvedValue(5)
      }
    };

    const result = await postTargetRepository.countPublishedInLast24hBatch(
      [
        { socialAccountId: 'acc-brand-a', platform: 'YOUTUBE', platformAccountId: 'yt-channel-shared' },
        { socialAccountId: 'acc-brand-b', platform: 'YOUTUBE', platformAccountId: 'yt-channel-shared' }
      ],
      client
    );

    expect(result.get('acc-brand-a')).toBe(5);
    expect(result.get('acc-brand-b')).toBe(5);
  });

  it('only queries PUBLISHED PostTargets within the last 24h', async () => {
    const client = { postTarget: { count: jest.fn().mockResolvedValue(0) } };
    const before = Date.now();

    await postTargetRepository.countPublishedInLast24hBatch(
      [{ socialAccountId: 'acc-1', platform: 'TIKTOK', platformAccountId: 'tt-1' }],
      client
    );

    const callArgs = client.postTarget.count.mock.calls[0][0];
    expect(callArgs.where.publishStatus).toBe('PUBLISHED');
    expect(callArgs.where.publishedAt.gte.getTime()).toBeGreaterThanOrEqual(before - 24 * 60 * 60 * 1000 - 1000);
    expect(callArgs.where.publishedAt.gte.getTime()).toBeLessThanOrEqual(Date.now() - 24 * 60 * 60 * 1000 + 1000);
  });
});
