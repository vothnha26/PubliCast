-- CreateTable
CREATE TABLE `channel_groups` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL,
    `visibility` ENUM('TEAM', 'PRIVATE') NOT NULL DEFAULT 'TEAM',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `channel_groups_brandId_idx`(`brandId`),
    UNIQUE INDEX `channel_groups_brandId_createdByUserId_name_key`(`brandId`, `createdByUserId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `channel_group_members` (
    `id` VARCHAR(191) NOT NULL,
    `channelGroupId` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `channel_group_members_socialAccountId_idx`(`socialAccountId`),
    UNIQUE INDEX `channel_group_members_channelGroupId_socialAccountId_key`(`channelGroupId`, `socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `channel_groups` ADD CONSTRAINT `channel_groups_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `channel_groups` ADD CONSTRAINT `channel_groups_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `channel_group_members` ADD CONSTRAINT `channel_group_members_channelGroupId_fkey` FOREIGN KEY (`channelGroupId`) REFERENCES `channel_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `channel_group_members` ADD CONSTRAINT `channel_group_members_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
