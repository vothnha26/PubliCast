/*
  Warnings:

  - You are about to drop the column `created_at` on the `user_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `user_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `provider_id` on the `user_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `user_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `user_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_url` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `verified_at` on the `users` table. All the data in the column will be lost.
  - You are about to alter the column `role` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(2))`.
  - A unique constraint covering the columns `[userId,provider]` on the table `user_accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `user_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `user_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `user_accounts` DROP FOREIGN KEY `user_accounts_user_id_fkey`;

-- DropIndex
DROP INDEX `user_accounts_user_id_fkey` ON `user_accounts`;

-- AlterTable
ALTER TABLE `user_accounts` DROP COLUMN `created_at`,
    DROP COLUMN `password_hash`,
    DROP COLUMN `provider_id`,
    DROP COLUMN `updated_at`,
    DROP COLUMN `user_id`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `passwordHash` VARCHAR(191) NULL,
    ADD COLUMN `providerId` VARCHAR(191) NULL,
    ADD COLUMN `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userId` VARCHAR(191) NOT NULL,
    MODIFY `provider` ENUM('LOCAL', 'GOOGLE', 'FACEBOOK', 'INSTAGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `address`,
    DROP COLUMN `avatar_url`,
    DROP COLUMN `bio`,
    DROP COLUMN `created_at`,
    DROP COLUMN `full_name`,
    DROP COLUMN `phone`,
    DROP COLUMN `status`,
    DROP COLUMN `updated_at`,
    DROP COLUMN `verified_at`,
    ADD COLUMN `avatarUrl` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `customRoleId` VARCHAR(191) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    ADD COLUMN `passwordHash` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `role` ENUM('OWNER', 'ADMIN', 'EDITOR', 'VIEWER', 'ANALYST', 'STREAM_MANAGER', 'CONTENT_MANAGER', 'CONTENT_CREATOR', 'STREAM_OPERATOR', 'CLIENT') NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE `user_settings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'vi',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',

    UNIQUE INDEX `user_settings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NOT NULL,
    `defaultLanguage` VARCHAR(191) NOT NULL,
    `postsUsedThisMonth` INTEGER NOT NULL DEFAULT 0,
    `engagementRatioFormula` VARCHAR(191) NOT NULL DEFAULT '(likes + comments + shares) / reach * 100',
    `ownerId` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `brands_subscriptionId_key`(`subscriptionId`),
    INDEX `brands_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'EDITOR', 'VIEWER', 'ANALYST', 'STREAM_MANAGER', 'CONTENT_MANAGER', 'CONTENT_CREATOR', 'STREAM_OPERATOR', 'CLIENT') NOT NULL,
    `customRoleId` VARCHAR(191) NULL,
    `invitedByUserId` VARCHAR(191) NOT NULL,
    `invitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptedAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'REMOVED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `teams_brandId_idx`(`brandId`),
    INDEX `teams_userId_idx`(`userId`),
    UNIQUE INDEX `teams_brandId_userId_key`(`brandId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_roles` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `colorHex` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `custom_roles_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionKey` VARCHAR(191) NOT NULL,
    `isAllowed` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `custom_role_permissions_roleId_permissionKey_key`(`roleId`, `permissionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` VARCHAR(191) NOT NULL,
    `name` ENUM('FREE', 'STARTER', 'PRO', 'AGENCY') NOT NULL,
    `priceAmount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `billingCycle` ENUM('MONTHLY', 'ANNUAL') NOT NULL,
    `description` VARCHAR(191) NULL,
    `planLimitId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `plans_name_billingCycle_key`(`name`, `billingCycle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_limits` (
    `id` VARCHAR(191) NOT NULL,
    `maxBrands` INTEGER NOT NULL,
    `maxSocialProfiles` INTEGER NOT NULL,
    `maxPostsPerMonth` INTEGER NOT NULL,
    `maxLivePlatforms` INTEGER NOT NULL,
    `maxStreamQuality` ENUM('SD', 'HD_720P', 'FHD_1080P', 'UHD_4K') NOT NULL,
    `maxTeamSeats` INTEGER NOT NULL,
    `allowCustomRoles` BOOLEAN NOT NULL,
    `allowApprovalWorkflow` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'UNPAID') NOT NULL DEFAULT 'ACTIVE',
    `trialEndsAt` DATETIME(3) NULL,
    `currentPeriodStart` DATETIME(3) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `cancelledAt` DATETIME(3) NULL,
    `stripeCustomerId` VARCHAR(191) NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `subscriptions_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addons` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `priceAmount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL,
    `stripePriceId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_addons` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `addonId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `stripeSubscriptionItemId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `brandId` VARCHAR(191) NULL,

    UNIQUE INDEX `subscription_addons_subscriptionId_addonId_key`(`subscriptionId`, `addonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `pdfUrl` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `dueAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoices_subscriptionId_idx`(`subscriptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS') NOT NULL,
    `platformAccountId` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `profilePictureUrl` VARCHAR(191) NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `scopes` TEXT NOT NULL,
    `isConnected` BOOLEAN NOT NULL DEFAULT true,
    `connectedAt` DATETIME(3) NOT NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `social_accounts_brandId_idx`(`brandId`),
    UNIQUE INDEX `social_accounts_brandId_platform_platformAccountId_key`(`brandId`, `platform`, `platformAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `youtube_channels` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `customUrl` VARCHAR(191) NULL,
    `subscribersCount` INTEGER NOT NULL DEFAULT 0,
    `totalVideosCount` INTEGER NOT NULL DEFAULT 0,
    `totalViewsCount` INTEGER NOT NULL DEFAULT 0,
    `country` VARCHAR(191) NULL,
    `defaultLanguage` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isMonetized` BOOLEAN NOT NULL DEFAULT false,
    `supportsShorts` BOOLEAN NOT NULL DEFAULT true,
    `supportsLivestream` BOOLEAN NOT NULL DEFAULT false,
    `madeForKids` BOOLEAN NOT NULL DEFAULT false,
    `hiddenSubscriberCount` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `youtube_channels_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `instagram_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `accountType` VARCHAR(191) NOT NULL,
    `businessCategoryName` VARCHAR(191) NULL,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followingCount` INTEGER NOT NULL DEFAULT 0,
    `mediaCount` INTEGER NOT NULL DEFAULT 0,
    `biography` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `supportsStories` BOOLEAN NOT NULL DEFAULT false,
    `supportsReels` BOOLEAN NOT NULL DEFAULT false,
    `supportsCarousels` BOOLEAN NOT NULL DEFAULT false,
    `supportsCollaboration` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `instagram_accounts_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facebook_pages` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `likesCount` INTEGER NOT NULL DEFAULT 0,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `about` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `facebook_pages_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tiktok_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followingCount` INTEGER NOT NULL DEFAULT 0,
    `likesCount` INTEGER NOT NULL DEFAULT 0,
    `videoCount` INTEGER NOT NULL DEFAULT 0,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `supportsCarousels` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `tiktok_accounts_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `linkedin_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `accountType` VARCHAR(191) NOT NULL,
    `connectionsCount` INTEGER NULL,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `industry` VARCHAR(191) NULL,
    `isPremiumRequired` BOOLEAN NOT NULL DEFAULT false,
    `supportsCarousels` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `linkedin_accounts_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `platform` ENUM('META_ADS', 'GOOGLE_ADS', 'TIKTOK_ADS') NOT NULL,
    `platformAccountId` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ad_accounts_brandId_idx`(`brandId`),
    UNIQUE INDEX `ad_accounts_brandId_platform_platformAccountId_key`(`brandId`, `platform`, `platformAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `caption` TEXT NULL,
    `type` ENUM('IMAGE', 'VIDEO', 'CAROUSEL', 'REEL', 'STORY', 'SHORT', 'THREAD', 'PIN', 'TIKTOK_CAROUSEL') NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'FAILED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `targetPlatforms` TEXT NOT NULL,
    `mediaUrls` TEXT NULL,
    `mediaThumbnailUrls` TEXT NULL,
    `hashtags` TEXT NULL,
    `mentions` TEXT NULL,
    `firstComment` TEXT NULL,
    `locationId` VARCHAR(191) NULL,
    `locationName` VARCHAR(191) NULL,
    `linkUrl` VARCHAR(191) NULL,
    `altText` VARCHAR(191) NULL,
    `isCollaboration` BOOLEAN NOT NULL DEFAULT false,
    `collaboratorHandle` VARCHAR(191) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `failureReason` VARCHAR(191) NULL,
    `autoListId` VARCHAR(191) NULL,
    `platformPostId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `posts_brandId_idx`(`brandId`),
    INDEX `posts_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `livestreams` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `streamKey` VARCHAR(191) NOT NULL,
    `rtmpUrl` VARCHAR(191) NOT NULL,
    `targetPlatforms` TEXT NOT NULL,
    `streamQuality` TEXT NOT NULL,
    `requireApproval` BOOLEAN NOT NULL DEFAULT false,
    `peakViewers` INTEGER NOT NULL DEFAULT 0,
    `totalViews` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `livestreams_brandId_idx`(`brandId`),
    INDEX `livestreams_scheduledAt_idx`(`scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_calendars` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `defaultView` ENUM('DAY', 'WEEK', 'MONTH') NOT NULL DEFAULT 'MONTH',
    `countryCalendars` TEXT NULL,
    `showBestTimes` BOOLEAN NOT NULL DEFAULT true,
    `filterPlatforms` TEXT NULL,
    `filterStatuses` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `content_calendars_brandId_key`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `best_time_slots` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS') NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `hour` INTEGER NOT NULL,
    `engagementScore` DOUBLE NOT NULL,
    `confidenceLevel` VARCHAR(191) NOT NULL,
    `calculatedAt` DATETIME(3) NOT NULL,

    INDEX `best_time_slots_brandId_idx`(`brandId`),
    UNIQUE INDEX `best_time_slots_brandId_platform_dayOfWeek_hour_key`(`brandId`, `platform`, `dayOfWeek`, `hour`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auto_lists` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sourceType` ENUM('MANUAL', 'CSV_UPLOAD', 'RSS_FEED') NOT NULL,
    `rssUrl` VARCHAR(191) NULL,
    `csvLastUploadedAt` DATETIME(3) NULL,
    `targetPlatforms` TEXT NOT NULL,
    `scheduleType` VARCHAR(191) NOT NULL,
    `intervalMinutes` INTEGER NULL,
    `specificTimes` TEXT NULL,
    `activeDays` TEXT NOT NULL,
    `lastPostedAt` DATETIME(3) NULL,
    `useAITimes` BOOLEAN NOT NULL DEFAULT false,
    `lowQueueAlert` BOOLEAN NOT NULL DEFAULT true,
    `queueThreshold` INTEGER NOT NULL DEFAULT 5,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `loopEnabled` BOOLEAN NOT NULL DEFAULT false,
    `totalPostsCount` INTEGER NOT NULL DEFAULT 0,
    `publishedPostsCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auto_lists_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_workflows` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `livestreamId` VARCHAR(191) NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `requesterId` VARCHAR(191) NOT NULL,
    `approvalPolicy` ENUM('AT_LEAST_ONE', 'ALL') NOT NULL,
    `selectedReviewers` TEXT NOT NULL,
    `reviewedByUserId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVISION_NEEDED') NOT NULL DEFAULT 'PENDING',
    `requesterNote` TEXT NULL,
    `reviewerComment` TEXT NULL,
    `revisionNote` TEXT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    INDEX `approval_workflows_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analytics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NULL,
    `adAccountId` VARCHAR(191) NULL,
    `dateFrom` DATETIME(3) NOT NULL,
    `dateTo` DATETIME(3) NOT NULL,
    `granularity` VARCHAR(191) NOT NULL,
    `fetchedAt` DATETIME(3) NOT NULL,
    `analyticsType` VARCHAR(191) NOT NULL,

    INDEX `analytics_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `analyticsId` VARCHAR(191) NOT NULL,
    `followersTotal` INTEGER NOT NULL,
    `followersGain` INTEGER NOT NULL,
    `followersLost` INTEGER NOT NULL,
    `impressions` INTEGER NOT NULL,
    `reach` INTEGER NOT NULL,
    `engagements` INTEGER NOT NULL,
    `likes` INTEGER NOT NULL,
    `comments` INTEGER NOT NULL,
    `shares` INTEGER NOT NULL,
    `saves` INTEGER NOT NULL,
    `clicks` INTEGER NOT NULL,
    `engagementRate` DOUBLE NOT NULL,
    `videoViews` INTEGER NULL,
    `avgVideoWatchTime` DOUBLE NULL,
    `profileVisits` INTEGER NULL,
    `websiteClicks` INTEGER NULL,
    `topPostIds` TEXT NULL,
    `audienceDemographicsJson` TEXT NULL,
    `hourlyEngagementJson` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `social_analytics_analyticsId_key`(`analyticsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `analyticsId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `campaignName` VARCHAR(191) NULL,
    `adSetId` VARCHAR(191) NULL,
    `totalSpend` DECIMAL(65, 30) NOT NULL,
    `impressions` INTEGER NOT NULL,
    `clicks` INTEGER NOT NULL,
    `ctr` DOUBLE NOT NULL,
    `cpc` DECIMAL(65, 30) NOT NULL,
    `cpm` DECIMAL(65, 30) NOT NULL,
    `conversions` INTEGER NOT NULL,
    `conversionValue` DECIMAL(65, 30) NOT NULL,
    `cpa` DECIMAL(65, 30) NOT NULL,
    `roas` DOUBLE NOT NULL,
    `reach` INTEGER NOT NULL,
    `frequency` DOUBLE NOT NULL,
    `videoViews` INTEGER NULL,
    `videoWatchRate` DOUBLE NULL,
    `campaignBreakdownJson` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ad_analytics_analyticsId_key`(`analyticsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competitor_analysis` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS') NOT NULL,
    `competitorHandle` VARCHAR(191) NOT NULL,
    `competitorDisplayName` VARCHAR(191) NULL,
    `competitorAvatarUrl` VARCHAR(191) NULL,
    `followersCount` INTEGER NULL,
    `avgEngagementRate` DOUBLE NULL,
    `postsPerWeek` DOUBLE NULL,
    `lastFetchedAt` DATETIME(3) NULL,
    `addedAt` DATETIME(3) NOT NULL,

    INDEX `competitor_analysis_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unified_inboxes` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `totalUnread` INTEGER NOT NULL DEFAULT 0,
    `lastSyncAt` DATETIME(3) NULL,
    `filterPlatforms` TEXT NULL,
    `filterTypes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `unified_inboxes_brandId_key`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inbox_items` (
    `id` VARCHAR(191) NOT NULL,
    `inboxId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS') NOT NULL,
    `type` ENUM('DIRECT_MESSAGE', 'COMMENT', 'MENTION', 'REVIEW') NOT NULL,
    `platformItemId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `authorAvatarUrl` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `mediaUrls` TEXT NULL,
    `relatedPostId` VARCHAR(191) NULL,
    `parentItemId` VARCHAR(191) NULL,
    `assignedUserId` VARCHAR(191) NULL,
    `tags` TEXT NULL,
    `internalNotes` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'UNREAD',
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `sentiment` VARCHAR(191) NULL,
    `repliedByUserId` VARCHAR(191) NULL,
    `repliedAt` DATETIME(3) NULL,
    `platformCreatedAt` DATETIME(3) NOT NULL,
    `syncedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `socialAccountId` VARCHAR(191) NULL,

    INDEX `inbox_items_inboxId_idx`(`inboxId`),
    INDEX `inbox_items_relatedPostId_idx`(`relatedPostId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `priority` VARCHAR(191) NOT NULL,
    `assignedAgentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `support_tickets_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_messages` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `messageType` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `attachmentUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_messages_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dateFrom` DATETIME(3) NOT NULL,
    `dateTo` DATETIME(3) NOT NULL,
    `includedPlatforms` TEXT NOT NULL,
    `includedSections` TEXT NOT NULL,
    `isWhiteLabel` BOOLEAN NOT NULL DEFAULT false,
    `brandLogoUrl` VARCHAR(191) NULL,
    `brandColorHex` VARCHAR(191) NULL,
    `format` ENUM('PDF', 'CSV', 'LOOKER_STUDIO') NOT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `scheduledFrequency` VARCHAR(191) NULL,
    `scheduledDeliveryEmails` TEXT NULL,
    `nextScheduledAt` DATETIME(3) NULL,
    `generatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reports_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `smart_links` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `customDomain` VARCHAR(191) NULL,
    `pageTitle` VARCHAR(191) NOT NULL,
    `profileImageUrl` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `backgroundType` VARCHAR(191) NOT NULL,
    `backgroundValue` VARCHAR(191) NOT NULL,
    `buttonStyle` VARCHAR(191) NOT NULL,
    `totalClicks` INTEGER NOT NULL DEFAULT 0,
    `uniqueVisitors` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `smart_links_slug_key`(`slug`),
    UNIQUE INDEX `smart_links_customDomain_key`(`customDomain`),
    INDEX `smart_links_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `link_items` (
    `id` VARCHAR(191) NOT NULL,
    `smartLinkId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `iconUrl` VARCHAR(191) NULL,
    `emoji` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `clicksLastWeek` INTEGER NOT NULL DEFAULT 0,
    `scheduleFrom` DATETIME(3) NULL,
    `scheduleTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `link_items_smartLinkId_idx`(`smartLinkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hashtag_trackers` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `hashtag` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS') NOT NULL,
    `totalPosts` INTEGER NULL,
    `postsLast24h` INTEGER NULL,
    `totalReach` INTEGER NULL,
    `avgEngagementRate` DOUBLE NULL,
    `trendDirection` ENUM('UP', 'DOWN', 'STABLE') NOT NULL,
    `topPostsJson` TEXT NULL,
    `trendScoreJson` TEXT NULL,
    `lastFetchedAt` DATETIME(3) NULL,
    `addedAt` DATETIME(3) NOT NULL,

    INDEX `hashtag_trackers_brandId_idx`(`brandId`),
    UNIQUE INDEX `hashtag_trackers_brandId_platform_hashtag_key`(`brandId`, `platform`, `hashtag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hashtag_sets` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `hashtags` TEXT NOT NULL,
    `targetPlatforms` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hashtag_sets_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_assistants` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `defaultTone` VARCHAR(191) NOT NULL DEFAULT 'PROFESSIONAL',
    `defaultLanguage` VARCHAR(191) NOT NULL DEFAULT 'vi',
    `brandVoiceContext` TEXT NULL,
    `creditsLimit` INTEGER NOT NULL DEFAULT 1000,
    `creditsUsed` INTEGER NOT NULL DEFAULT 0,
    `targetAudience` TEXT NULL,
    `targetPlatforms` TEXT NULL,
    `usageCountThisMonth` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ai_assistants_brandId_key`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_library` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `durationSeconds` DOUBLE NULL,
    `storageUrl` VARCHAR(191) NOT NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `aspectRatio` VARCHAR(191) NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `altText` VARCHAR(191) NULL,
    `folderId` VARCHAR(191) NULL,
    `tags` TEXT NULL,
    `uploadedByUserId` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `media_library_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `details` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_brandId_idx`(`brandId`),
    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_targetType_idx`(`targetType`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `isGlobal` BOOLEAN NOT NULL DEFAULT false,
    `actionUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `system_notifications_brandId_idx`(`brandId`),
    INDEX `system_notifications_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `user_accounts_userId_provider_key` ON `user_accounts`(`userId`, `provider`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_customRoleId_fkey` FOREIGN KEY (`customRoleId`) REFERENCES `custom_roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_accounts` ADD CONSTRAINT `user_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_invitedByUserId_fkey` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_customRoleId_fkey` FOREIGN KEY (`customRoleId`) REFERENCES `custom_roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_roles` ADD CONSTRAINT `custom_roles_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_role_permissions` ADD CONSTRAINT `custom_role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `custom_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plans` ADD CONSTRAINT `plans_planLimitId_fkey` FOREIGN KEY (`planLimitId`) REFERENCES `plan_limits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_addons` ADD CONSTRAINT `subscription_addons_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_addons` ADD CONSTRAINT `subscription_addons_addonId_fkey` FOREIGN KEY (`addonId`) REFERENCES `addons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_addons` ADD CONSTRAINT `subscription_addons_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_accounts` ADD CONSTRAINT `social_accounts_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `youtube_channels` ADD CONSTRAINT `youtube_channels_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `instagram_accounts` ADD CONSTRAINT `instagram_accounts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facebook_pages` ADD CONSTRAINT `facebook_pages_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tiktok_accounts` ADD CONSTRAINT `tiktok_accounts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `linkedin_accounts` ADD CONSTRAINT `linkedin_accounts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_accounts` ADD CONSTRAINT `ad_accounts_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_autoListId_fkey` FOREIGN KEY (`autoListId`) REFERENCES `auto_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livestreams` ADD CONSTRAINT `livestreams_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `livestreams` ADD CONSTRAINT `livestreams_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_calendars` ADD CONSTRAINT `content_calendars_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `best_time_slots` ADD CONSTRAINT `best_time_slots_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auto_lists` ADD CONSTRAINT `auto_lists_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_workflows` ADD CONSTRAINT `approval_workflows_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_workflows` ADD CONSTRAINT `approval_workflows_livestreamId_fkey` FOREIGN KEY (`livestreamId`) REFERENCES `livestreams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_workflows` ADD CONSTRAINT `approval_workflows_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_workflows` ADD CONSTRAINT `approval_workflows_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics` ADD CONSTRAINT `analytics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics` ADD CONSTRAINT `analytics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics` ADD CONSTRAINT `analytics_adAccountId_fkey` FOREIGN KEY (`adAccountId`) REFERENCES `ad_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_analysis` ADD CONSTRAINT `competitor_analysis_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unified_inboxes` ADD CONSTRAINT `unified_inboxes_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inbox_items` ADD CONSTRAINT `inbox_items_inboxId_fkey` FOREIGN KEY (`inboxId`) REFERENCES `unified_inboxes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inbox_items` ADD CONSTRAINT `inbox_items_relatedPostId_fkey` FOREIGN KEY (`relatedPostId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inbox_items` ADD CONSTRAINT `inbox_items_parentItemId_fkey` FOREIGN KEY (`parentItemId`) REFERENCES `inbox_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inbox_items` ADD CONSTRAINT `inbox_items_assignedUserId_fkey` FOREIGN KEY (`assignedUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inbox_items` ADD CONSTRAINT `inbox_items_repliedByUserId_fkey` FOREIGN KEY (`repliedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inbox_items` ADD CONSTRAINT `inbox_items_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_assignedAgentId_fkey` FOREIGN KEY (`assignedAgentId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `smart_links` ADD CONSTRAINT `smart_links_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `link_items` ADD CONSTRAINT `link_items_smartLinkId_fkey` FOREIGN KEY (`smartLinkId`) REFERENCES `smart_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hashtag_trackers` ADD CONSTRAINT `hashtag_trackers_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hashtag_sets` ADD CONSTRAINT `hashtag_sets_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_assistants` ADD CONSTRAINT `ai_assistants_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_library` ADD CONSTRAINT `media_library_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_library` ADD CONSTRAINT `media_library_uploadedByUserId_fkey` FOREIGN KEY (`uploadedByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_notifications` ADD CONSTRAINT `system_notifications_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_notifications` ADD CONSTRAINT `system_notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
