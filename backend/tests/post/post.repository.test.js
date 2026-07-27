jest.mock('../../src/config/prisma', () => ({
  post: { findUnique: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() }
}));

const postRepository = require('../../src/repositories/workspace/post.repository');

describe('PostRepository.lockAndAssertFresh', () => {
  let tx;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'post-1' }]),
      post: { findUnique: jest.fn() }
    };
  });

  it('locks the row before reading it back', async () => {
    const callOrder = [];
    tx.$queryRaw.mockImplementation(async () => { callOrder.push('lock'); return [{ id: 'post-1' }]; });
    tx.post.findUnique.mockImplementation(async () => { callOrder.push('findUnique'); return { id: 'post-1', updatedAt: new Date('2026-01-01') }; });

    await postRepository.lockAndAssertFresh('post-1', new Date('2026-01-01'), tx);

    expect(callOrder).toEqual(['lock', 'findUnique']);
  });

  it('throws 404 if the post no longer exists', async () => {
    tx.post.findUnique.mockResolvedValue(null);

    await expect(
      postRepository.lockAndAssertFresh('post-1', new Date('2026-01-01'), tx)
    ).rejects.toMatchObject({ message: 'Post not found or unauthorized', statusCode: 404 });
  });

  it('throws 409 if updatedAt no longer matches the expected snapshot', async () => {
    tx.post.findUnique.mockResolvedValue({ id: 'post-1', updatedAt: new Date('2026-01-01T00:05:00Z') });

    await expect(
      postRepository.lockAndAssertFresh('post-1', new Date('2026-01-01T00:00:00Z'), tx)
    ).rejects.toMatchObject({
      message: expect.stringContaining('modified by another request'),
      statusCode: 409
    });
  });

  it('resolves with the fresh post when updatedAt matches', async () => {
    const updatedAt = new Date('2026-01-01T00:00:00Z');
    const fresh = { id: 'post-1', updatedAt };
    tx.post.findUnique.mockResolvedValue(fresh);

    const result = await postRepository.lockAndAssertFresh('post-1', updatedAt, tx);

    expect(result).toBe(fresh);
  });
});

describe('PostRepository.claimForPublishing (#54)', () => {
  const prisma = require('../../src/config/prisma');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true and issues a conditional update when exactly one row matches', async () => {
    prisma.post.updateMany.mockResolvedValue({ count: 1 });

    const claimed = await postRepository.claimForPublishing('post-1', ['SCHEDULED', 'DRAFT', 'RETRYING']);

    expect(claimed).toBe(true);
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { id: 'post-1', status: { in: ['SCHEDULED', 'DRAFT', 'RETRYING'] } },
      data: { status: 'PUBLISHING' }
    });
  });

  it('returns false when no row matches (already claimed by a concurrent caller, or wrong status)', async () => {
    prisma.post.updateMany.mockResolvedValue({ count: 0 });

    const claimed = await postRepository.claimForPublishing('post-1', ['SCHEDULED', 'DRAFT', 'RETRYING']);

    expect(claimed).toBe(false);
  });
});

describe('PostRepository.findStaleRetrying (#107 I7)', () => {
  const prisma = require('../../src/config/prisma');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries RETRYING posts older than the threshold, oldest first, capped at limit', async () => {
    prisma.post.findMany.mockResolvedValue([{ id: 'post-1' }]);

    const result = await postRepository.findStaleRetrying(10 * 60 * 1000, 50);

    expect(result).toEqual([{ id: 'post-1' }]);
    const call = prisma.post.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('RETRYING');
    expect(call.where.updatedAt.lt).toBeInstanceOf(Date);
    expect(call.orderBy).toEqual({ updatedAt: 'asc' });
    expect(call.take).toBe(50);
  });
});
