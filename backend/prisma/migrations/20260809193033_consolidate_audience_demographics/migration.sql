-- DropForeignKey
ALTER TABLE `youtube_audience_snapshots` DROP FOREIGN KEY `youtube_audience_snapshots_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `youtube_audience_snapshots` DROP FOREIGN KEY `youtube_audience_snapshots_socialAccountId_fkey`;

-- DropTable
DROP TABLE `youtube_audience_snapshots`;

-- CreateTable
CREATE TABLE `channel_demographics` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `ageDistribution` JSON NULL,
    `genderDistribution` JSON NULL,
    `countryDistribution` JSON NULL,
    `trafficSourceDistribution` JSON NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `channel_demographics_brandId_idx`(`brandId`),
    INDEX `channel_demographics_socialAccountId_snapshotDate_idx`(`socialAccountId`, `snapshotDate`),
    UNIQUE INDEX `channel_demographics_socialAccountId_snapshotDate_platform_key`(`socialAccountId`, `snapshotDate`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `channel_demographics` ADD CONSTRAINT `channel_demographics_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `channel_demographics` ADD CONSTRAINT `channel_demographics_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

