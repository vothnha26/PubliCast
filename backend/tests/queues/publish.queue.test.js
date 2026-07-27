/**
 * Regression tests for #106: remove-then-add against the same jobId is not
 * atomic. safeUpsertPublishJob closes the gap by checking whether a job for
 * this id is currently `active` (a worker is executing it right now) before
 * touching it — remove() silently can't cancel an active job, so a plain
 * remove+add would either lose the reschedule (deduped away) or coexist as a
 * genuine duplicate once the active job finishes.
 *
 * NODE_ENV=test makes publish.queue.js export a jest.fn()-based mock queue
 * instead of a real BullMQ Queue (avoids opening a Redis connection here).
 */
const { publishQueue, safeUpsertPublishJob } = require('../../src/queues/publish.queue');

describe('safeUpsertPublishJob (#106)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes and re-adds when no job currently exists for this id', async () => {
    publishQueue.getJob.mockResolvedValue(null);

    const result = await safeUpsertPublishJob('publish-post-1', 'publish-post', { postId: '1' }, { delay: 5000 });

    expect(result).toEqual({ applied: true });
    expect(publishQueue.remove).toHaveBeenCalledWith('publish-post-1');
    expect(publishQueue.add).toHaveBeenCalledWith('publish-post', { postId: '1' }, { delay: 5000, jobId: 'publish-post-1' });
  });

  it('removes and re-adds when the existing job is waiting/delayed (not active)', async () => {
    publishQueue.getJob.mockResolvedValue({ getState: jest.fn().mockResolvedValue('delayed') });

    const result = await safeUpsertPublishJob('publish-post-1', 'publish-post', { postId: '1' }, {});

    expect(result).toEqual({ applied: true });
    expect(publishQueue.remove).toHaveBeenCalledWith('publish-post-1');
    expect(publishQueue.add).toHaveBeenCalled();
  });

  it('skips remove/add when a job for this id is currently active', async () => {
    publishQueue.getJob.mockResolvedValue({ getState: jest.fn().mockResolvedValue('active') });

    const result = await safeUpsertPublishJob('publish-post-1', 'publish-post', { postId: '1' }, {});

    expect(result).toEqual({ applied: false });
    expect(publishQueue.remove).not.toHaveBeenCalled();
    expect(publishQueue.add).not.toHaveBeenCalled();
  });
});
