CREATE TABLE `PaymentInstructions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyModuleId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameMultilingual` VARCHAR(191) NOT NULL,
    `displaySequence` INTEGER NOT NULL DEFAULT 0,
    `description` VARCHAR(191) NULL,
    `split` INTEGER NOT NULL DEFAULT 0,
    `paymentType` ENUM('Cash', 'CreditCard', 'Cityledger', 'Cheque') NOT NULL,
    `transactionLimit` DECIMAL(10, 2) NULL,
    `forcePayment` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PaymentInstructions_propertyModuleId_idx`(`propertyModuleId`),
    UNIQUE INDEX `PaymentInstructions_propertyModuleId_code_key`(`propertyModuleId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_PaymentInstructionsToRevenueGroup` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_PaymentInstructionsToRevenueGroup_AB_unique`(`A`, `B`),
    INDEX `_PaymentInstructionsToRevenueGroup_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_PaymentInstructionsToRevenue` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_PaymentInstructionsToRevenue_AB_unique`(`A`, `B`),
    INDEX `_PaymentInstructionsToRevenue_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PaymentInstructions` ADD CONSTRAINT `PaymentInstructions_propertyModuleId_fkey` FOREIGN KEY (`propertyModuleId`) REFERENCES `PropertyModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_PaymentInstructionsToRevenueGroup` ADD CONSTRAINT `_PaymentInstructionsToRevenueGroup_A_fkey` FOREIGN KEY (`A`) REFERENCES `PaymentInstructions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_PaymentInstructionsToRevenueGroup` ADD CONSTRAINT `_PaymentInstructionsToRevenueGroup_B_fkey` FOREIGN KEY (`B`) REFERENCES `RevenueGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_PaymentInstructionsToRevenue` ADD CONSTRAINT `_PaymentInstructionsToRevenue_A_fkey` FOREIGN KEY (`A`) REFERENCES `PaymentInstructions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_PaymentInstructionsToRevenue` ADD CONSTRAINT `_PaymentInstructionsToRevenue_B_fkey` FOREIGN KEY (`B`) REFERENCES `Revenue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
