-- Adds a JSON-in-text `settings` column to post_network_overrides so
-- platform-specific technical fields (YouTube category/privacy/tags,
-- TikTok duet/stitch, etc.) can be overridden per (platform, account) pair
-- instead of sharing one flat value across every account of a platform.
-- Nullable — existing rows and single-account platforms have no need for it.

ALTER TABLE `post_network_overrides` ADD COLUMN `settings` TEXT NULL;
