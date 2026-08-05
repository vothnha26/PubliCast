-- AlterTable
-- historyWindowMonths already exists on plan_limits (added manually in an
-- earlier hotfix) but was missing from schema.prisma, so Prisma Client
-- didn't know about it and every read returned undefined. This migration
-- exists only to bring migration history in sync with the schema; the
-- column itself is added defensively in case a fresh DB doesn't have it.
-- `IF NOT EXISTS` on ADD COLUMN isn't valid MySQL syntax (unlike Postgres),
-- so a plain conditional add via information_schema is used instead.
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'plan_limits' AND column_name = 'historyWindowMonths'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `plan_limits` ADD COLUMN `historyWindowMonths` INTEGER NOT NULL DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
