-- DropForeignKey
ALTER TABLE `Task` DROP FOREIGN KEY `Task_id_fkey`;

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `sourceIssueId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Task_sourceIssueId_idx` ON `Task`(`sourceIssueId`);

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_sourceIssueId_fkey` FOREIGN KEY (`sourceIssueId`) REFERENCES `Issue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
