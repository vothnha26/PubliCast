-- CreateTable
CREATE TABLE `posting_goals` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `period` ENUM('WEEKLY', 'MONTHLY') NOT NULL,
    `targetCount` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `posting_goals_brandId_idx`(`brandId`),
    UNIQUE INDEX `posting_goals_brandId_period_key`(`brandId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `posting_goals` ADD CONSTRAINT `posting_goals_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
