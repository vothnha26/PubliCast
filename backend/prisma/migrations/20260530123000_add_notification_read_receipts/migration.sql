CREATE TABLE `notification_read_receipts` (
  `id` VARCHAR(191) NOT NULL,
  `notificationId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `notification_read_receipts_notificationId_userId_key`(`notificationId`, `userId`),
  INDEX `notification_read_receipts_userId_idx`(`userId`),
  INDEX `notification_read_receipts_readAt_idx`(`readAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `notification_read_receipts`
  ADD CONSTRAINT `notification_read_receipts_notificationId_fkey`
  FOREIGN KEY (`notificationId`) REFERENCES `system_notifications`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `notification_read_receipts`
  ADD CONSTRAINT `notification_read_receipts_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
