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

-- CreateTable
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

