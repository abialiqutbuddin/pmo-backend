-- CreateTable
CREATE TABLE `ZoneDepartment` (
    `id` VARCHAR(191) NOT NULL,
    `zoneId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,

    INDEX `ZoneDepartment_zoneId_idx`(`zoneId`),
    UNIQUE INDEX `ZoneDepartment_zoneId_departmentId_key`(`zoneId`, `departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ZoneDepartment` ADD CONSTRAINT `ZoneDepartment_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneDepartment` ADD CONSTRAINT `ZoneDepartment_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
