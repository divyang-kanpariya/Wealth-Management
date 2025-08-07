-- CreateIndex
CREATE INDEX `investments_type_idx` ON `investments`(`type`);

-- CreateIndex
CREATE INDEX `investments_symbol_idx` ON `investments`(`symbol`);

-- CreateIndex
CREATE INDEX `investments_createdAt_idx` ON `investments`(`createdAt`);

-- CreateIndex
CREATE INDEX `investments_buyDate_idx` ON `investments`(`buyDate`);

-- CreateIndex
CREATE INDEX `investments_accountId_type_idx` ON `investments`(`accountId`, `type`);

-- CreateIndex
CREATE INDEX `investments_goalId_type_idx` ON `investments`(`goalId`, `type`);

-- CreateIndex
CREATE INDEX `price_cache_lastUpdated_idx` ON `price_cache`(`lastUpdated`);

-- CreateIndex
CREATE INDEX `price_cache_source_idx` ON `price_cache`(`source`);

-- CreateIndex
CREATE INDEX `price_history_symbol_idx` ON `price_history`(`symbol`);

-- CreateIndex
CREATE INDEX `price_history_timestamp_idx` ON `price_history`(`timestamp`);
