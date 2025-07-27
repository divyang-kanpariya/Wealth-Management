-- CreateTable
CREATE TABLE `sips` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `frequency` ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `goalId` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sips_accountId_idx`(`accountId`),
    INDEX `sips_goalId_idx`(`goalId`),
    INDEX `sips_status_idx`(`status`),
    INDEX `sips_symbol_idx`(`symbol`),
    INDEX `sips_startDate_idx`(`startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sip_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `sipId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `nav` DOUBLE NOT NULL,
    `units` DOUBLE NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sip_transactions_sipId_idx`(`sipId`),
    INDEX `sip_transactions_transactionDate_idx`(`transactionDate`),
    INDEX `sip_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `investments_accountId_fkey` ON `investments`(`accountId`);

-- CreateIndex
CREATE INDEX `investments_goalId_fkey` ON `investments`(`goalId`);

-- AddForeignKey
ALTER TABLE `sips` ADD CONSTRAINT `sips_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sips` ADD CONSTRAINT `sips_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sip_transactions` ADD CONSTRAINT `sip_transactions_sipId_fkey` FOREIGN KEY (`sipId`) REFERENCES `sips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
