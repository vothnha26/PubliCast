-- Adds socialAccountId to YouTubePlaylistCache so a brand with multiple
-- YouTube channels doesn't serve one channel's cached playlists from
-- another's cache entry. Nullable because existing rows predate this
-- column and can't be retroactively attributed to a specific channel —
-- they're effectively stale now and will be replaced on next fetch
-- (getPlaylists queries by the resolved socialAccountId, which won't match
-- these NULL rows, so it naturally re-fetches and overwrites them).

-- DropIndex (old unique constraint didn't include socialAccountId)
ALTER TABLE `youtube_playlist_cache` DROP INDEX `youtube_playlist_cache_brandId_playlistId_key`;

-- AlterTable
ALTER TABLE `youtube_playlist_cache` ADD COLUMN `socialAccountId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `youtube_playlist_cache_socialAccountId_idx` ON `youtube_playlist_cache`(`socialAccountId`);

-- CreateIndex
CREATE UNIQUE INDEX `youtube_playlist_cache_brandId_socialAccountId_playlistId_key` ON `youtube_playlist_cache`(`brandId`, `socialAccountId`, `playlistId`);

-- AddForeignKey
ALTER TABLE `youtube_playlist_cache` ADD CONSTRAINT `youtube_playlist_cache_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
