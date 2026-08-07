-- DropForeignKey
ALTER TABLE `ad_analytics` DROP FOREIGN KEY `ad_analytics_analyticsId_fkey`;

-- DropForeignKey
ALTER TABLE `facebook_overview_metrics` DROP FOREIGN KEY `facebook_overview_metrics_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `facebook_overview_metrics` DROP FOREIGN KEY `facebook_overview_metrics_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `facebook_story_metrics` DROP FOREIGN KEY `facebook_story_metrics_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `facebook_story_metrics` DROP FOREIGN KEY `facebook_story_metrics_socialAccountId_fkey`;

-- AlterTable
ALTER TABLE `tracked_videos` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL DEFAULT 'YOUTUBE';

-- DropTable
DROP TABLE `ad_analytics`;

-- DropTable
DROP TABLE `facebook_overview_metrics`;

-- DropTable
DROP TABLE `facebook_story_metrics`;

-- CreateTable
CREATE TABLE `youtube_channel_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `subscribersCount` INTEGER NOT NULL DEFAULT 0,
    `totalViewsCount` INTEGER NOT NULL DEFAULT 0,
    `totalVideosCount` INTEGER NOT NULL DEFAULT 0,
    `subscribersGained` INTEGER NOT NULL DEFAULT 0,
    `subscribersLost` INTEGER NOT NULL DEFAULT 0,
    `rawInsightsJson` LONGTEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `youtube_channel_snapshots_brandId_idx`(`brandId`),
    INDEX `youtube_channel_snapshots_socialAccountId_snapshotDate_idx`(`socialAccountId`, `snapshotDate`),
    UNIQUE INDEX `youtube_channel_snapshots_socialAccountId_snapshotDate_key`(`socialAccountId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tiktok_channel_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followingCount` INTEGER NOT NULL DEFAULT 0,
    `likesCount` INTEGER NOT NULL DEFAULT 0,
    `videoCount` INTEGER NOT NULL DEFAULT 0,
    `followersGained` INTEGER NOT NULL DEFAULT 0,
    `followersLost` INTEGER NOT NULL DEFAULT 0,
    `rawInsightsJson` LONGTEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tiktok_channel_snapshots_brandId_idx`(`brandId`),
    INDEX `tiktok_channel_snapshots_socialAccountId_snapshotDate_idx`(`socialAccountId`, `snapshotDate`),
    UNIQUE INDEX `tiktok_channel_snapshots_socialAccountId_snapshotDate_key`(`socialAccountId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `instagram_channel_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followingCount` INTEGER NOT NULL DEFAULT 0,
    `mediaCount` INTEGER NOT NULL DEFAULT 0,
    `followersGained` INTEGER NOT NULL DEFAULT 0,
    `followersLost` INTEGER NOT NULL DEFAULT 0,
    `rawInsightsJson` LONGTEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `instagram_channel_snapshots_brandId_idx`(`brandId`),
    INDEX `instagram_channel_snapshots_socialAccountId_snapshotDate_idx`(`socialAccountId`, `snapshotDate`),
    UNIQUE INDEX `instagram_channel_snapshots_socialAccountId_snapshotDate_key`(`socialAccountId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `threads_channel_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followingCount` INTEGER NOT NULL DEFAULT 0,
    `mediaCount` INTEGER NOT NULL DEFAULT 0,
    `followersGained` INTEGER NOT NULL DEFAULT 0,
    `followersLost` INTEGER NOT NULL DEFAULT 0,
    `rawInsightsJson` LONGTEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `threads_channel_snapshots_brandId_idx`(`brandId`),
    INDEX `threads_channel_snapshots_socialAccountId_snapshotDate_idx`(`socialAccountId`, `snapshotDate`),
    UNIQUE INDEX `threads_channel_snapshots_socialAccountId_snapshotDate_key`(`socialAccountId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bluesky_channel_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followsCount` INTEGER NOT NULL DEFAULT 0,
    `postsCount` INTEGER NOT NULL DEFAULT 0,
    `rawInsightsJson` LONGTEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bluesky_channel_snapshots_brandId_idx`(`brandId`),
    INDEX `bluesky_channel_snapshots_socialAccountId_snapshotDate_idx`(`socialAccountId`, `snapshotDate`),
    UNIQUE INDEX `bluesky_channel_snapshots_socialAccountId_snapshotDate_key`(`socialAccountId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facebook_channel_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `likesCount` INTEGER NOT NULL DEFAULT 0,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followersGained` INTEGER NOT NULL DEFAULT 0,
    `followersLost` INTEGER NOT NULL DEFAULT 0,
    `reach` INTEGER NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `pageViews` INTEGER NOT NULL DEFAULT 0,
    `rawInsightsJson` LONGTEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `facebook_channel_snapshots_brandId_idx`(`brandId`),
    INDEX `facebook_channel_snapshots_socialAccountId_snapshotDate_idx`(`socialAccountId`, `snapshotDate`),
    UNIQUE INDEX `facebook_channel_snapshots_socialAccountId_snapshotDate_key`(`socialAccountId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `youtube_video_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platformVideoId` VARCHAR(191) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `comments` INTEGER NOT NULL DEFAULT 0,
    `avgWatchTime` DOUBLE NOT NULL DEFAULT 0,
    `rawInsightsJson` LONGTEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `youtube_video_metrics_brandId_idx`(`brandId`),
    INDEX `youtube_video_metrics_socialAccountId_platformVideoId_fetche_idx`(`socialAccountId`, `platformVideoId`, `fetchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tiktok_video_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platformVideoId` VARCHAR(191) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `comments` INTEGER NOT NULL DEFAULT 0,
    `shares` INTEGER NOT NULL DEFAULT 0,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tiktok_video_metrics_brandId_idx`(`brandId`),
    INDEX `tiktok_video_metrics_socialAccountId_platformVideoId_fetched_idx`(`socialAccountId`, `platformVideoId`, `fetchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `instagram_post_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platformPostId` VARCHAR(191) NOT NULL,
    `postType` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `reach` INTEGER NOT NULL DEFAULT 0,
    `views` INTEGER NOT NULL DEFAULT 0,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `comments` INTEGER NOT NULL DEFAULT 0,
    `shares` INTEGER NOT NULL DEFAULT 0,
    `saves` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `engagementRate` DOUBLE NOT NULL DEFAULT 0,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `instagram_post_metrics_brandId_idx`(`brandId`),
    INDEX `instagram_post_metrics_socialAccountId_platformPostId_fetche_idx`(`socialAccountId`, `platformPostId`, `fetchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `threads_post_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platformPostId` VARCHAR(191) NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `reach` INTEGER NULL,
    `views` INTEGER NULL,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `replies` INTEGER NOT NULL DEFAULT 0,
    `reposts` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `threads_post_metrics_brandId_idx`(`brandId`),
    INDEX `threads_post_metrics_socialAccountId_platformPostId_fetchedA_idx`(`socialAccountId`, `platformPostId`, `fetchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bluesky_post_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platformPostId` VARCHAR(191) NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `replies` INTEGER NOT NULL DEFAULT 0,
    `reposts` INTEGER NOT NULL DEFAULT 0,
    `quotes` INTEGER NOT NULL DEFAULT 0,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bluesky_post_metrics_brandId_idx`(`brandId`),
    INDEX `bluesky_post_metrics_socialAccountId_platformPostId_fetchedA_idx`(`socialAccountId`, `platformPostId`, `fetchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facebook_post_metrics_v2` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platformPostId` VARCHAR(191) NOT NULL,
    `postType` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `reach` INTEGER NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `videoViews` INTEGER NOT NULL DEFAULT 0,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `comments` INTEGER NOT NULL DEFAULT 0,
    `shares` INTEGER NOT NULL DEFAULT 0,
    `reactions` INTEGER NOT NULL DEFAULT 0,
    `linkClicks` INTEGER NOT NULL DEFAULT 0,
    `otherClicks` INTEGER NOT NULL DEFAULT 0,
    `engagementRate` DOUBLE NOT NULL DEFAULT 0,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `facebook_post_metrics_v2_brandId_idx`(`brandId`),
    INDEX `facebook_post_metrics_v2_socialAccountId_platformPostId_fetc_idx`(`socialAccountId`, `platformPostId`, `fetchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `youtube_channel_snapshots` ADD CONSTRAINT `youtube_channel_snapshots_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `youtube_channel_snapshots` ADD CONSTRAINT `youtube_channel_snapshots_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tiktok_channel_snapshots` ADD CONSTRAINT `tiktok_channel_snapshots_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tiktok_channel_snapshots` ADD CONSTRAINT `tiktok_channel_snapshots_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `instagram_channel_snapshots` ADD CONSTRAINT `instagram_channel_snapshots_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `instagram_channel_snapshots` ADD CONSTRAINT `instagram_channel_snapshots_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `threads_channel_snapshots` ADD CONSTRAINT `threads_channel_snapshots_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `threads_channel_snapshots` ADD CONSTRAINT `threads_channel_snapshots_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bluesky_channel_snapshots` ADD CONSTRAINT `bluesky_channel_snapshots_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bluesky_channel_snapshots` ADD CONSTRAINT `bluesky_channel_snapshots_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_channel_snapshots` ADD CONSTRAINT `facebook_channel_snapshots_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_channel_snapshots` ADD CONSTRAINT `facebook_channel_snapshots_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `youtube_video_metrics` ADD CONSTRAINT `youtube_video_metrics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `youtube_video_metrics` ADD CONSTRAINT `youtube_video_metrics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tiktok_video_metrics` ADD CONSTRAINT `tiktok_video_metrics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tiktok_video_metrics` ADD CONSTRAINT `tiktok_video_metrics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `instagram_post_metrics` ADD CONSTRAINT `instagram_post_metrics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `instagram_post_metrics` ADD CONSTRAINT `instagram_post_metrics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `threads_post_metrics` ADD CONSTRAINT `threads_post_metrics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `threads_post_metrics` ADD CONSTRAINT `threads_post_metrics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bluesky_post_metrics` ADD CONSTRAINT `bluesky_post_metrics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bluesky_post_metrics` ADD CONSTRAINT `bluesky_post_metrics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_post_metrics_v2` ADD CONSTRAINT `facebook_post_metrics_v2_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_post_metrics_v2` ADD CONSTRAINT `facebook_post_metrics_v2_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
