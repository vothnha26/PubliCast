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
