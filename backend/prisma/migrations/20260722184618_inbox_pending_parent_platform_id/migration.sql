-- AlterTable
ALTER TABLE `inbox_items` ADD COLUMN `pendingParentPlatformId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `reports` ADD COLUMN `sizeBytes` INTEGER NULL;

-- CreateIndex
CREATE INDEX `inbox_items_pendingParentPlatformId_idx` ON `inbox_items`(`pendingParentPlatformId`);
