CREATE TABLE `Departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `designationId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `departmentModule` ENUM('Front Office', 'Point of Sale', 'Housekeeping', 'Sales & Marketing', 'Finance') NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Departments_propertyModuleId_idx`(`propertyModuleId`),
    INDEX `Departments_designationId_idx`(`designationId`),
    UNIQUE INDEX `Departments_propertyModuleId_code_key`(`propertyModuleId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Departments` ADD CONSTRAINT `Departments_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Departments` ADD CONSTRAINT `Departments_designationId_fkey` FOREIGN KEY (`designationId`) REFERENCES `Designations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
