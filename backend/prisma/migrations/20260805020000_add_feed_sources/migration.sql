-- CreateTable
CREATE TABLE `feed_sources` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `category` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `feed_sources_brandId_idx`(`brandId`),
    INDEX `feed_sources_isSystem_category_idx`(`isSystem`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feed_entries` (
    `id` VARCHAR(191) NOT NULL,
    `feedSourceId` VARCHAR(191) NOT NULL,
    `guid` VARCHAR(500) NOT NULL,
    `title` TEXT NOT NULL,
    `link` VARCHAR(2048) NOT NULL,
    `summary` TEXT NULL,
    `imageUrl` VARCHAR(2048) NULL,
    `publishedAt` DATETIME(3) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `feed_entries_feedSourceId_publishedAt_idx`(`feedSourceId`, `publishedAt`),
    UNIQUE INDEX `feed_entries_feedSourceId_guid_key`(`feedSourceId`, `guid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `feed_sources` ADD CONSTRAINT `feed_sources_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feed_entries` ADD CONSTRAINT `feed_entries_feedSourceId_fkey` FOREIGN KEY (`feedSourceId`) REFERENCES `feed_sources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
