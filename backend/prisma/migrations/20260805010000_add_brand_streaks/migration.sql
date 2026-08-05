-- CreateTable
CREATE TABLE `brand_streaks` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `longestStreak` INTEGER NOT NULL DEFAULT 0,
    `lastPostedDate` DATE NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `brand_streaks_brandId_key`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `brand_streaks` ADD CONSTRAINT `brand_streaks_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
