-- Add historical data tables for real trend analysis

-- Historical price data for stocks/mutual funds
CREATE TABLE IF NOT EXISTS `HistoricalPrice` (
  `id` VARCHAR(191) NOT NULL,
  `symbol` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `open` DECIMAL(15,4) NOT NULL,
  `high` DECIMAL(15,4) NOT NULL,
  `low` DECIMAL(15,4) NOT NULL,
  `close` DECIMAL(15,4) NOT NULL,
  `volume` BIGINT NULL,
  `source` VARCHAR(191) NOT NULL DEFAULT 'API',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `HistoricalPrice_symbol_date_key`(`symbol`, `date`),
  INDEX `HistoricalPrice_symbol_idx`(`symbol`),
  INDEX `HistoricalPrice_date_idx`(`date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Portfolio value snapshots over time
CREATE TABLE IF NOT EXISTS `PortfolioSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `totalValue` DECIMAL(15,2) NOT NULL,
  `totalInvested` DECIMAL(15,2) NOT NULL,
  `totalGainLoss` DECIMAL(15,2) NOT NULL,
  `totalGainLossPercentage` DECIMAL(8,4) NOT NULL,
  `assetAllocation` JSON NOT NULL,
  `accountDistribution` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PortfolioSnapshot_date_key`(`date`),
  INDEX `PortfolioSnapshot_date_idx`(`date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Goal progress history
CREATE TABLE IF NOT EXISTS `GoalProgressHistory` (
  `id` VARCHAR(191) NOT NULL,
  `goalId` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `currentValue` DECIMAL(15,2) NOT NULL,
  `progress` DECIMAL(8,4) NOT NULL,
  `remainingAmount` DECIMAL(15,2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `GoalProgressHistory_goalId_date_key`(`goalId`, `date`),
  INDEX `GoalProgressHistory_goalId_idx`(`goalId`),
  INDEX `GoalProgressHistory_date_idx`(`date`),
  
  CONSTRAINT `GoalProgressHistory_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `Goal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Investment value history (for individual investments)
CREATE TABLE IF NOT EXISTS `InvestmentValueHistory` (
  `id` VARCHAR(191) NOT NULL,
  `investmentId` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `price` DECIMAL(15,4) NOT NULL,
  `currentValue` DECIMAL(15,2) NOT NULL,
  `gainLoss` DECIMAL(15,2) NOT NULL,
  `gainLossPercentage` DECIMAL(8,4) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `InvestmentValueHistory_investmentId_date_key`(`investmentId`, `date`),
  INDEX `InvestmentValueHistory_investmentId_idx`(`investmentId`),
  INDEX `InvestmentValueHistory_date_idx`(`date`),
  
  CONSTRAINT `InvestmentValueHistory_investmentId_fkey` FOREIGN KEY (`investmentId`) REFERENCES `Investment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;