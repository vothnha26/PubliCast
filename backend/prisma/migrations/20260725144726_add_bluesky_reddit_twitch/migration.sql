-- AlterTable
ALTER TABLE `PlatformLimit` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `best_time_slots` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `competitor_analysis` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `hashtag_trackers` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `inbox_items` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `media_library` ADD COLUMN `attributionHtml` TEXT NULL,
    ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `photographerName` VARCHAR(191) NULL,
    ADD COLUMN `photographerUrl` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'UPLOAD';

-- AlterTable
ALTER TABLE `post_analytics_daily_snapshot` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `social_accounts` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `tracked_videos` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL DEFAULT 'YOUTUBE';

-- CreateTable
CREATE TABLE `bluesky_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `did` VARCHAR(191) NOT NULL,
    `handle` VARCHAR(191) NOT NULL,
    `pdsUrl` VARCHAR(191) NOT NULL DEFAULT 'https://bsky.social',
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followsCount` INTEGER NOT NULL DEFAULT 0,
    `postsCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `bluesky_accounts_socialAccountId_key`(`socialAccountId`),
    UNIQUE INDEX `bluesky_accounts_did_key`(`did`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reddit_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `linkKarma` INTEGER NOT NULL DEFAULT 0,
    `commentKarma` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `reddit_accounts_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `twitch_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `broadcasterId` VARCHAR(191) NOT NULL,
    `broadcasterType` VARCHAR(191) NOT NULL DEFAULT '',
    `followersCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `twitch_accounts_socialAccountId_key`(`socialAccountId`),
    UNIQUE INDEX `twitch_accounts_broadcasterId_key`(`broadcasterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `media_library_source_idx` ON `media_library`(`source`);

-- AddForeignKey
ALTER TABLE `bluesky_accounts` ADD CONSTRAINT `bluesky_accounts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reddit_accounts` ADD CONSTRAINT `reddit_accounts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `twitch_accounts` ADD CONSTRAINT `twitch_accounts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
