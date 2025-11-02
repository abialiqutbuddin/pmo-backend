/*
  Warnings:

  - You are about to drop the column `kind` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the `IssueAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskAttachment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[objectKey]` on the table `Attachment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `originalName` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Attachment` DROP FOREIGN KEY `Attachment_messageId_fkey`;

-- DropForeignKey
ALTER TABLE `IssueAttachment` DROP FOREIGN KEY `IssueAttachment_issueId_fkey`;

-- DropForeignKey
ALTER TABLE `TaskAttachment` DROP FOREIGN KEY `TaskAttachment_taskId_fkey`;

-- DropIndex
DROP INDEX `Attachment_messageId_idx` ON `Attachment`;

-- AlterTable
ALTER TABLE `Attachment` DROP COLUMN `kind`,
    DROP COLUMN `messageId`,
    ADD COLUMN `checksum` VARCHAR(191) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `originalName` VARCHAR(191) NOT NULL,
    ADD COLUMN `provider` ENUM('filesystem', 'minio', 's3') NOT NULL DEFAULT 'filesystem';

-- DropTable
DROP TABLE `IssueAttachment`;

-- DropTable
DROP TABLE `TaskAttachment`;

-- CreateTable
CREATE TABLE `AttachmentLink` (
    `id` VARCHAR(191) NOT NULL,
    `attachmentId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttachmentLink_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AttachmentLink_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Attachment_checksum_idx` ON `Attachment`(`checksum`);

-- CreateIndex
CREATE UNIQUE INDEX `Attachment_objectKey_key` ON `Attachment`(`objectKey`);

-- AddForeignKey
ALTER TABLE `AttachmentLink` ADD CONSTRAINT `AttachmentLink_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `Attachment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttachmentLink` ADD CONSTRAINT `AttachmentLink_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
