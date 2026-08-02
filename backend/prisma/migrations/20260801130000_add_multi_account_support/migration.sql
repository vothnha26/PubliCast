-- DropForeignKey
ALTER TABLE `post_network_overrides` DROP FOREIGN KEY `post_network_overrides_postId_fkey`;

-- DropIndex
DROP INDEX `post_network_overrides_postId_platform_key` ON `post_network_overrides`;

-- AlterTable
ALTER TABLE `post_network_overrides` ADD COLUMN `socialAccountId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `social_accounts` ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `post_network_overrides_postId_platform_socialAccountId_key` ON `post_network_overrides`(`postId`, `platform`, `socialAccountId`);

-- AddForeignKey
ALTER TABLE `post_network_overrides` ADD CONSTRAINT `post_network_overrides_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_network_overrides` ADD CONSTRAINT `post_network_overrides_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
