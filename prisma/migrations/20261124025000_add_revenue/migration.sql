CREATE TABLE `Revenue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `classification` ENUM('Cash', 'Credit Card', 'Front Office Charge', 'F&B Outlet', 'NON F&B Outlet', 'Room Rate', 'Tax', 'Meal Plan', 'Loyalty Redemptions', 'Gift Voucher') NOT NULL,
    `type` ENUM('Both', 'Debit', 'Credit') NOT NULL,
    `Sac_Hsn` ENUM('SAC', 'HSN') NOT NULL,
    `sacHsnNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `displaySequence` INTEGER NOT NULL DEFAULT 0,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Revenue_propertyModuleId_idx`(`propertyModuleId`),
    UNIQUE INDEX `Revenue_propertyModuleId_code_key`(`propertyModuleId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Revenue` ADD CONSTRAINT `Revenue_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
