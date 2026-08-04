-- AlterTable
-- historyWindowMonths already exists on plan_limits (added manually in an
-- earlier hotfix) but was missing from schema.prisma, so Prisma Client
-- didn't know about it and every read returned undefined. This migration
-- exists only to bring migration history in sync with the schema; the
-- column itself is added defensively in case a fresh DB doesn't have it.
ALTER TABLE `plan_limits` ADD COLUMN IF NOT EXISTS `historyWindowMonths` INTEGER NOT NULL DEFAULT 1;
