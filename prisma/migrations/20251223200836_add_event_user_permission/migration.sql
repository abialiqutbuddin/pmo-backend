-- CreateTable
CREATE TABLE `EventUserPermission` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `moduleId` VARCHAR(191) NOT NULL,
    `actions` JSON NOT NULL,

    INDEX `EventUserPermission_eventId_userId_idx`(`eventId`, `userId`),
    UNIQUE INDEX `EventUserPermission_eventId_userId_moduleId_key`(`eventId`, `userId`, `moduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventUserPermission` ADD CONSTRAINT `EventUserPermission_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventUserPermission` ADD CONSTRAINT `EventUserPermission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventUserPermission` ADD CONSTRAINT `EventUserPermission_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
