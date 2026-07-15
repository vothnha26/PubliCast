jest.mock('../../src/config/prisma', () => ({
  post: { findUnique: jest.fn() }
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
