-- Backfill: facebook_post_metrics and social_post_metrics were both
-- upsert-on-[socialAccountId, platformPostId] (one row per post, no
-- snapshotDate), so each maps to exactly one post_metrics_daily row keyed
-- by DATE(fetchedAt) — no latest-per-day dedup needed, unlike the
-- append-only tables the prior consolidation migration handled. Both were
-- already dead code paths (no live caller wrote to them via their adapters;
-- see facebook-post-insight.adapter.js / tiktok-post-insight.adapter.js
-- removal in the same change) but may still hold historical rows on a
-- populated environment, so they're backfilled rather than dropped outright,
-- same as 20260809200148_unify_post_metrics_daily's precedent.
INSERT IGNORE INTO `post_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `platformPostId`, `postType`, `publishedAt`, `snapshotDate`, `reach`, `views`, `likes`, `comments`, `shares`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), t.`brandId`, t.`socialAccountId`, 'FACEBOOK', t.`platformPostId`, CAST(t.`postType` AS CHAR), t.`publishedAt`, DATE(t.`fetchedAt`),
  t.`reach`, t.`videoViews`, t.`likes`, t.`comments`, t.`shares`,
  JSON_OBJECT('organicReach', t.`organicReach`, 'promotedReach', t.`promotedReach`, 'impressions', t.`impressions`, 'organicImpressions', t.`organicImpressions`, 'promotedImpressions', t.`promotedImpressions`, 'organicVideoViews', t.`organicVideoViews`, 'promotedVideoViews', t.`promotedVideoViews`, 'avgWatchTimeSeconds', t.`avgWatchTimeSeconds`, 'watchRate', t.`watchRate`, 'saves', t.`saves`, 'reactions', t.`reactions`, 'linkClicks', t.`linkClicks`, 'otherClicks', t.`otherClicks`, 'negativeActions', t.`negativeActions`, 'engagementRate', t.`engagementRate`, 'permalinkUrl', t.`permalinkUrl`),
  t.`fetchedAt`, t.`createdAt`
FROM `facebook_post_metrics` t;

-- social_post_metrics served Instagram/Threads/TikTok/Bluesky's dead
-- detail-view adapter (see core/insights/index.js's registration removal in
-- this change) — `platform` is a real column here (unlike
-- facebook_post_metrics, which is Facebook-only), so it carries straight
-- through.
INSERT IGNORE INTO `post_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `platformPostId`, `postType`, `publishedAt`, `snapshotDate`, `reach`, `views`, `likes`, `comments`, `shares`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), t.`brandId`, t.`socialAccountId`, t.`platform`, t.`platformPostId`, t.`postType`, t.`publishedAt`, DATE(t.`fetchedAt`),
  t.`reach`, t.`views`, t.`likes`, t.`comments`, t.`shares`,
  JSON_OBJECT('saves', t.`saves`, 'clicks', t.`clicks`, 'engagementRate', t.`engagementRate`),
  t.`fetchedAt`, t.`createdAt`
FROM `social_post_metrics` t;

-- youtube_video_metrics was append-only (one row per fetch, no unique
-- constraint) — same shape as the 5 tables the prior consolidation
-- migration handled, so it needs the same latest-per-day dedup rather than
-- a straight copy. rawInsightsJson holds the full multi-dimension payload
-- (traffic source/device/demographics/geography/search terms) that
-- post_metrics_daily has no typed or JSON slot for beyond the 6 basic
-- metrics youtube-video.service.js#getPostInsights now persists going
-- forward — preserved here under `metrics.rawInsightsJson` so no data is
-- silently dropped, even though the new write path no longer populates it.
INSERT IGNORE INTO `post_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `platformPostId`, `postType`, `publishedAt`, `snapshotDate`, `reach`, `views`, `likes`, `comments`, `shares`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), t.`brandId`, t.`socialAccountId`, 'YOUTUBE', t.`platformVideoId`, 'VIDEO', NULL, DATE(t.`fetchedAt`),
  NULL, t.`views`, t.`likes`, t.`comments`, NULL,
  JSON_OBJECT('avgWatchTime', t.`avgWatchTime`, 'rawInsightsJson', t.`rawInsightsJson`),
  t.`fetchedAt`, t.`createdAt`
FROM `youtube_video_metrics` t
INNER JOIN (
  SELECT `socialAccountId`, `platformVideoId`, DATE(`fetchedAt`) AS d, MAX(`fetchedAt`) AS maxFetchedAt
  FROM `youtube_video_metrics`
  GROUP BY `socialAccountId`, `platformVideoId`, DATE(`fetchedAt`)
) latest ON latest.`socialAccountId` = t.`socialAccountId` AND latest.`platformVideoId` = t.`platformVideoId` AND latest.maxFetchedAt = t.`fetchedAt`;

-- DropForeignKey
ALTER TABLE `facebook_post_metrics` DROP FOREIGN KEY `facebook_post_metrics_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `facebook_post_metrics` DROP FOREIGN KEY `facebook_post_metrics_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `social_post_metrics` DROP FOREIGN KEY `social_post_metrics_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `social_post_metrics` DROP FOREIGN KEY `social_post_metrics_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `youtube_video_metrics` DROP FOREIGN KEY `youtube_video_metrics_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `youtube_video_metrics` DROP FOREIGN KEY `youtube_video_metrics_socialAccountId_fkey`;

-- DropTable
DROP TABLE `facebook_post_metrics`;

-- DropTable
DROP TABLE `social_post_metrics`;

-- DropTable
DROP TABLE `youtube_video_metrics`;
