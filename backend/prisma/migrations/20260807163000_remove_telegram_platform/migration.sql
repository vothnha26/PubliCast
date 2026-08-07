-- Remove Telegram platform integration entirely.

-- DeleteData: remove the seeded PlatformLimit row for TELEGRAM before the
-- ENUM is narrowed below — MySQL would otherwise silently truncate this
-- row's `platform` value to '' instead of failing loudly.
DELETE FROM `PlatformLimit` WHERE `platform` = 'TELEGRAM';

-- DropTable (dropping the table also drops its FK constraint; MySQL has no
-- DROP FOREIGN KEY IF EXISTS syntax, so there's no separate step for that)
DROP TABLE IF EXISTS `telegram_accounts`;

-- AlterTable: drop TELEGRAM from every `platform` ENUM column typed
-- PlatformType. MySQL requires redefining the full ENUM per column; any
-- existing 'TELEGRAM' rows must be removed/reassigned before this runs, since
-- MySQL truncates values not present in the new list to ''.
ALTER TABLE `social_accounts` MODIFY COLUMN `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL;

ALTER TABLE `post_targets` MODIFY COLUMN `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL;

ALTER TABLE `post_network_overrides` MODIFY COLUMN `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL;

ALTER TABLE `best_time_slots` MODIFY COLUMN `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL;

ALTER TABLE `competitor_analysis` MODIFY COLUMN `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL;

ALTER TABLE `social_post_metrics` MODIFY COLUMN `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL;

ALTER TABLE `inbox_items` MODIFY COLUMN `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL;

ALTER TABLE `hashtag_trackers` MODIFY COLUMN `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL;

ALTER TABLE `PlatformLimit` MODIFY COLUMN `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'GOOGLE_DRIVE') NOT NULL;
