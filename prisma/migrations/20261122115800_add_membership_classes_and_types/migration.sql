-- CreateTable
CREATE TABLE `MembershipClass` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MembershipClass_propertyModuleId_idx`(`propertyModuleId`),
    UNIQUE INDEX `MembershipClass_propertyModuleId_code_key`(`propertyModuleId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `membershipClassId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displaySequence` INTEGER NOT NULL DEFAULT 0,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MembershipType_membershipClassId_idx`(`membershipClassId`),
    UNIQUE INDEX `MembershipType_membershipClassId_code_key`(`membershipClassId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MembershipClass` ADD CONSTRAINT `MembershipClass_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipType` ADD CONSTRAINT `MembershipType_membershipClassId_fkey` FOREIGN KEY (`membershipClassId`) REFERENCES `MembershipClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
