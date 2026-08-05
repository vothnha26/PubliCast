-- AlterTable
ALTER TABLE `posts` ADD COLUMN `libraryVisibility` ENUM('TEAM', 'PRIVATE') NOT NULL DEFAULT 'TEAM';
