/*
  Warnings:

  - A unique constraint covering the columns `[itsId,tenantId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `User_itsId_key` ON `User`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `isTenantManager` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `User_itsId_tenantId_key` ON `User`(`itsId`, `tenantId`);
