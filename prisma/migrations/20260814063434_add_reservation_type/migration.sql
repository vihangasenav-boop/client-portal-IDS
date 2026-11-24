-- CreateTable
CREATE TABLE `ReservationType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `group` ENUM('WAITLIST', 'CONFIRM', 'TENTATIVE') NOT NULL,
    `displaySequence` INTEGER NOT NULL DEFAULT 0,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReservationType_propertyModuleId_idx`(`propertyModuleId`),
    UNIQUE INDEX `ReservationType_propertyModuleId_code_key`(`propertyModuleId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReservationType` ADD CONSTRAINT `ReservationType_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
