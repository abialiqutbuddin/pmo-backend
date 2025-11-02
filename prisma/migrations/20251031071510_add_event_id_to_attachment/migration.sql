/*
  Warnings:

  - You are about to drop the column `bytes` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `AttachmentLink` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[entityType,entityId,attachmentId]` on the table `AttachmentLink` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdBy` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityId` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `AttachmentLink` DROP FOREIGN KEY `AttachmentLink_attachmentId_fkey`;

-- DropForeignKey
ALTER TABLE `AttachmentLink` DROP FOREIGN KEY `AttachmentLink_eventId_fkey`;

-- DropIndex
DROP INDEX `AttachmentLink_attachmentId_fkey` ON `AttachmentLink`;

-- DropIndex
DROP INDEX `AttachmentLink_eventId_idx` ON `AttachmentLink`;

-- AlterTable
ALTER TABLE `Attachment` DROP COLUMN `bytes`,
    DROP COLUMN `height`,
    DROP COLUMN `width`,
    ADD COLUMN `createdBy` VARCHAR(191) NOT NULL,
    ADD COLUMN `entityId` VARCHAR(191) NOT NULL,
    ADD COLUMN `entityType` VARCHAR(191) NOT NULL,
    ADD COLUMN `eventId` VARCHAR(191) NOT NULL,
    ADD COLUMN `size` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `AttachmentLink` DROP COLUMN `eventId`;

-- CreateTable
CREATE TABLE `_AttachmentLinkToEvent` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_AttachmentLinkToEvent_AB_unique`(`A`, `B`),
    INDEX `_AttachmentLinkToEvent_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Attachment_eventId_entityType_entityId_idx` ON `Attachment`(`eventId`, `entityType`, `entityId`);

-- CreateIndex
CREATE UNIQUE INDEX `AttachmentLink_entityType_entityId_attachmentId_key` ON `AttachmentLink`(`entityType`, `entityId`, `attachmentId`);

-- AddForeignKey
ALTER TABLE `AttachmentLink` ADD CONSTRAINT `AttachmentLink_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `Attachment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AttachmentLinkToEvent` ADD CONSTRAINT `_AttachmentLinkToEvent_A_fkey` FOREIGN KEY (`A`) REFERENCES `AttachmentLink`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AttachmentLinkToEvent` ADD CONSTRAINT `_AttachmentLinkToEvent_B_fkey` FOREIGN KEY (`B`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
