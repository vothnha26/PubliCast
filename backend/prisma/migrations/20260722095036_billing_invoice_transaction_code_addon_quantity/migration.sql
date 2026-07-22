-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `transactionCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pending_payments` ADD COLUMN `addonQuantity` INTEGER NULL;
