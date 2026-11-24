-- CreateTable
CREATE TABLE `BusinessSource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `businessSourceGroupId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displaySequence` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusinessSource_businessSourceGroupId_idx`(`businessSourceGroupId`),
    UNIQUE INDEX `BusinessSource_businessSourceGroupId_code_key`(`businessSourceGroupId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BusinessSource` ADD CONSTRAINT `BusinessSource_businessSourceGroupId_fkey` FOREIGN KEY (`businessSourceGroupId`) REFERENCES `BusinessSourceGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
