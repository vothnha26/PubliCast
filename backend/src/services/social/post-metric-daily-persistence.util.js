const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const { getBrandToday } = require('../../utils/brand-timezone.util');

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

  // "Today" resolved in the brand's own timezone, not the server's — see
  // channel-snapshot.repository.js's identical comment for why.
  const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { timezone: true } });
  const snapshotDate = getBrandToday(brand?.timezone);
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
 * @param {string} brandId
 * @param {string} platform
 * @param {string|null} socialAccountId
 * @param {number} limit
 */
async function findLatestPostMetrics(brandId, platform, socialAccountId = null, limit = 10) {
  // Order by snapshotDate desc first (NOT platformPostId first — that would
  // sample the alphabetically-earliest posts instead of the most recently
  // synced ones) so the dedupe loop below keeps each post's newest row
  // before the `take` cap can exclude a recently-published post.
  const rows = await prisma.postMetricDaily.findMany({
    where: {
      brandId,
      platform,
      ...(socialAccountId ? { socialAccountId } : {})
    },
    orderBy: [{ snapshotDate: 'desc' }, { platformPostId: 'asc' }],
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

  // Re-sort by publishedAt/snapshotDate desc for display (the platformPostId
  // grouping above scrambles chronological order).
  latest.sort((a, b) => {
    const aTime = (a.publishedAt || a.snapshotDate).getTime();
    const bTime = (b.publishedAt || b.snapshotDate).getTime();
    return bTime - aTime;
  });

  return latest;
}

module.exports = {
  upsertPostMetricsDaily,
  findLatestPostMetrics
};
