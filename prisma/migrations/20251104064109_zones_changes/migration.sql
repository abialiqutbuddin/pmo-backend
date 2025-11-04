-- CreateTable
CREATE TABLE `ZonalDepartmentTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ZonalDepartmentTemplate_eventId_idx`(`eventId`),
    UNIQUE INDEX `ZonalDepartmentTemplate_eventId_name_key`(`eventId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZoneZonalDepartment` (
    `id` VARCHAR(191) NOT NULL,
    `zoneId` VARCHAR(191) NOT NULL,
    `zdeptId` VARCHAR(191) NOT NULL,

    INDEX `ZoneZonalDepartment_zoneId_idx`(`zoneId`),
    UNIQUE INDEX `ZoneZonalDepartment_zoneId_zdeptId_key`(`zoneId`, `zdeptId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ZonalDepartmentTemplate` ADD CONSTRAINT `ZonalDepartmentTemplate_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneZonalDepartment` ADD CONSTRAINT `ZoneZonalDepartment_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneZonalDepartment` ADD CONSTRAINT `ZoneZonalDepartment_zdeptId_fkey` FOREIGN KEY (`zdeptId`) REFERENCES `ZonalDepartmentTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
