-- CreateTable
CREATE TABLE `smart_link_daily_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `smartLinkId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `pageViews` INTEGER NOT NULL DEFAULT 0,
    `uniqueVisitors` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `smart_link_daily_metrics_smartLinkId_date_key`(`smartLinkId`, `date`),
    INDEX `smart_link_daily_metrics_smartLinkId_date_idx`(`smartLinkId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `link_item_daily_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `linkItemId` VARCHAR(191) NOT NULL,
    `smartLinkId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `link_item_daily_metrics_linkItemId_date_key`(`linkItemId`, `date`),
    INDEX `link_item_daily_metrics_smartLinkId_date_idx`(`smartLinkId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `smart_link_daily_metrics` ADD CONSTRAINT `smart_link_daily_metrics_smartLinkId_fkey` FOREIGN KEY (`smartLinkId`) REFERENCES `smart_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `link_item_daily_metrics` ADD CONSTRAINT `link_item_daily_metrics_linkItemId_fkey` FOREIGN KEY (`linkItemId`) REFERENCES `link_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
