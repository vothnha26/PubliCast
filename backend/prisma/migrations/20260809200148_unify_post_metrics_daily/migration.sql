-- CreateTable (moved ahead of the DropTable statements below so the
-- INSERT ... SELECT backfill has somewhere to copy the old post-metric
-- rows into before their source tables are dropped)
CREATE TABLE `post_metrics_daily` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL,
    `platformPostId` VARCHAR(191) NOT NULL,
    `postType` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `snapshotDate` DATE NOT NULL,
    `reach` INTEGER NULL,
    `views` INTEGER NULL,
    `likes` INTEGER NULL,
    `comments` INTEGER NULL,
    `shares` INTEGER NULL,
    `metrics` JSON NULL,
    `captionSnippet` TEXT NULL,
    `thumbnailUrl` TEXT NULL,
    `postUrl` TEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `post_metrics_daily_brandId_idx`(`brandId`),
    INDEX `post_metrics_daily_socialAccountId_platformPostId_idx`(`socialAccountId`, `platformPostId`),
    INDEX `post_metrics_daily_brandId_platform_snapshotDate_idx`(`brandId`, `platform`, `snapshotDate`),
    UNIQUE INDEX `post_metrics_daily_socialAccountId_platformPostId_snapshotDa_key`(`socialAccountId`, `platformPostId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_metrics_daily` ADD CONSTRAINT `post_metrics_daily_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_metrics_daily` ADD CONSTRAINT `post_metrics_daily_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: the 5 old tables were append-only (one row per fetch, no
-- snapshotDate, no unique constraint on post+day), unlike the new
-- calendar-day-granular post_metrics_daily. For each table, keep only the
-- LATEST fetch per (socialAccountId, platformPostId, day) — derived from
-- fetchedAt — matching what Sync itself would have produced had it run
-- once per day; earlier same-day fetches are superseded data, not history
-- that's meaningful to preserve at daily granularity. Platform-specific
-- columns with no typed equivalent on post_metrics_daily are preserved in
-- `metrics` JSON so no data is lost.
INSERT IGNORE INTO `post_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `platformPostId`, `postType`, `publishedAt`, `snapshotDate`, `reach`, `views`, `likes`, `comments`, `shares`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), t.`brandId`, t.`socialAccountId`, 'INSTAGRAM', t.`platformPostId`, t.`postType`, t.`publishedAt`, DATE(t.`fetchedAt`),
  t.`reach`, t.`views`, t.`likes`, t.`comments`, t.`shares`,
  JSON_OBJECT('saves', t.`saves`, 'clicks', t.`clicks`, 'engagementRate', t.`engagementRate`),
  t.`fetchedAt`, t.`createdAt`
FROM `instagram_post_metrics` t
INNER JOIN (
  SELECT `socialAccountId`, `platformPostId`, DATE(`fetchedAt`) AS d, MAX(`fetchedAt`) AS maxFetchedAt
  FROM `instagram_post_metrics`
  GROUP BY `socialAccountId`, `platformPostId`, DATE(`fetchedAt`)
) latest ON latest.`socialAccountId` = t.`socialAccountId` AND latest.`platformPostId` = t.`platformPostId` AND latest.maxFetchedAt = t.`fetchedAt`;

INSERT IGNORE INTO `post_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `platformPostId`, `postType`, `publishedAt`, `snapshotDate`, `reach`, `views`, `likes`, `comments`, `shares`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), t.`brandId`, t.`socialAccountId`, 'THREADS', t.`platformPostId`, NULL, t.`publishedAt`, DATE(t.`fetchedAt`),
  t.`reach`, t.`views`, t.`likes`, NULL, NULL,
  JSON_OBJECT('replies', t.`replies`, 'reposts', t.`reposts`, 'clicks', t.`clicks`),
  t.`fetchedAt`, t.`createdAt`
FROM `threads_post_metrics` t
INNER JOIN (
  SELECT `socialAccountId`, `platformPostId`, DATE(`fetchedAt`) AS d, MAX(`fetchedAt`) AS maxFetchedAt
  FROM `threads_post_metrics`
  GROUP BY `socialAccountId`, `platformPostId`, DATE(`fetchedAt`)
) latest ON latest.`socialAccountId` = t.`socialAccountId` AND latest.`platformPostId` = t.`platformPostId` AND latest.maxFetchedAt = t.`fetchedAt`;

INSERT IGNORE INTO `post_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `platformPostId`, `postType`, `publishedAt`, `snapshotDate`, `reach`, `views`, `likes`, `comments`, `shares`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), t.`brandId`, t.`socialAccountId`, 'BLUESKY', t.`platformPostId`, NULL, t.`publishedAt`, DATE(t.`fetchedAt`),
  NULL, NULL, t.`likes`, NULL, NULL,
  JSON_OBJECT('replies', t.`replies`, 'reposts', t.`reposts`, 'quotes', t.`quotes`),
  t.`fetchedAt`, t.`createdAt`
