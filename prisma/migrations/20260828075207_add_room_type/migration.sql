-- CreateTable
CREATE TABLE `RoomType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `classification` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `upgradeLevel` INTEGER NOT NULL,
    `displaySequence` INTEGER NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `description` VARCHAR(191) NULL,
    `overBooking` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RoomType_propertyModuleId_idx`(`propertyModuleId`),
    UNIQUE INDEX `RoomType_propertyModuleId_code_key`(`propertyModuleId`, `code`),
    UNIQUE INDEX `RoomType_propertyModuleId_name_key`(`propertyModuleId`, `name`),
    UNIQUE INDEX `RoomType_propertyModuleId_upgradeLevel_key`(`propertyModuleId`, `upgradeLevel`),
    UNIQUE INDEX `RoomType_propertyModuleId_displaySequence_key`(`propertyModuleId`, `displaySequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomTypeFeature` (
    `roomTypeId` INTEGER NOT NULL,
    `roomFeatureId` INTEGER NOT NULL,

    INDEX `RoomTypeFeature_roomFeatureId_idx`(`roomFeatureId`),
    PRIMARY KEY (`roomTypeId`, `roomFeatureId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomTypeAmenity` (
    `roomTypeId` INTEGER NOT NULL,
    `roomAmenityId` INTEGER NOT NULL,

    INDEX `RoomTypeAmenity_roomAmenityId_idx`(`roomAmenityId`),
    PRIMARY KEY (`roomTypeId`, `roomAmenityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RoomType` ADD CONSTRAINT `RoomType_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomTypeFeature` ADD CONSTRAINT `RoomTypeFeature_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomTypeFeature` ADD CONSTRAINT `RoomTypeFeature_roomFeatureId_fkey` FOREIGN KEY (`roomFeatureId`) REFERENCES `RoomFeature`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomTypeAmenity` ADD CONSTRAINT `RoomTypeAmenity_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomTypeAmenity` ADD CONSTRAINT `RoomTypeAmenity_roomAmenityId_fkey` FOREIGN KEY (`roomAmenityId`) REFERENCES `RoomAmenity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
