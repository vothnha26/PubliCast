-- AlterTable
ALTER TABLE `threads_channel_snapshots` ADD COLUMN `likes` INTEGER NULL,
    ADD COLUMN `replies` INTEGER NULL,
    ADD COLUMN `reposts` INTEGER NULL,
    ADD COLUMN `views` INTEGER NULL,
    MODIFY `followingCount` INTEGER NULL,
    MODIFY `mediaCount` INTEGER NULL,
    MODIFY `followersGained` INTEGER NULL,
    MODIFY `followersLost` INTEGER NULL;
