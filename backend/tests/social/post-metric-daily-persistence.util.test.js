const { upsertPostMetricsDaily, findLatestPostMetrics } = require('../../src/services/social/post-metric-daily-persistence.util');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/prisma', () => ({
  postMetricDaily: {
    upsert: jest.fn(),
    findMany: jest.fn()
  }
}));

describe('post-metric-daily-persistence.util', () => {
  const brandId = 'brand-123';
  const socialAccountId = 'acc-123';
  const platform = 'FACEBOOK';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertPostMetricsDaily', () => {
    it('returns an empty array and does nothing for an empty/missing posts list', async () => {
      expect(await upsertPostMetricsDaily(brandId, socialAccountId, platform, [])).toEqual([]);
      expect(await upsertPostMetricsDaily(brandId, socialAccountId, platform, null)).toEqual([]);
      expect(prisma.postMetricDaily.upsert).not.toHaveBeenCalled();
    });

    it('upserts on (socialAccountId, platformPostId, snapshotDate) with today as the snapshot date', async () => {
      prisma.postMetricDaily.upsert.mockResolvedValue({ id: 'row-1' });

      await upsertPostMetricsDaily(brandId, socialAccountId, platform, [
        { platformPostId: 'post-1', views: 10, likes: 2, metrics: { engagementRate: 5 } }
      ]);

      expect(prisma.postMetricDaily.upsert).toHaveBeenCalledTimes(1);
      const call = prisma.postMetricDaily.upsert.mock.calls[0][0];
      expect(call.where.socialAccountId_platformPostId_snapshotDate.socialAccountId).toBe(socialAccountId);
      expect(call.where.socialAccountId_platformPostId_snapshotDate.platformPostId).toBe('post-1');
      expect(call.where.socialAccountId_platformPostId_snapshotDate.snapshotDate).toBeInstanceOf(Date);
      expect(call.create).toMatchObject({ brandId, socialAccountId, platform, platformPostId: 'post-1', views: 10, likes: 2, metrics: { engagementRate: 5 } });
      expect(call.update).toMatchObject({ views: 10, likes: 2 });
      expect(call.update.fetchedAt).toBeInstanceOf(Date);
    });

    it('skips posts without a platformPostId', async () => {
      await upsertPostMetricsDaily(brandId, socialAccountId, platform, [{ views: 10 }]);
      expect(prisma.postMetricDaily.upsert).not.toHaveBeenCalled();
    });

    it('is best-effort — one failed upsert does not stop the others', async () => {
      prisma.postMetricDaily.upsert
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce({ id: 'row-2' });

      const results = await upsertPostMetricsDaily(brandId, socialAccountId, platform, [
        { platformPostId: 'post-1', views: 1 },
        { platformPostId: 'post-2', views: 2 }
      ]);

      expect(prisma.postMetricDaily.upsert).toHaveBeenCalledTimes(2);
      expect(results).toEqual([{ id: 'row-2' }]);
    });

    it('nulls out unset optional fields rather than leaving them undefined', async () => {
      prisma.postMetricDaily.upsert.mockResolvedValue({ id: 'row-1' });

      await upsertPostMetricsDaily(brandId, socialAccountId, platform, [{ platformPostId: 'post-1' }]);

      const call = prisma.postMetricDaily.upsert.mock.calls[0][0];
      expect(call.create).toMatchObject({
        postType: null,
        publishedAt: null,
        reach: null,
        views: null,
        likes: null,
        comments: null,
        shares: null,
        captionSnippet: null,
        thumbnailUrl: null,
        postUrl: null,
        metrics: null
      });
    });
  });

  describe('findLatestPostMetrics', () => {
    it('dedupes to the newest snapshotDate row per platformPostId and returns them newest-published-first', async () => {
      prisma.postMetricDaily.findMany.mockResolvedValue([
        { platformPostId: 'post-1', snapshotDate: new Date('2026-01-03'), publishedAt: new Date('2026-01-01') },
        { platformPostId: 'post-1', snapshotDate: new Date('2026-01-02'), publishedAt: new Date('2026-01-01') },
        { platformPostId: 'post-2', snapshotDate: new Date('2026-01-03'), publishedAt: new Date('2026-01-02') }
      ]);

      const result = await findLatestPostMetrics(brandId, platform, socialAccountId, 10);

      expect(result).toHaveLength(2);
      expect(result[0].platformPostId).toBe('post-2');
      expect(result[1].platformPostId).toBe('post-1');
      expect(result[1].snapshotDate).toEqual(new Date('2026-01-03'));
    });

    it('scopes the query by socialAccountId only when one is provided', async () => {
      prisma.postMetricDaily.findMany.mockResolvedValue([]);

      await findLatestPostMetrics(brandId, platform, null, 10);
      expect(prisma.postMetricDaily.findMany.mock.calls[0][0].where).toEqual({ brandId, platform });

      await findLatestPostMetrics(brandId, platform, socialAccountId, 10);
      expect(prisma.postMetricDaily.findMany.mock.calls[1][0].where).toEqual({ brandId, platform, socialAccountId });
    });

    it('caps results at the requested limit', async () => {
      prisma.postMetricDaily.findMany.mockResolvedValue([
        { platformPostId: 'post-1', snapshotDate: new Date('2026-01-03'), publishedAt: new Date('2026-01-01') },
        { platformPostId: 'post-2', snapshotDate: new Date('2026-01-03'), publishedAt: new Date('2026-01-02') },
        { platformPostId: 'post-3', snapshotDate: new Date('2026-01-03'), publishedAt: new Date('2026-01-03') }
      ]);

      const result = await findLatestPostMetrics(brandId, platform, socialAccountId, 2);

      expect(result).toHaveLength(2);
    });

    it('orders the DB query by snapshotDate first so recently-synced posts are not skipped once an account has many days of history', async () => {
      // A post with a late-sorting platformPostId ("post-z") synced daily
      // for many days used to be excluded entirely by an
      // orderBy:[{platformPostId:'asc'}] + take:limit*5 query, because the
      // fetch window sampled only the alphabetically-first ids. Assert the
      // query orders by snapshotDate desc first.
      prisma.postMetricDaily.findMany.mockResolvedValue([]);

      await findLatestPostMetrics(brandId, platform, socialAccountId, 10);

      expect(prisma.postMetricDaily.findMany.mock.calls[0][0].orderBy).toEqual([
        { snapshotDate: 'desc' },
        { platformPostId: 'asc' }
      ]);
    });

    it('does not lose the newest post once many older posts each have several days of history', async () => {
      // Simulate an account with 8 older posts (5 snapshot rows each) plus
      // one freshly-published post with a single row — matching what the DB
      // would return for a query correctly ordered by snapshotDate desc.
      const olderRows = [];
      for (let p = 1; p <= 8; p++) {
        for (let d = 1; d <= 5; d++) {
          olderRows.push({
            platformPostId: `post-old-${p}`,
            snapshotDate: new Date(`2026-01-0${d}`),
            publishedAt: new Date('2025-12-01')
          });
        }
      }
      const rows = [
        { platformPostId: 'post-new', snapshotDate: new Date('2026-01-05'), publishedAt: new Date('2026-01-05') },
        ...olderRows
      ].sort((a, b) => b.snapshotDate.getTime() - a.snapshotDate.getTime());

      prisma.postMetricDaily.findMany.mockResolvedValue(rows.slice(0, 10 * 5));

      const result = await findLatestPostMetrics(brandId, platform, socialAccountId, 10);

      expect(result.map(r => r.platformPostId)).toContain('post-new');
    });
  });
});