FROM `bluesky_post_metrics` t
INNER JOIN (
  SELECT `socialAccountId`, `platformPostId`, DATE(`fetchedAt`) AS d, MAX(`fetchedAt`) AS maxFetchedAt
  FROM `bluesky_post_metrics`
  GROUP BY `socialAccountId`, `platformPostId`, DATE(`fetchedAt`)
) latest ON latest.`socialAccountId` = t.`socialAccountId` AND latest.`platformPostId` = t.`platformPostId` AND latest.maxFetchedAt = t.`fetchedAt`;

INSERT IGNORE INTO `post_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `platformPostId`, `postType`, `publishedAt`, `snapshotDate`, `reach`, `views`, `likes`, `comments`, `shares`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), t.`brandId`, t.`socialAccountId`, 'FACEBOOK', t.`platformPostId`, t.`postType`, t.`publishedAt`, DATE(t.`fetchedAt`),
  t.`reach`, t.`videoViews`, t.`likes`, t.`comments`, t.`shares`,
  JSON_OBJECT('impressions', t.`impressions`, 'reactions', t.`reactions`, 'linkClicks', t.`linkClicks`, 'otherClicks', t.`otherClicks`, 'engagementRate', t.`engagementRate`),
  t.`fetchedAt`, t.`createdAt`
FROM `facebook_post_metrics_v2` t
INNER JOIN (
  SELECT `socialAccountId`, `platformPostId`, DATE(`fetchedAt`) AS d, MAX(`fetchedAt`) AS maxFetchedAt
  FROM `facebook_post_metrics_v2`
  GROUP BY `socialAccountId`, `platformPostId`, DATE(`fetchedAt`)
) latest ON latest.`socialAccountId` = t.`socialAccountId` AND latest.`platformPostId` = t.`platformPostId` AND latest.maxFetchedAt = t.`fetchedAt`;

-- tiktok_video_metrics used platformVideoId (not platformPostId) as its
-- per-video key, and never had a caption/thumbnail/publishedAt column
-- (that data was always a live-fetch-only join, never persisted here).
INSERT IGNORE INTO `post_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `platformPostId`, `postType`, `publishedAt`, `snapshotDate`, `reach`, `views`, `likes`, `comments`, `shares`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), t.`brandId`, t.`socialAccountId`, 'TIKTOK', t.`platformVideoId`, NULL, NULL, DATE(t.`fetchedAt`),
  NULL, t.`views`, t.`likes`, t.`comments`, t.`shares`,
  NULL,
  t.`fetchedAt`, t.`createdAt`
FROM `tiktok_video_metrics` t
INNER JOIN (
  SELECT `socialAccountId`, `platformVideoId`, DATE(`fetchedAt`) AS d, MAX(`fetchedAt`) AS maxFetchedAt
  FROM `tiktok_video_metrics`
  GROUP BY `socialAccountId`, `platformVideoId`, DATE(`fetchedAt`)
) latest ON latest.`socialAccountId` = t.`socialAccountId` AND latest.`platformVideoId` = t.`platformVideoId` AND latest.maxFetchedAt = t.`fetchedAt`;

-- DropForeignKey
ALTER TABLE `bluesky_post_metrics` DROP FOREIGN KEY `bluesky_post_metrics_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `bluesky_post_metrics` DROP FOREIGN KEY `bluesky_post_metrics_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `facebook_post_metrics_v2` DROP FOREIGN KEY `facebook_post_metrics_v2_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `facebook_post_metrics_v2` DROP FOREIGN KEY `facebook_post_metrics_v2_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `instagram_post_metrics` DROP FOREIGN KEY `instagram_post_metrics_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `instagram_post_metrics` DROP FOREIGN KEY `instagram_post_metrics_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `threads_post_metrics` DROP FOREIGN KEY `threads_post_metrics_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `threads_post_metrics` DROP FOREIGN KEY `threads_post_metrics_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `tiktok_video_metrics` DROP FOREIGN KEY `tiktok_video_metrics_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `tiktok_video_metrics` DROP FOREIGN KEY `tiktok_video_metrics_socialAccountId_fkey`;

-- DropTable
DROP TABLE `bluesky_post_metrics`;

-- DropTable
DROP TABLE `facebook_post_metrics_v2`;

-- DropTable
DROP TABLE `instagram_post_metrics`;

-- DropTable
DROP TABLE `threads_post_metrics`;

-- DropTable
DROP TABLE `tiktok_video_metrics`;

