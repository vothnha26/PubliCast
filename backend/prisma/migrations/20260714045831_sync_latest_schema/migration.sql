/*
  Warnings:

  - You are about to alter the column `tags` on the `inbox_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.
  - You are about to alter the column `internalNotes` on the `inbox_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.
  - A unique constraint covering the columns `[brandId,platform,competitorHandle]` on the table `competitor_analysis` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[platformItemId]` on the table `inbox_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `inbox_items` DROP FOREIGN KEY `inbox_items_relatedPostId_fkey`;

-- AlterTable
ALTER TABLE `auto_lists` ADD COLUMN `metadata` TEXT NULL;

-- AlterTable
ALTER TABLE `best_time_slots` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM', 'DISCORD') NOT NULL;

-- AlterTable
ALTER TABLE `competitor_analysis` ADD COLUMN `audienceOverlapPct` DOUBLE NULL,
    ADD COLUMN `avgComments` DOUBLE NULL,
    ADD COLUMN `avgLikes` DOUBLE NULL,
    ADD COLUMN `avgReach` DOUBLE NULL,
    ADD COLUMN `avgShares` DOUBLE NULL,
    ADD COLUMN `competitorProfileUrl` VARCHAR(191) NULL,
    ADD COLUMN `followersGrowth` DOUBLE NULL,
    ADD COLUMN `recentPostsJson` LONGTEXT NULL,
    ADD COLUMN `topContentJson` LONGTEXT NULL,
    ADD COLUMN `topPostType` VARCHAR(191) NULL,
    MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM', 'DISCORD') NOT NULL;

-- AlterTable
ALTER TABLE `hashtag_trackers` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM', 'DISCORD') NOT NULL;

-- AlterTable
ALTER TABLE `inbox_items` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM', 'DISCORD') NOT NULL,
    MODIFY `tags` JSON NULL,
    MODIFY `internalNotes` JSON NULL;

-- AlterTable
ALTER TABLE `livestreams` ADD COLUMN `metadata` TEXT NULL,
    ADD COLUMN `platformStreamId` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `posts` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isLibrary` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `metadata` TEXT NULL,
    MODIFY `type` ENUM('IMAGE', 'VIDEO', 'CAROUSEL', 'REEL', 'STORY', 'SHORT', 'THREAD', 'PIN', 'TIKTOK_CAROUSEL', 'LINK', 'TEXT', 'LIVE_VIDEO', 'ALBUM') NOT NULL,
    MODIFY `status` ENUM('DRAFT', 'SCHEDULED', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'FAILED', 'REJECTED', 'PAUSED') NOT NULL DEFAULT 'DRAFT',
    MODIFY `failureReason` TEXT NULL;

-- AlterTable
ALTER TABLE `social_accounts` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM', 'DISCORD') NOT NULL,
    MODIFY `profilePictureUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `social_analytics` MODIFY `topPostIds` LONGTEXT NULL,
    MODIFY `audienceDemographicsJson` LONGTEXT NULL,
    MODIFY `hourlyEngagementJson` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `system_notifications` MODIFY `actionUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `defaultBrandId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `youtube_channels` ADD COLUMN `uploadsPlaylistId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `tracked_videos` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM', 'DISCORD') NOT NULL DEFAULT 'YOUTUBE',
    `videoId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `channelId` VARCHAR(191) NULL,
    `channelName` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `lastViews` INTEGER NOT NULL DEFAULT 0,
    `lastLikes` INTEGER NOT NULL DEFAULT 0,
    `lastComments` INTEGER NOT NULL DEFAULT 0,
    `isTracking` BOOLEAN NOT NULL DEFAULT true,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSyncedAt` DATETIME(3) NULL,

    INDEX `tracked_videos_brandId_idx`(`brandId`),
    UNIQUE INDEX `tracked_videos_brandId_videoId_key`(`brandId`, `videoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_permissions` (
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'management',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platforms` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#000000',
    `image` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `platforms_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modules` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `modules_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `platformId` VARCHAR(191) NULL,
    `moduleId` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `products_name_key`(`name`),
    UNIQUE INDEX `products_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pending_payments` (
    `id` VARCHAR(191) NOT NULL,
    `transactionCode` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NULL,
    `addonId` VARCHAR(191) NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `expiredAt` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pending_payments_transactionCode_key`(`transactionCode`),
    INDEX `pending_payments_brandId_idx`(`brandId`),
    INDEX `pending_payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `chatType` VARCHAR(191) NOT NULL DEFAULT 'channel',
    `memberCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `telegram_accounts_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discord_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NULL,
    `guildName` VARCHAR(191) NOT NULL DEFAULT 'Discord Server',
    `channelName` VARCHAR(191) NOT NULL DEFAULT 'general',
    `webhookUrl` TEXT NULL,
    `isPending` BOOLEAN NOT NULL DEFAULT false,
    `memberCount` INTEGER NOT NULL DEFAULT 0,
    `onlineCount` INTEGER NOT NULL DEFAULT 0,
    `lastSyncAt` DATETIME(3) NULL,

    UNIQUE INDEX `discord_accounts_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discord_guild_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `memberCount` INTEGER NOT NULL DEFAULT 0,
    `onlineCount` INTEGER NOT NULL DEFAULT 0,
    `snapshotAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `discord_guild_snapshots_brandId_guildId_idx`(`brandId`, `guildId`),
    UNIQUE INDEX `discord_guild_snapshots_guildId_brandId_snapshotAt_key`(`guildId`, `brandId`, `snapshotAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_metric_histories` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `platformPostId` VARCHAR(191) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `comments` INTEGER NOT NULL DEFAULT 0,
    `shares` INTEGER NOT NULL DEFAULT 0,
    `saves` INTEGER NOT NULL DEFAULT 0,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `post_metric_histories_postId_idx`(`postId`),
    INDEX `post_metric_histories_brandId_idx`(`brandId`),
    INDEX `post_metric_histories_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_reviewers` (
    `id` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `reviewerId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVISION_NEEDED') NOT NULL DEFAULT 'PENDING',
    `comment` TEXT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workflow_reviewers_workflowId_idx`(`workflowId`),
    INDEX `workflow_reviewers_reviewerId_idx`(`reviewerId`),
    UNIQUE INDEX `workflow_reviewers_workflowId_reviewerId_key`(`workflowId`, `reviewerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facebook_overview_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `dateFrom` DATETIME(3) NOT NULL,
    `dateTo` DATETIME(3) NOT NULL,
    `granularity` VARCHAR(191) NOT NULL DEFAULT 'DAY',
    `followersTotal` INTEGER NOT NULL DEFAULT 0,
    `followersGain` INTEGER NOT NULL DEFAULT 0,
    `followersLost` INTEGER NOT NULL DEFAULT 0,
    `followersNetChange` INTEGER NOT NULL DEFAULT 0,
    `reach` INTEGER NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `organicReach` INTEGER NOT NULL DEFAULT 0,
    `paidReach` INTEGER NOT NULL DEFAULT 0,
    `organicImpressions` INTEGER NOT NULL DEFAULT 0,
    `paidImpressions` INTEGER NOT NULL DEFAULT 0,
    `pageClicks` INTEGER NOT NULL DEFAULT 0,
    `linkClicks` INTEGER NOT NULL DEFAULT 0,
    `otherClicks` INTEGER NOT NULL DEFAULT 0,
    `engagements` INTEGER NOT NULL DEFAULT 0,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `comments` INTEGER NOT NULL DEFAULT 0,
    `shares` INTEGER NOT NULL DEFAULT 0,
    `reactions` INTEGER NOT NULL DEFAULT 0,
    `pageViews` INTEGER NOT NULL DEFAULT 0,
    `uniquePageViews` INTEGER NOT NULL DEFAULT 0,
    `videoViews` INTEGER NOT NULL DEFAULT 0,
    `organicVideoViews` INTEGER NOT NULL DEFAULT 0,
    `paidVideoViews` INTEGER NOT NULL DEFAULT 0,
    `dailyBreakdownJson` LONGTEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `facebook_overview_metrics_brandId_idx`(`brandId`),
    INDEX `facebook_overview_metrics_socialAccountId_idx`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facebook_post_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platformPostId` VARCHAR(191) NOT NULL,
    `postType` ENUM('IMAGE', 'VIDEO', 'REEL', 'LINK', 'TEXT', 'CAROUSEL', 'ALBUM', 'LIVE_VIDEO', 'STORY') NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `reach` INTEGER NOT NULL DEFAULT 0,
    `organicReach` INTEGER NOT NULL DEFAULT 0,
    `promotedReach` INTEGER NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `organicImpressions` INTEGER NOT NULL DEFAULT 0,
    `promotedImpressions` INTEGER NOT NULL DEFAULT 0,
    `videoViews` INTEGER NOT NULL DEFAULT 0,
    `organicVideoViews` INTEGER NOT NULL DEFAULT 0,
    `promotedVideoViews` INTEGER NOT NULL DEFAULT 0,
    `avgWatchTimeSeconds` DOUBLE NULL,
    `watchRate` DOUBLE NULL,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `comments` INTEGER NOT NULL DEFAULT 0,
    `shares` INTEGER NOT NULL DEFAULT 0,
    `saves` INTEGER NOT NULL DEFAULT 0,
    `reactions` INTEGER NOT NULL DEFAULT 0,
    `linkClicks` INTEGER NOT NULL DEFAULT 0,
    `otherClicks` INTEGER NOT NULL DEFAULT 0,
    `negativeActions` INTEGER NOT NULL DEFAULT 0,
    `engagementRate` DOUBLE NOT NULL DEFAULT 0,
    `captionSnippet` TEXT NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `facebook_post_metrics_brandId_idx`(`brandId`),
    INDEX `facebook_post_metrics_socialAccountId_idx`(`socialAccountId`),
    UNIQUE INDEX `facebook_post_metrics_socialAccountId_platformPostId_key`(`socialAccountId`, `platformPostId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facebook_story_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platformStoryId` VARCHAR(191) NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `mediaType` VARCHAR(191) NOT NULL DEFAULT 'IMAGE',
    `thumbnailUrl` VARCHAR(191) NULL,
    `mediaUrl` VARCHAR(191) NULL,
    `reach` INTEGER NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `exits` INTEGER NOT NULL DEFAULT 0,
    `replies` INTEGER NOT NULL DEFAULT 0,
    `tapsForward` INTEGER NOT NULL DEFAULT 0,
    `tapsBack` INTEGER NOT NULL DEFAULT 0,
    `linkClicks` INTEGER NOT NULL DEFAULT 0,
    `completionRate` DOUBLE NULL,
    `exitRate` DOUBLE NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `facebook_story_metrics_brandId_idx`(`brandId`),
    INDEX `facebook_story_metrics_socialAccountId_idx`(`socialAccountId`),
    UNIQUE INDEX `facebook_story_metrics_socialAccountId_platformStoryId_key`(`socialAccountId`, `platformStoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_folders` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `media_folders_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformLimit` (
    `id` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM', 'DISCORD') NOT NULL,
    `subType` VARCHAR(191) NOT NULL,
    `maxCaptionLength` INTEGER NOT NULL DEFAULT 2000,
    `maxFileSizeMb` INTEGER NOT NULL DEFAULT 100,
    `allowedMediaTypes` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    `allowedFormats` VARCHAR(191) NOT NULL DEFAULT 'mp4,mov,png,jpg,jpeg',
    `minVideoDuration` INTEGER NULL,
    `maxVideoDuration` INTEGER NULL,
    `aspectRatios` VARCHAR(191) NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformLimit_platform_subType_key`(`platform`, `subType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auto_reply_settings` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `mode` VARCHAR(191) NOT NULL DEFAULT 'KEYWORD',
    `keywordsConfig` JSON NULL,
    `aiPrompt` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auto_reply_settings_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_events` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `eventDate` DATETIME(3) NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `calendar_events_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `livestream_highlights` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `youtubeUrl` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `progressMsg` VARCHAR(191) NULL,
    `videoUrl` TEXT NULL,
    `subtitleUrl` TEXT NULL,
    `duration` DOUBLE NULL,
    `youtubeVideoId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PlanProducts` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_PlanProducts_AB_unique`(`A`, `B`),
    INDEX `_PlanProducts_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `competitor_analysis_brandId_platform_competitorHandle_key` ON `competitor_analysis`(`brandId`, `platform`, `competitorHandle`);

-- CreateIndex
CREATE UNIQUE INDEX `inbox_items_platformItemId_key` ON `inbox_items`(`platformItemId`);

-- AddForeignKey
ALTER TABLE `tracked_videos` ADD CONSTRAINT `tracked_videos_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_platformId_fkey` FOREIGN KEY (`platformId`) REFERENCES `platforms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pending_payments` ADD CONSTRAINT `pending_payments_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pending_payments` ADD CONSTRAINT `pending_payments_addonId_fkey` FOREIGN KEY (`addonId`) REFERENCES `addons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_accounts` ADD CONSTRAINT `telegram_accounts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discord_accounts` ADD CONSTRAINT `discord_accounts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discord_guild_snapshots` ADD CONSTRAINT `discord_guild_snapshots_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_metric_histories` ADD CONSTRAINT `post_metric_histories_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_reviewers` ADD CONSTRAINT `workflow_reviewers_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `approval_workflows`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_reviewers` ADD CONSTRAINT `workflow_reviewers_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_analytics` ADD CONSTRAINT `social_analytics_analyticsId_fkey` FOREIGN KEY (`analyticsId`) REFERENCES `analytics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_analytics` ADD CONSTRAINT `ad_analytics_analyticsId_fkey` FOREIGN KEY (`analyticsId`) REFERENCES `analytics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_overview_metrics` ADD CONSTRAINT `facebook_overview_metrics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_overview_metrics` ADD CONSTRAINT `facebook_overview_metrics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_post_metrics` ADD CONSTRAINT `facebook_post_metrics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_post_metrics` ADD CONSTRAINT `facebook_post_metrics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_story_metrics` ADD CONSTRAINT `facebook_story_metrics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_story_metrics` ADD CONSTRAINT `facebook_story_metrics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_library` ADD CONSTRAINT `media_library_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `media_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_folders` ADD CONSTRAINT `media_folders_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_folders` ADD CONSTRAINT `media_folders_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `media_folders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auto_reply_settings` ADD CONSTRAINT `auto_reply_settings_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livestream_highlights` ADD CONSTRAINT `livestream_highlights_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PlanProducts` ADD CONSTRAINT `_PlanProducts_A_fkey` FOREIGN KEY (`A`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PlanProducts` ADD CONSTRAINT `_PlanProducts_B_fkey` FOREIGN KEY (`B`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
