-- AlterTable
ALTER TABLE `integration_clients` ADD COLUMN `clientSecretPrevEncrypted` VARCHAR(191) NULL,
    ADD COLUMN `secretPrevExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `secretRotatedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `integration_secret_rotation_logs` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `gracePeriodMs` INTEGER NOT NULL,
    `rotatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rotatedBy` VARCHAR(191) NOT NULL,

    INDEX `integration_secret_rotation_logs_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
