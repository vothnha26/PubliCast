/*
  Warnings:

  - You are about to drop the column `adAccountId` on the `analytics` table. All the data in the column will be lost.
  - You are about to drop the column `targetPlatforms` on the `auto_lists` table. All the data in the column will be lost.
  - You are about to drop the column `supportsCarousels` on the `instagram_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `supportsCollaboration` on the `instagram_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `supportsReels` on the `instagram_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `supportsStories` on the `instagram_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `supportsCarousels` on the `tiktok_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `madeForKids` on the `youtube_channels` table. All the data in the column will be lost.
  - You are about to drop the column `supportsShorts` on the `youtube_channels` table. All the data in the column will be lost.
  - You are about to drop the `ad_accounts` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `targetSocialAccountIds` to the `auto_lists` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ad_accounts` DROP FOREIGN KEY `ad_accounts_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `analytics` DROP FOREIGN KEY `analytics_adAccountId_fkey`;

-- DropIndex
DROP INDEX `analytics_adAccountId_fkey` ON `analytics`;

-- AlterTable
ALTER TABLE `analytics` DROP COLUMN `adAccountId`;

-- AlterTable
ALTER TABLE `auto_lists` DROP COLUMN `targetPlatforms`,
    ADD COLUMN `targetSocialAccountIds` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `instagram_accounts` DROP COLUMN `supportsCarousels`,
    DROP COLUMN `supportsCollaboration`,
    DROP COLUMN `supportsReels`,
    DROP COLUMN `supportsStories`;

-- AlterTable
ALTER TABLE `posts` MODIFY `platformPostId` TEXT NULL;

-- AlterTable
ALTER TABLE `tiktok_accounts` DROP COLUMN `supportsCarousels`;

-- AlterTable
ALTER TABLE `youtube_channels` DROP COLUMN `madeForKids`,
    DROP COLUMN `supportsShorts`;

-- DropTable
DROP TABLE `ad_accounts`;

-- CreateTable
CREATE TABLE `platform_capability_overrides` (
    `platform` VARCHAR(50) NOT NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockReason` VARCHAR(255) NULL,
    `overrides` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(50) NULL,

    PRIMARY KEY (`platform`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
