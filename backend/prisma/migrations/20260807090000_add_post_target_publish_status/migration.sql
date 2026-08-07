-- CreateEnum (MySQL represents Prisma enums as inline ENUM columns, not real CREATE TYPE)
-- AlterTable
ALTER TABLE `post_targets`
  ADD COLUMN `publishStatus` ENUM('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `publishedAt` DATETIME(3) NULL,
  ADD COLUMN `errorMessage` VARCHAR(191) NULL;
