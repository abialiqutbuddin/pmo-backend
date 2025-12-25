-- AlterTable
ALTER TABLE `EventMembership` ADD COLUMN `roleId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `EventMembership_roleId_idx` ON `EventMembership`(`roleId`);

-- AddForeignKey
ALTER TABLE `EventMembership` ADD CONSTRAINT `EventMembership_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
