-- InboxItem.platformItemId was globally @unique, which silently merged
-- InboxItems from two different brands' inboxes whenever their platform
-- comment IDs collided (e.g. two brands connecting the same YouTube channel
-- or Facebook Page) — one brand's sync would overwrite the other's row's
-- inboxId/socialAccountId. Scope uniqueness to (inboxId, platformItemId)
-- instead, so each brand's inbox always gets its own row.
ALTER TABLE `inbox_items` DROP INDEX `inbox_items_platformItemId_key`;

ALTER TABLE `inbox_items` ADD UNIQUE INDEX `inbox_items_inboxId_platformItemId_key`(`inboxId`, `platformItemId`);
