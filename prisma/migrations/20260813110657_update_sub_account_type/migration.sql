-- CreateTable
CREATE TABLE `SubAccountType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountTypeId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SubAccountType_accountTypeId_idx`(`accountTypeId`),
    UNIQUE INDEX `SubAccountType_accountTypeId_code_key`(`accountTypeId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SubAccountType` ADD CONSTRAINT `SubAccountType_accountTypeId_fkey` FOREIGN KEY (`accountTypeId`) REFERENCES `AccountType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
