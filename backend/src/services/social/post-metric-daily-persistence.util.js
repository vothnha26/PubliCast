const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

/**
 * Shared Sync-only persistence for the unified post-level daily time series
 * (`PostMetricDaily`, see schema.prisma's own comment) — used by every
 * platform's Sync function (cron scheduler / OAuth-connect backfill / manual
 * refresh), never by a read path. Mirrors youtube-video-persistence.util.js's
 * / channel-snapshot.repository.js's shape: common columns kept typed
 * (reach/views/likes/comments/shares), everything platform-specific routed
 * into `metrics` JSON.
 *
 * Real calendar-day granularity — upserts on
 * (socialAccountId, platformPostId, snapshotDate), so re-syncing the same
 * post later the same day updates that day's row in place instead of
 * duplicating it; a new day creates a new row (a real time series, unlike
 * every table this replaced).
 *
 * @param {string} brandId
 * @param {string} socialAccountId
 * @param {string} platform - PLATFORMS constant
 * @param {Array<{
 *   platformPostId: string,
 *   postType?: string,
 *   publishedAt?: Date|string|null,
 *   reach?: number|null,
 *   views?: number|null,
 *   likes?: number|null,
 *   comments?: number|null,
 *   shares?: number|null,
 *   captionSnippet?: string|null,
 *   thumbnailUrl?: string|null,
 *   postUrl?: string|null,
 *   metrics?: object|null
 * }>} posts - one entry per post to persist; `platformPostId` is required,
 *   everything else optional/nullable ("no real data source for this
 *   platform/metric" stays null, never coerced to 0 — same convention
 *   channel-snapshot.repository.js already established).
 */
async function upsertPostMetricsDaily(brandId, socialAccountId, platform, posts) {
  if (!Array.isArray(posts) || posts.length === 0) return [];

  const todayStr = new Date().toISOString().split('T')[0];
  const snapshotDate = new Date(todayStr);
  const results = [];

  for (const post of posts) {
    if (!post.platformPostId) continue;

    try {
      const data = {
        postType: post.postType ?? null,
        publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
        reach: post.reach ?? null,
        views: post.views ?? null,
        likes: post.likes ?? null,
        comments: post.comments ?? null,
        shares: post.shares ?? null,
        captionSnippet: post.captionSnippet ?? null,
        thumbnailUrl: post.thumbnailUrl ?? null,
        postUrl: post.postUrl ?? null,
        metrics: post.metrics ?? null
      };

      const result = await prisma.postMetricDaily.upsert({
        where: {
          socialAccountId_platformPostId_snapshotDate: {
            socialAccountId,
            platformPostId: post.platformPostId,
            snapshotDate
          }
        },
        update: { ...data, fetchedAt: new Date() },
        create: {
          brandId,
          socialAccountId,
          platform,
          platformPostId: post.platformPostId,
          snapshotDate,
          ...data
        }
      });
      results.push(result);
    } catch (err) {
      logger.warn(`[PostMetricDailyPersistenceUtil] Failed to upsert post ${post.platformPostId}:`, err.message);
    }
  }

  return results;
}

/**
 * DB-only read for a platform's list view — the Smart Fetch read-path
 * contract: newest snapshotDate row per distinct platformPostId, scoped to
 * brand/platform (and optionally one account), no live API call. Returns an
 * empty array if Sync hasn't populated anything yet — callers must not
 * fall back to a live fetch on empty (that would defeat Smart Fetch).
 *
 * startDate/endDate MUST be applied here, before the dedupe+`take limit`
 * cut below — not by the caller filtering this function's already-limited
 * result. Every post synced on the same day shares one `snapshotDate`
 * (Sync runs once and stamps all of them together), so ordering by
 * `snapshotDate desc` alone leaves ties broken by `platformPostId asc`
 * (alphabetical id, unrelated to publish recency) to pick which N survive
 * the `take` cap. A caller-side date filter applied AFTER that cut could
 * legitimately end up with zero results even when real matching posts
 * exist in the table, simply because they lost the alphabetical draw
 * before ever being filtered (#YT-published-videos-empty, 2026-08-10).
 *
 * @param {string} brandId
 * @param {string} platform
 * @param {string|null} socialAccountId
 * @param {number} limit
 * @param {string|null} startDate - 'yyyy-MM-dd', inclusive, matched against publishedAt (falls back to snapshotDate when publishedAt is null)
 * @param {string|null} endDate - 'yyyy-MM-dd', inclusive (end of day)
 */
async function findLatestPostMetrics(brandId, platform, socialAccountId = null, limit = 10, startDate = null, endDate = null) {
  const dateFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1);
  // publishedAt is the real recency signal but can be null ("platform has no
  // real data for this field" — see upsertPostMetricsDaily's doc comment);
  // OR in snapshotDate as a fallback so a null-publishedAt post synced
  // within range still matches, mirroring the old in-memory fallback
  // (row.publishedAt || row.snapshotDate) this replaces.
  const dateWhere = (startDate || endDate)
    ? { OR: [{ publishedAt: dateFilter }, { AND: [{ publishedAt: null }, { snapshotDate: dateFilter }] }] }
    : {};

  // Order by publishedAt desc (falling back to snapshotDate when null via
  // MySQL's COALESCE, since NULLS handling differs across DBs and Prisma
  // has no portable "order by A ?? B") so the dedupe loop below keeps each
  // post's most publish-recent row, and the `take` cap drops the actually-
  // oldest posts instead of an alphabetically-arbitrary set of them.
  const rows = await prisma.postMetricDaily.findMany({
    where: {
      brandId,
      platform,
      ...(socialAccountId ? { socialAccountId } : {}),
      ...dateWhere
    },
    orderBy: [{ publishedAt: 'desc' }, { snapshotDate: 'desc' }, { platformPostId: 'asc' }],
    take: limit * 5 // over-fetch since multiple days per post can appear before dedupe
  });

  const seen = new Set();
  const latest = [];
  for (const row of rows) {
    if (seen.has(row.platformPostId)) continue;
    seen.add(row.platformPostId);
    latest.push(row);
    if (latest.length >= limit) break;
  }

  return latest;
}

module.exports = {
  upsertPostMetricsDaily,
  findLatestPostMetrics
};
