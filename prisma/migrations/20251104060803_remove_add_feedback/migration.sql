/*
  Warnings:

  - You are about to drop the column `issueId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `sourceIssueId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the `Issue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Conversation` DROP FOREIGN KEY `Conversation_issueId_fkey`;

-- DropForeignKey
ALTER TABLE `Issue` DROP FOREIGN KEY `Issue_departmentId_fkey`;

-- DropForeignKey
ALTER TABLE `Issue` DROP FOREIGN KEY `Issue_eventId_fkey`;

-- DropForeignKey
ALTER TABLE `Issue` DROP FOREIGN KEY `Issue_reporterId_fkey`;

-- DropForeignKey
ALTER TABLE `Task` DROP FOREIGN KEY `Task_sourceIssueId_fkey`;

-- DropIndex
DROP INDEX `Conversation_issueId_key` ON `Conversation`;

-- DropIndex
DROP INDEX `Task_sourceIssueId_idx` ON `Task`;

-- AlterTable
ALTER TABLE `Conversation` DROP COLUMN `issueId`;

-- AlterTable
ALTER TABLE `Task` DROP COLUMN `sourceIssueId`;

-- DropTable
DROP TABLE `Issue`;

-- CreateTable
CREATE TABLE `Feedback` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `venueId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `dateOccurred` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Feedback_eventId_dateOccurred_idx`(`eventId`, `dateOccurred`),
    INDEX `Feedback_venueId_idx`(`venueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_venueId_fkey` FOREIGN KEY (`venueId`) REFERENCES `Venue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
