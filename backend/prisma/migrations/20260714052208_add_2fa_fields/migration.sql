-- AlterTable
ALTER TABLE `users` ADD COLUMN `isTwoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `twoFactorBackupCodes` TEXT NULL,
    ADD COLUMN `twoFactorSecret` VARCHAR(191) NULL;
