const prisma = require('../../config/prisma');

/**
 * Shared DB-first cache read/write for per-post insight fetches (a single
 * post's lifetime analytics — reach/views/reactions/etc.), used by every
 * platform's getPostInsights/getPostDetails. Counterpart to
 * channel-snapshot.repository.js's ChannelSnapshotRepository, but simpler:
 * post-level insight has no date-series/backfill concept — a post has
 * exactly one "current" cached row, not one row per day.
 *
 * Two storage strategies exist across platforms' Prisma models, selected via
 * `isUniqueKeyed`:
 *  - true (e.g. FacebookPostMetric, @@unique([socialAccountId, platformPostId])):
 *    one row per post, upserted on every fetch.
 *  - false (e.g. YouTubeVideoMetric, no unique constraint): append-only,
 *    every fetch inserts a new row; freshness reads the newest one.
 * This mirrors why the two models were built differently to begin with —
 * YouTube's rawInsightsJson stores an evolving multi-part payload where
 * append-only makes each fetch cheap to write, while Facebook's structured
 * columns suit an upsert. Neither is "more correct"; this repository just
 * stops each platform's service from re-deriving the same staleness-check +
 * persist + emit logic on top of whichever one it uses.
 */
class PostInsightRepository {
  /**
   * @param {object} prismaModel - e.g. client.youTubeVideoMetric or client.facebookPostMetric
   * @param {{ socialAccountId: string, platformPostId: string }} lookupKey
   * @param {number} staleMs - freshness window; platform decides (YouTube and Facebook both use 24h — Analytics data itself lags that long at the source)
   * @param {boolean} isUniqueKeyed
   * @returns {Promise<object|null>} the freshest row within staleMs, or null (cache miss/stale — caller should fetch live)
   */
  async getFresh(prismaModel, lookupKey, staleMs, isUniqueKeyed) {
    const { socialAccountId, platformPostId } = lookupKey;

    const row = isUniqueKeyed
      ? await prismaModel.findUnique({
          where: { socialAccountId_platformPostId: { socialAccountId, platformPostId } }
        })
      : (await prismaModel.findMany({
          where: { socialAccountId, platformVideoId: platformPostId },
          orderBy: { fetchedAt: 'desc' },
          take: 1
        }))[0];

    if (!row) return null;
    if (Date.now() - row.fetchedAt.getTime() >= staleMs) return null;
    return row;
  }

  /**
   * @param {object} prismaModel
   * @param {{ socialAccountId: string, platformPostId: string }} lookupKey
   * @param {object} data - column values for this fetch (shape is platform-specific, decided by the caller)
   * @param {boolean} isUniqueKeyed
   */
  async persist(prismaModel, lookupKey, data, isUniqueKeyed) {
    const { socialAccountId, platformPostId } = lookupKey;

    if (isUniqueKeyed) {
      return prismaModel.upsert({
        where: { socialAccountId_platformPostId: { socialAccountId, platformPostId } },
        create: { socialAccountId, platformPostId, ...data },
        update: { ...data, fetchedAt: new Date() }
      });
    }

    return prismaModel.create({
      data: { socialAccountId, platformVideoId: platformPostId, ...data }
    });
  }
}

module.exports = new PostInsightRepository();
