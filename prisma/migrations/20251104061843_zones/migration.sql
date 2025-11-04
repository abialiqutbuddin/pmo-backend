-- AlterTable
ALTER TABLE `Event` ADD COLUMN `zonesEnabled` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `zoneId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Zone` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Zone_eventId_idx`(`eventId`),
    UNIQUE INDEX `Zone_eventId_name_key`(`eventId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZoneAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `zoneId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,

    INDEX `ZoneAssignment_userId_idx`(`userId`),
    UNIQUE INDEX `ZoneAssignment_zoneId_userId_key`(`zoneId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZoneDeptAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `zoneId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,

    INDEX `ZoneDeptAssignment_userId_idx`(`userId`),
    INDEX `ZoneDeptAssignment_zoneId_departmentId_idx`(`zoneId`, `departmentId`),
    UNIQUE INDEX `ZoneDeptAssignment_zoneId_departmentId_userId_key`(`zoneId`, `departmentId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Task_zoneId_idx` ON `Task`(`zoneId`);

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Zone` ADD CONSTRAINT `Zone_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneAssignment` ADD CONSTRAINT `ZoneAssignment_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneAssignment` ADD CONSTRAINT `ZoneAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneDeptAssignment` ADD CONSTRAINT `ZoneDeptAssignment_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneDeptAssignment` ADD CONSTRAINT `ZoneDeptAssignment_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneDeptAssignment` ADD CONSTRAINT `ZoneDeptAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
