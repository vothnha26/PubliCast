-- CreateTable
CREATE TABLE `post_targets` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `platform` ENUM('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'PINTEREST', 'YOUTUBE', 'TWITCH', 'THREADS', 'BLUESKY', 'REDDIT', 'GOOGLE_BUSINESS', 'TELEGRAM', 'GOOGLE_DRIVE') NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,

    INDEX `post_targets_socialAccountId_idx`(`socialAccountId`),
    UNIQUE INDEX `post_targets_postId_socialAccountId_key`(`postId`, `socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_targets` ADD CONSTRAINT `post_targets_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_targets` ADD CONSTRAINT `post_targets_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
