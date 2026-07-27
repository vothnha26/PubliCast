/*
  Warnings:

  - You are about to drop the column `nextScheduledAt` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledDeliveryEmails` on the `reports` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledFrequency` on the `reports` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `reports` DROP COLUMN `nextScheduledAt`,
    DROP COLUMN `scheduledDeliveryEmails`,
    DROP COLUMN `scheduledFrequency`;

-- CreateTable
CREATE TABLE `report_schedule_configs` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `receiveEmail` BOOLEAN NOT NULL DEFAULT false,
    `emailsList` TEXT NOT NULL,
    `emailText` TEXT NOT NULL,
    `dayOfMonth` VARCHAR(191) NOT NULL DEFAULT '1',
    `format` ENUM('PDF', 'CSV', 'LOOKER_STUDIO') NOT NULL DEFAULT 'PDF',
    `platforms` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `report_schedule_configs_brandId_key`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `report_schedule_configs` ADD CONSTRAINT `report_schedule_configs_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
