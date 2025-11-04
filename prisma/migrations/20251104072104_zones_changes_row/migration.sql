-- AlterTable
ALTER TABLE `Task` ADD COLUMN `zonalDeptRowId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Task_zonalDeptRowId_idx` ON `Task`(`zonalDeptRowId`);

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_zonalDeptRowId_fkey` FOREIGN KEY (`zonalDeptRowId`) REFERENCES `ZoneZonalDepartment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
