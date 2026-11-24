CREATE TABLE `RevenueGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `revenueGroupClassification` ENUM('Accomodation', 'Transport Revenue', 'Shop Sales', 'F&B floorCode', 'Tax') NOT NULL,
    `Sac_Hsn` ENUM('SAC', 'HSN') NOT NULL,
    `sacHsnNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RevenueGroup_propertyModuleId_idx`(`propertyModuleId`),
    UNIQUE INDEX `RevenueGroup_propertyModuleId_code_key`(`propertyModuleId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_RevenueToRevenueGroup` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_RevenueToRevenueGroup_AB_unique`(`A`, `B`),
    INDEX `_RevenueToRevenueGroup_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RevenueGroup` ADD CONSTRAINT `RevenueGroup_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_RevenueToRevenueGroup` ADD CONSTRAINT `_RevenueToRevenueGroup_A_fkey` FOREIGN KEY (`A`) REFERENCES `Revenue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_RevenueToRevenueGroup` ADD CONSTRAINT `_RevenueToRevenueGroup_B_fkey` FOREIGN KEY (`B`) REFERENCES `RevenueGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
