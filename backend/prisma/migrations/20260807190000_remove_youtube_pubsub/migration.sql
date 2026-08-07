-- Remove YouTube PubSubHubbub webhook feature entirely (subscribe-on-connect,
-- unsubscribe-on-disconnect, renewal scheduler, webhook endpoint) — sync is
-- now only triggered by the cron scheduler and the initial OAuth connect.

-- DropForeignKey
ALTER TABLE `youtube_subscriptions` DROP FOREIGN KEY `youtube_subscriptions_youtube_channel_id_fkey`;

-- DropTable
DROP TABLE `youtube_subscriptions`;
