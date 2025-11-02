/*
  Warnings:

  - A unique constraint covering the columns `[itsId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `designation` VARCHAR(191) NULL,
    ADD COLUMN `itsId` VARCHAR(8) NULL,
    ADD COLUMN `organization` VARCHAR(191) NULL,
    ADD COLUMN `phoneNumber` VARCHAR(191) NULL,
    ADD COLUMN `profileImage` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_itsId_key` ON `User`(`itsId`);
