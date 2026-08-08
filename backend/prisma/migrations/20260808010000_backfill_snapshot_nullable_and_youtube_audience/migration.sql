-- Backfill migration: these schema changes (channel snapshot columns made
-- nullable, thumbnail/permalink URLs widened to TEXT, and the
-- youtube_audience_snapshots table) were previously applied straight to the
-- dev database via `prisma db push` without ever generating a migration
-- file — this records that already-applied state so `migrate deploy` on
-- other environments (staging/production) converges to the same schema.
-- AlterTable
ALTER TABLE `facebook_channel_snapshots` MODIFY `followersGained` int NULL,
    MODIFY `followersLost` int NULL,
    MODIFY `reach` int NULL,
    MODIFY `impressions` int NULL,
    MODIFY `pageViews` int NULL;

-- AlterTable
ALTER TABLE `facebook_post_metrics` MODIFY `thumbnailUrl` text NULL,
    MODIFY `permalinkUrl` text NULL;

-- AlterTable
ALTER TABLE `instagram_channel_snapshots` MODIFY `followersGained` int NULL,
    MODIFY `followersLost` int NULL,
    MODIFY `profileViews` int NULL,
    MODIFY `reach` int NULL,
    MODIFY `views` int NULL;

-- AlterTable
ALTER TABLE `social_post_metrics` MODIFY `thumbnailUrl` text NULL,
    MODIFY `postUrl` text NULL;

-- AlterTable
ALTER TABLE `tracked_videos` MODIFY `thumbnailUrl` text NULL;

-- CreateTable
CREATE TABLE `youtube_audience_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `snapshotDate` DATE NOT NULL,
    `demographicsJson` LONGTEXT NULL,
    `geographyJson` LONGTEXT NULL,
    `trafficSourcesJson` LONGTEXT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `youtube_audience_snapshots_brandId_idx`(`brandId` ASC),
    INDEX `youtube_audience_snapshots_socialAccountId_snapshotDate_idx`(`socialAccountId` ASC, `snapshotDate` ASC),
    UNIQUE INDEX `youtube_audience_snapshots_socialAccountId_snapshotDate_key`(`socialAccountId` ASC, `snapshotDate` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `youtube_audience_snapshots` ADD CONSTRAINT `youtube_audience_snapshots_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `youtube_audience_snapshots` ADD CONSTRAINT `youtube_audience_snapshots_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

