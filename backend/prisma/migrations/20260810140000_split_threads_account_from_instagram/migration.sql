-- CreateTable
-- Split out from instagram_accounts — Threads previously shared that table
-- (discriminated only by the parent social_accounts.platform column), but
-- has no equivalent of facebookPageId/accountType/businessCategoryName
-- (Instagram-only concepts). See schema.prisma's ThreadsAccount comment for
-- the bug this caused (saveInstagramAnalytics hardcoded analyticsType to
-- INSTAGRAM_DETAILED even for Threads syncs).
CREATE TABLE `threads_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `socialAccountId` VARCHAR(191) NOT NULL,
    `followersCount` INTEGER NOT NULL DEFAULT 0,
    `followingCount` INTEGER NOT NULL DEFAULT 0,
    `mediaCount` INTEGER NOT NULL DEFAULT 0,
    `biography` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,

    UNIQUE INDEX `threads_accounts_socialAccountId_key`(`socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `threads_accounts` ADD CONSTRAINT `threads_accounts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: copy every row from instagram_accounts whose parent
-- social_accounts.platform is THREADS (should be exactly the rows written
-- there by the old shared upsertInstagramAccount/upsertThreadsAccount path)
-- into the new table, dropping the Instagram-only columns that were always
-- meaningless for Threads rows (facebookPageId, accountType,
-- businessCategoryName never had real Threads data — see
-- threads/index.js#syncChannelMetrics, which always passes
-- followingCount/mediaCount as null and never sets facebookPageId/
-- accountType/businessCategoryName for Threads at all).
INSERT INTO `threads_accounts` (`id`, `socialAccountId`, `followersCount`, `followingCount`, `mediaCount`, `biography`, `website`)
SELECT ia.`id`, ia.`socialAccountId`, ia.`followersCount`, ia.`followingCount`, ia.`mediaCount`, ia.`biography`, ia.`website`
FROM `instagram_accounts` ia
INNER JOIN `social_accounts` sa ON sa.`id` = ia.`socialAccountId`
WHERE sa.`platform` = 'THREADS';

-- Remove the now-migrated Threads rows from instagram_accounts so the table
-- only ever holds real Instagram accounts going forward.
DELETE ia FROM `instagram_accounts` ia
INNER JOIN `social_accounts` sa ON sa.`id` = ia.`socialAccountId`
WHERE sa.`platform` = 'THREADS';
