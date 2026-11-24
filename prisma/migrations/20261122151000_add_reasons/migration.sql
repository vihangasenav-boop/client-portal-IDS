CREATE TABLE `Reasons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `departmentModule` ENUM('Front Office', 'Point of Sale', 'Housekeeping', 'Sales & Marketing', 'Finance') NOT NULL,
    `operations` ENUM('Cancel Reservations', 'Delete Reservations') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Reasons_propertyModuleId_idx`(`propertyModuleId`),
    UNIQUE INDEX `Reasons_propertyModuleId_code_key`(`propertyModuleId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Reasons` ADD CONSTRAINT `Reasons_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
