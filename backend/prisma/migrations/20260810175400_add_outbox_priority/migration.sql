-- DropIndex
DROP INDEX `outbox_events_status_nextRunAt_idx` ON `outbox_events`;

-- AlterTable
ALTER TABLE `outbox_events` ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 100;

-- CreateIndex
CREATE INDEX `outbox_events_status_priority_nextRunAt_idx` ON `outbox_events`(`status`, `priority`, `nextRunAt`);
