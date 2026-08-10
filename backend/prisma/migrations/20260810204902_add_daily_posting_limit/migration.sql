-- CreateTable
CREATE TABLE `PlatformDailyLimit` (
    `id` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL,
    `maxPostsPerDay` INTEGER NOT NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformDailyLimit_platform_key`(`platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostingUsageDaily` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `publishedCount` INTEGER NOT NULL DEFAULT 0,
    `limitAtDate` INTEGER NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostingUsageDaily_brandId_idx`(`brandId`),
    INDEX `PostingUsageDaily_platform_snapshotDate_idx`(`platform`, `snapshotDate`),
    UNIQUE INDEX `PostingUsageDaily_socialAccountId_snapshotDate_platform_key`(`socialAccountId`, `snapshotDate`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PostingUsageDaily` ADD CONSTRAINT `PostingUsageDaily_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostingUsageDaily` ADD CONSTRAINT `PostingUsageDaily_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: Fair Use daily posting caps per platform (matches Buffer's published
-- limits — see project plan). Applies to every user regardless of billing
-- plan; this protects the connected account from the platform itself
-- rate-limiting/banning it, independent of PlanLimit.maxPostsPerMonth.
INSERT INTO `PlatformDailyLimit` (`id`, `platform`, `maxPostsPerDay`, `createdAt`, `updatedAt`) VALUES
    (UUID(), 'FACEBOOK', 35, NOW(3), NOW(3)),
    (UUID(), 'INSTAGRAM', 50, NOW(3), NOW(3)),
    (UUID(), 'TIKTOK', 25, NOW(3), NOW(3)),
    (UUID(), 'YOUTUBE', 10, NOW(3), NOW(3)),
    (UUID(), 'THREADS', 250, NOW(3), NOW(3)),
    (UUID(), 'BLUESKY', 100, NOW(3), NOW(3));
