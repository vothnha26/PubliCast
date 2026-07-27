/*
  Warnings:

  - You are about to drop the `post_metric_histories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `post_metric_histories` DROP FOREIGN KEY `post_metric_histories_postId_fkey`;

-- DropTable
DROP TABLE `post_metric_histories`;

-- CreateTable
CREATE TABLE `post_analytics_daily_snapshot` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `platformPostId` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM', 'DISCORD') NOT NULL,
    `date` DATE NOT NULL,
    `viewsCumulative` INTEGER NOT NULL DEFAULT 0,
    `reachCumulative` INTEGER NOT NULL DEFAULT 0,
    `clicksCumulative` INTEGER NOT NULL DEFAULT 0,
    `reactionsCumulative` INTEGER NOT NULL DEFAULT 0,
    `isEstimated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `post_analytics_daily_snapshot_brandId_date_idx`(`brandId`, `date`),
    INDEX `post_analytics_daily_snapshot_postId_idx`(`postId`),
    UNIQUE INDEX `post_analytics_daily_snapshot_platformPostId_date_key`(`platformPostId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_analytics_daily_snapshot` ADD CONSTRAINT `post_analytics_daily_snapshot_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_analytics_daily_snapshot` ADD CONSTRAINT `post_analytics_daily_snapshot_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
