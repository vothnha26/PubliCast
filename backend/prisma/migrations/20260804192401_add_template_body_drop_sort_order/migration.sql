-- AlterTable
ALTER TABLE `templates` ADD COLUMN `body` TEXT NULL;
ALTER TABLE `templates` DROP COLUMN `sortOrder`;
