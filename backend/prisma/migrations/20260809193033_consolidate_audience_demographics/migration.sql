-- CreateTable (moved ahead of the DropTable statement below so the
-- INSERT ... SELECT backfill has somewhere to copy the old audience rows
-- into before their source table is dropped)
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

-- Backfill: copy every existing YouTube audience snapshot row into the
-- unified table before the source table is dropped below. The old
-- schema stored three separate raw JSON-encoded LongText blobs with no
-- fixed internal shape (demographicsJson mixed age/gender together), so
-- rather than guess a field-by-field split, demographicsJson is preserved
-- whole under ageDistribution (the closest semantic match) and
-- geographyJson/trafficSourcesJson map 1:1 onto their renamed columns.
-- CAST(... AS JSON) is safe here since these columns were always
-- JSON.stringify'd text, never arbitrary strings.
INSERT IGNORE INTO `channel_demographics`
  (`id`, `brandId`, `socialAccountId`, `platform`, `snapshotDate`, `ageDistribution`, `genderDistribution`, `countryDistribution`, `trafficSourceDistribution`, `fetchedAt`, `createdAt`)
SELECT
  UUID(), `brandId`, `socialAccountId`, 'YOUTUBE', `snapshotDate`,
  CASE WHEN `demographicsJson` IS NULL OR `demographicsJson` = '' THEN NULL ELSE CAST(`demographicsJson` AS JSON) END,
  NULL,
  CASE WHEN `geographyJson` IS NULL OR `geographyJson` = '' THEN NULL ELSE CAST(`geographyJson` AS JSON) END,
  CASE WHEN `trafficSourcesJson` IS NULL OR `trafficSourcesJson` = '' THEN NULL ELSE CAST(`trafficSourcesJson` AS JSON) END,
  `fetchedAt`, `createdAt`
FROM `youtube_audience_snapshots`;

-- DropForeignKey
ALTER TABLE `youtube_audience_snapshots` DROP FOREIGN KEY `youtube_audience_snapshots_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `youtube_audience_snapshots` DROP FOREIGN KEY `youtube_audience_snapshots_socialAccountId_fkey`;

-- DropTable
DROP TABLE `youtube_audience_snapshots`;

