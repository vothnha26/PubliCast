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

-- CreateTable
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
    UNIQUE INDEX `post_metrics_daily_socialAccountId_platformPostId_snapshotDa_key`(`socialAccountId`, `platformPostId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_metrics_daily` ADD CONSTRAINT `post_metrics_daily_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_metrics_daily` ADD CONSTRAINT `post_metrics_daily_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

