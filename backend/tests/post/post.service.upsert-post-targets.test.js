const postService = require('../../src/services/workspace/post.service');

jest.mock('../../src/repositories/workspace/post.repository', () => ({}));
jest.mock('../../src/repositories/workspace/brand.repository', () => ({}));
jest.mock('../../src/repositories/billing/subscription.repository', () => ({}));
jest.mock('../../src/services/auth/authorization.facade', () => ({}));
jest.mock('../../src/services/workspace/approval-workflow.service', () => ({}));
jest.mock('../../src/services/workspace/post/publish-qstash.service', () => ({}));
jest.mock('../../src/repositories/core/outbox-event.repository', () => ({}));
jest.mock('../../src/config/prisma', () => ({}));

function makeTx({ socialAccounts = [] } = {}) {
  return {
    postTarget: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 })
    },
    socialAccount: {
      findMany: jest.fn((args) => {
        const { where } = args;
        return Promise.resolve(
          socialAccounts.filter((a) => {
            if (where.id && !where.id.in.includes(a.id)) return false;
            if (where.brandId && a.brandId !== where.brandId) return false;
            if (where.platform?.in && !where.platform.in.includes(a.platform)) return false;
            if (where.isConnected !== undefined && a.isConnected !== where.isConnected) return false;
            return true;
          })
        );
      })
    }
  };
}

describe('PostService.upsertPostTargets', () => {
  const brandId = 'brand-1';

  it('creates one PostTarget per platform when selectedAccountIds is the {PLATFORM: [ids]} object shape', async () => {
    const tx = makeTx({
      socialAccounts: [
        { id: 'acc-yt', brandId, platform: 'YOUTUBE', isConnected: true, isDefault: false, connectedAt: new Date() },
        { id: 'acc-fb', brandId, platform: 'FACEBOOK', isConnected: true, isDefault: false, connectedAt: new Date() }
      ]
    });

    await postService.upsertPostTargets(
      'post-1',
      ['YOUTUBE', 'FACEBOOK'],
      { YOUTUBE: ['acc-yt'], FACEBOOK: ['acc-fb'] },
      tx,
      brandId
    );

    expect(tx.postTarget.deleteMany).toHaveBeenCalledWith({ where: { postId: 'post-1' } });
    expect(tx.postTarget.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { postId: 'post-1', platform: 'YOUTUBE', socialAccountId: 'acc-yt' },
        { postId: 'post-1', platform: 'FACEBOOK', socialAccountId: 'acc-fb' }
      ])
    });
    expect(tx.postTarget.createMany.mock.calls[0][0].data).toHaveLength(2);
  });

  it('falls back to the first connected+default account when a platform has no requested account id', async () => {
    const tx = makeTx({
      socialAccounts: [
        { id: 'acc-default', brandId, platform: 'YOUTUBE', isConnected: true, isDefault: true, connectedAt: new Date('2020-01-01') },
        { id: 'acc-other', brandId, platform: 'YOUTUBE', isConnected: true, isDefault: false, connectedAt: new Date('2020-01-02') }
      ]
    });

    await postService.upsertPostTargets('post-1', ['YOUTUBE'], { YOUTUBE: [] }, tx, brandId);

    expect(tx.postTarget.createMany).toHaveBeenCalledWith({
      data: [{ postId: 'post-1', platform: 'YOUTUBE', socialAccountId: 'acc-default' }]
    });
  });

  it('resolves a flat array of account ids to whichever platform each id actually belongs to', async () => {
    const tx = makeTx({
      socialAccounts: [
        { id: 'acc-yt', brandId, platform: 'YOUTUBE', isConnected: true },
        { id: 'acc-fb', brandId, platform: 'FACEBOOK', isConnected: true }
      ]
    });

    await postService.upsertPostTargets('post-1', ['YOUTUBE', 'FACEBOOK'], ['acc-yt', 'acc-fb'], tx, brandId);

    expect(tx.postTarget.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { postId: 'post-1', platform: 'YOUTUBE', socialAccountId: 'acc-yt' },
        { postId: 'post-1', platform: 'FACEBOOK', socialAccountId: 'acc-fb' }
      ])
    });
  });

  it('throws a 400 when a requested account id does not belong to this brand/platform', async () => {
    const tx = makeTx({
      socialAccounts: [{ id: 'acc-other-brand', brandId: 'some-other-brand', platform: 'YOUTUBE', isConnected: true }]
    });

    await expect(
      postService.upsertPostTargets('post-1', ['YOUTUBE'], { YOUTUBE: ['acc-other-brand'] }, tx, brandId)
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(tx.postTarget.createMany).not.toHaveBeenCalled();
  });

  it('skips a platform entirely when it has no requested account and no connected fallback account', async () => {
    const tx = makeTx({ socialAccounts: [] });

    await postService.upsertPostTargets('post-1', ['YOUTUBE'], { YOUTUBE: [] }, tx, brandId);

    expect(tx.postTarget.createMany).not.toHaveBeenCalled();
  });
});
