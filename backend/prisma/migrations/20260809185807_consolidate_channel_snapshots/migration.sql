-- CreateTable (moved ahead of the DropTable statements below so the
-- INSERT ... SELECT backfill has somewhere to copy the old snapshot rows
-- into before their source tables are dropped)
CREATE TABLE `channel_metrics_daily` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followersGained` INTEGER NULL,
    `followersLost` INTEGER NULL,
    `metrics` JSON NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `channel_metrics_daily_brandId_idx`(`brandId`),
    INDEX `channel_metrics_daily_socialAccountId_snapshotDate_idx`(`socialAccountId`, `snapshotDate`),
    UNIQUE INDEX `channel_metrics_daily_socialAccountId_snapshotDate_platform_key`(`socialAccountId`, `snapshotDate`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `channel_metrics_daily` ADD CONSTRAINT `channel_metrics_daily_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `channel_metrics_daily` ADD CONSTRAINT `channel_metrics_daily_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: copy every existing per-platform snapshot row into the unified
-- table before its source table is dropped below. Common columns
-- (followersCount/followersGained/followersLost) map directly; every other
-- platform-specific counter is preserved inside `metrics` JSON so no data
-- is lost, even though the app doesn't read those fields back out yet.
-- Uses INSERT IGNORE since two old tables can never collide on
-- (socialAccountId, snapshotDate, platform) — each row's platform comes
-- from a single source table — but a rerun of this migration file should
-- still be a no-op rather than a duplicate-key error.
INSERT IGNORE INTO `channel_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `snapshotDate`, `followersCount`, `followersGained`, `followersLost`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), `brandId`, `socialAccountId`, 'FACEBOOK', `snapshotDate`, `followersCount`, `followersGained`, `followersLost`,
  JSON_OBJECT('likesCount', `likesCount`, 'reach', `reach`, 'impressions', `impressions`, 'pageViews', `pageViews`, 'rawInsightsJson', `rawInsightsJson`),
  `fetchedAt`, `createdAt`
FROM `facebook_channel_snapshots`;

INSERT IGNORE INTO `channel_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `snapshotDate`, `followersCount`, `followersGained`, `followersLost`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), `brandId`, `socialAccountId`, 'INSTAGRAM', `snapshotDate`, `followersCount`, `followersGained`, `followersLost`,
  JSON_OBJECT('followingCount', `followingCount`, 'mediaCount', `mediaCount`, 'views', `views`, 'reach', `reach`, 'profileViews', `profileViews`, 'rawInsightsJson', `rawInsightsJson`),
  `fetchedAt`, `createdAt`
FROM `instagram_channel_snapshots`;

INSERT IGNORE INTO `channel_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `snapshotDate`, `followersCount`, `followersGained`, `followersLost`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), `brandId`, `socialAccountId`, 'THREADS', `snapshotDate`, `followersCount`, `followersGained`, `followersLost`,
  JSON_OBJECT('followingCount', `followingCount`, 'mediaCount', `mediaCount`, 'views', `views`, 'likes', `likes`, 'replies', `replies`, 'reposts', `reposts`, 'rawInsightsJson', `rawInsightsJson`),
  `fetchedAt`, `createdAt`
FROM `threads_channel_snapshots`;

INSERT IGNORE INTO `channel_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `snapshotDate`, `followersCount`, `followersGained`, `followersLost`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), `brandId`, `socialAccountId`, 'TIKTOK', `snapshotDate`, `followersCount`, `followersGained`, `followersLost`,
  JSON_OBJECT('followingCount', `followingCount`, 'likesCount', `likesCount`, 'videoCount', `videoCount`, 'views', `views`, 'likes', `likes`, 'comments', `comments`, 'shares', `shares`, 'rawInsightsJson', `rawInsightsJson`),
  `fetchedAt`, `createdAt`
FROM `tiktok_channel_snapshots`;

INSERT IGNORE INTO `channel_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `snapshotDate`, `followersCount`, `followersGained`, `followersLost`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), `brandId`, `socialAccountId`, 'BLUESKY', `snapshotDate`, `followersCount`, `followersGained`, `followersLost`,
  JSON_OBJECT('followsCount', `followsCount`, 'postsCount', `postsCount`, 'likes', `likes`, 'replies', `replies`, 'reposts', `reposts`, 'quotes', `quotes`, 'rawInsightsJson', `rawInsightsJson`),
  `fetchedAt`, `createdAt`
FROM `bluesky_channel_snapshots`;

INSERT IGNORE INTO `channel_metrics_daily`
  (`id`, `brandId`, `socialAccountId`, `platform`, `snapshotDate`, `followersCount`, `followersGained`, `followersLost`, `metrics`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), `brandId`, `socialAccountId`, 'YOUTUBE', `snapshotDate`, `subscribersCount`, `subscribersGained`, `subscribersLost`,
  JSON_OBJECT('totalViewsCount', `totalViewsCount`, 'totalVideosCount', `totalVideosCount`, 'rawInsightsJson', `rawInsightsJson`),
  `fetchedAt`, `createdAt`
FROM `youtube_channel_snapshots`;

-- DropForeignKey
ALTER TABLE `bluesky_channel_snapshots` DROP FOREIGN KEY `bluesky_channel_snapshots_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `bluesky_channel_snapshots` DROP FOREIGN KEY `bluesky_channel_snapshots_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `facebook_channel_snapshots` DROP FOREIGN KEY `facebook_channel_snapshots_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `facebook_channel_snapshots` DROP FOREIGN KEY `facebook_channel_snapshots_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `instagram_channel_snapshots` DROP FOREIGN KEY `instagram_channel_snapshots_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `instagram_channel_snapshots` DROP FOREIGN KEY `instagram_channel_snapshots_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `threads_channel_snapshots` DROP FOREIGN KEY `threads_channel_snapshots_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `threads_channel_snapshots` DROP FOREIGN KEY `threads_channel_snapshots_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `tiktok_channel_snapshots` DROP FOREIGN KEY `tiktok_channel_snapshots_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `tiktok_channel_snapshots` DROP FOREIGN KEY `tiktok_channel_snapshots_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `youtube_channel_snapshots` DROP FOREIGN KEY `youtube_channel_snapshots_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `youtube_channel_snapshots` DROP FOREIGN KEY `youtube_channel_snapshots_socialAccountId_fkey`;

-- DropTable
DROP TABLE `bluesky_channel_snapshots`;

-- DropTable
DROP TABLE `facebook_channel_snapshots`;

-- DropTable
DROP TABLE `instagram_channel_snapshots`;

-- DropTable
DROP TABLE `threads_channel_snapshots`;

-- DropTable
DROP TABLE `tiktok_channel_snapshots`;

-- DropTable
DROP TABLE `youtube_channel_snapshots`;
