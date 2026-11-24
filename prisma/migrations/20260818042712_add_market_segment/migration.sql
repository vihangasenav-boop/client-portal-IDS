-- CreateTable
CREATE TABLE `MarketSegment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `marketSegmentGroupId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displaySequence` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketSegment_marketSegmentGroupId_idx`(`marketSegmentGroupId`),
    UNIQUE INDEX `MarketSegment_marketSegmentGroupId_code_key`(`marketSegmentGroupId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MarketSegment` ADD CONSTRAINT `MarketSegment_marketSegmentGroupId_fkey` FOREIGN KEY (`marketSegmentGroupId`) REFERENCES `MarketSegmentGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
