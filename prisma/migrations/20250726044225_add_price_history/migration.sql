-- DropForeignKey
ALTER TABLE `investments` DROP FOREIGN KEY `investments_goalId_fkey`;

-- AlterTable
ALTER TABLE `investments` MODIFY `goalId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `price_history` (
    `id` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `price_history_symbol_timestamp_idx`(`symbol`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `investments` ADD CONSTRAINT `investments_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
