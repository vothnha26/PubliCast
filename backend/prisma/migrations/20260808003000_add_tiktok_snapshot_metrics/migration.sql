-- AlterTable
ALTER TABLE `tiktok_channel_snapshots` ADD COLUMN `comments` INTEGER NULL,
    ADD COLUMN `likes` INTEGER NULL,
    ADD COLUMN `shares` INTEGER NULL,
    ADD COLUMN `views` INTEGER NULL,
    MODIFY `followersGained` INTEGER NULL,
    MODIFY `followersLost` INTEGER NULL;
