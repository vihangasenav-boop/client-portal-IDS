-- CreateTable
CREATE TABLE `RoomBlock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `blockCode` VARCHAR(191) NOT NULL,
    `blockName` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RoomBlock_propertyModuleId_idx`(`propertyModuleId`),
    UNIQUE INDEX `RoomBlock_propertyModuleId_blockCode_key`(`propertyModuleId`, `blockCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RoomBlock` ADD CONSTRAINT `RoomBlock_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
