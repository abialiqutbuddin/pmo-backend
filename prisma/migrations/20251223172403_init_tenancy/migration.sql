-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default tenant
INSERT INTO `Tenant` (`id`, `slug`, `name`, `createdAt`, `updatedAt`) VALUES ('default-tenant', 'default', 'Default Organization', NOW(), NOW());

-- AlterTable Event
ALTER TABLE `Event` ADD COLUMN `tenantId` VARCHAR(191) NULL;
UPDATE `Event` SET `tenantId` = 'default-tenant';
ALTER TABLE `Event` MODIFY `tenantId` VARCHAR(191) NOT NULL;

-- AlterTable User
ALTER TABLE `User` ADD COLUMN `tenantId` VARCHAR(191) NULL;
UPDATE `User` SET `tenantId` = 'default-tenant';
ALTER TABLE `User` MODIFY `tenantId` VARCHAR(191) NOT NULL;

-- DropIndex
DROP INDEX `User_email_key` ON `User`;

-- CreateIndex
CREATE UNIQUE INDEX `User_email_tenantId_key` ON `User`(`email`, `tenantId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
