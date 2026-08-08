-- AlterTable
ALTER TABLE `bluesky_channel_snapshots` ADD COLUMN `followersGained` INTEGER NULL,
    ADD COLUMN `followersLost` INTEGER NULL,
    ADD COLUMN `likes` INTEGER NULL,
    ADD COLUMN `quotes` INTEGER NULL,
    ADD COLUMN `replies` INTEGER NULL,
    ADD COLUMN `reposts` INTEGER NULL;
