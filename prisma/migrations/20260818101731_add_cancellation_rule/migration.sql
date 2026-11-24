-- CreateTable
CREATE TABLE `CancellationRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `daysBeforeArrival` INTEGER NOT NULL DEFAULT 0,
    `displaySequence` INTEGER NOT NULL DEFAULT 0,
    `cancelBeforeTime` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CancellationRule_propertyModuleId_idx`(`propertyModuleId`),
    UNIQUE INDEX `CancellationRule_propertyModuleId_code_key`(`propertyModuleId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CancellationRule` ADD CONSTRAINT `CancellationRule_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
