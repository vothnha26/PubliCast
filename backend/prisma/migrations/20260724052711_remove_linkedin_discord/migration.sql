-- DeleteRows: purge rows referencing the LINKEDIN/DISCORD platform values
-- before narrowing the `platform` ENUM columns below. Without this, MySQL
-- silently coerces any row still valued LINKEDIN/DISCORD to '' (empty
-- string) on ALTER, since that value is no longer a valid enum member.
DELETE FROM `best_time_slots` WHERE `platform` IN ('LINKEDIN', 'DISCORD');
DELETE FROM `competitor_analysis` WHERE `platform` IN ('LINKEDIN', 'DISCORD');
DELETE FROM `hashtag_trackers` WHERE `platform` IN ('LINKEDIN', 'DISCORD');
DELETE FROM `inbox_items` WHERE `platform` IN ('LINKEDIN', 'DISCORD');
DELETE FROM `social_accounts` WHERE `platform` IN ('LINKEDIN', 'DISCORD');
DELETE FROM `tracked_videos` WHERE `platform` IN ('LINKEDIN', 'DISCORD');
DELETE FROM `PlatformLimit` WHERE `platform` IN ('LINKEDIN', 'DISCORD');
DELETE FROM `post_analytics_daily_snapshot` WHERE `platform` IN ('LINKEDIN', 'DISCORD');

-- DropForeignKey
ALTER TABLE `linkedin_accounts` DROP FOREIGN KEY `linkedin_accounts_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `discord_accounts` DROP FOREIGN KEY `discord_accounts_socialAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `discord_guild_snapshots` DROP FOREIGN KEY `discord_guild_snapshots_brandId_fkey`;

-- DropTable
DROP TABLE `linkedin_accounts`;

-- DropTable
DROP TABLE `discord_accounts`;

-- DropTable
DROP TABLE `discord_guild_snapshots`;

-- AlterTable
ALTER TABLE `best_time_slots` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `competitor_analysis` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `hashtag_trackers` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `inbox_items` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `social_accounts` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `tracked_videos` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL DEFAULT 'YOUTUBE';

-- AlterTable
ALTER TABLE `PlatformLimit` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;

-- AlterTable
ALTER TABLE `post_analytics_daily_snapshot` MODIFY `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'GOOGLE_BUSINESS', 'TELEGRAM') NOT NULL;
