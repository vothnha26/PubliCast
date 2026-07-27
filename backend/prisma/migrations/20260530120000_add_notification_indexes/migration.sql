-- Add indexes used by notification filters, unread counts, and newest-first sorting.
CREATE INDEX `system_notifications_type_idx` ON `system_notifications`(`type`);
CREATE INDEX `system_notifications_isRead_idx` ON `system_notifications`(`isRead`);
CREATE INDEX `system_notifications_createdAt_idx` ON `system_notifications`(`createdAt`);
