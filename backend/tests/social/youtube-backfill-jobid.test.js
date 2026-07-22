/**
 * Regression test for #107 (I4): _enqueueBackfillIfNoSnapshotsYet previously
 * added a backfill job with no jobId. The count===0 check right before it is
 * a TOCTOU — N concurrent views of a fresh video (with zero persisted
 * snapshot rows) can all pass that check before any of them finishes the
 * backfill, so each one enqueues its own duplicate job. Adding a
 * jobId derived from the video id lets BullMQ's own add() dedup collapse
 * concurrent enqueues into one job.
 */
jest.mock('../../src/config/prisma', () => ({
  postAnalyticsDailySnapshot: { count: jest.fn() }
}));
jest.mock('../../src/queues/social.queue', () => ({
  socialQueue: { add: jest.fn().mockResolvedValue({ id: 'mock-job' }) }
}));

const prisma = require('../../src/config/prisma');
const { socialQueue } = require('../../src/queues/social.queue');
const youtubeAnalytics = require('../../src/services/social/youtube/youtube-analytics.service');

describe('_enqueueBackfillIfNoSnapshotsYet jobId dedup (#107 I4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enqueues the backfill job with a jobId derived from the video id', async () => {
    prisma.postAnalyticsDailySnapshot.count.mockResolvedValue(0);

    await youtubeAnalytics._enqueueBackfillIfNoSnapshotsYet('brand-1', 'video-abc');

    expect(socialQueue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ platformPostId: 'video-abc', brandId: 'brand-1' }),
      { jobId: 'backfill-video-abc' }
    );
  });

  it('does not enqueue when snapshots already exist', async () => {
    prisma.postAnalyticsDailySnapshot.count.mockResolvedValue(3);

    await youtubeAnalytics._enqueueBackfillIfNoSnapshotsYet('brand-1', 'video-abc');

    expect(socialQueue.add).not.toHaveBeenCalled();
  });
});
