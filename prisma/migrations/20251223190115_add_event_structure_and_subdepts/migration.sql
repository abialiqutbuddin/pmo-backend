-- AlterTable
ALTER TABLE `Department` ADD COLUMN `parentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Event` ADD COLUMN `structure` ENUM('ZONAL', 'HIERARCHICAL') NOT NULL DEFAULT 'ZONAL';

-- CreateIndex
CREATE INDEX `Department_parentId_idx` ON `Department`(`parentId`);

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Department`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
