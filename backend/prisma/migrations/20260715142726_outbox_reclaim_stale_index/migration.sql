-- CreateIndex
CREATE INDEX `outbox_events_status_updatedAt_idx` ON `outbox_events`(`status`, `updatedAt`);
