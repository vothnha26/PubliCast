-- AlterTable
ALTER TABLE `user_settings`
  ADD COLUMN `notificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyPostFailure` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyPublishSuccess` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyChannelDisconnect` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyCollaboration` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyBilling` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyEmptyQueue` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notifyDailyRecap` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `notifyWeeklyReport` BOOLEAN NOT NULL DEFAULT false;
