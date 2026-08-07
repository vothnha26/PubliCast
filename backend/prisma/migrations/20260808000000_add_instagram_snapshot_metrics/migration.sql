-- AlterTable
ALTER TABLE `instagram_channel_snapshots` ADD COLUMN `profileViews` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `reach` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `views` INTEGER NOT NULL DEFAULT 0;
