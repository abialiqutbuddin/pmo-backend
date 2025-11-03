-- AlterTable
ALTER TABLE `Task` ADD COLUMN `type` ENUM('issue', 'new_task', 'taujeeh', 'improvement') NOT NULL DEFAULT 'new_task',
    ADD COLUMN `venueId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Venue` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Venue_eventId_idx`(`eventId`),
    UNIQUE INDEX `Venue_eventId_name_key`(`eventId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Task_venueId_idx` ON `Task`(`venueId`);

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_venueId_fkey` FOREIGN KEY (`venueId`) REFERENCES `Venue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venue` ADD CONSTRAINT `Venue_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
