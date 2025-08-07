import { Investment, InvestmentWithCurrentValue, PortfolioSummary, GoalProgress, Goal, SIP, SIPTransaction, SIPWithCurrentValue, SIPSummary } from '@/types'

/**
 * Calculate current value, gains/losses for a single investment
 */
export function calculateInvestmentValue(
  investment: Investment, 
  currentPrice?: number
): InvestmentWithCurrentValue {
  let currentValue: number
  let investedValue: number
  
  if (investment.units && investment.buyPrice) {
    // Unit-based calculation (stocks, mutual funds, crypto)
    investedValue = investment.units * investment.buyPrice
    currentValue = currentPrice ? investment.units * currentPrice : investedValue
  } else if (investment.totalValue) {
    // Total value calculation (real estate, jewelry, gold, FD, other)
    investedValue = investment.totalValue
    currentValue = investment.totalValue // No current price for these typically
  } else {
    throw new Error(`Invalid investment data for ${investment.name}: missing units/buyPrice or totalValue`)
  }
  
  const gainLoss = currentValue - investedValue
  const gainLossPercentage = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0
  
  return {
    investment,
    currentPrice,
    currentValue,
    gainLoss,
    gainLossPercentage
  }
}

/**
 * Calculate portfolio totals and asset allocation
 */
export function calculatePortfolioSummary(
  investmentsWithValues: InvestmentWithCurrentValue[]
): PortfolioSummary {
  const totalValue = investmentsWithValues.reduce((sum, item) => sum + item.currentValue, 0)
  const totalInvested = investmentsWithValues.reduce((sum, item) => {
    const invested = item.investment.units && item.investment.buyPrice 
      ? item.investment.units * item.investment.buyPrice
      : item.investment.totalValue || 0
    return sum + invested
  }, 0)
  
  const totalGainLoss = totalValue - totalInvested
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0
  
  // Calculate asset allocation by investment type
  const assetAllocation: Record<string, { value: number; percentage: number }> = {}
  
  investmentsWithValues.forEach(item => {
    const type = item.investment.type
    if (!assetAllocation[type]) {
      assetAllocation[type] = { value: 0, percentage: 0 }
    }
    assetAllocation[type].value += item.currentValue
  })
  
  // Calculate percentages for asset allocation
  Object.keys(assetAllocation).forEach(type => {
    assetAllocation[type].percentage = totalValue > 0 
      ? (assetAllocation[type].value / totalValue) * 100 
      : 0
  })
  
  // Calculate account distribution
  const accountDistribution: Record<string, { value: number; percentage: number }> = {}
  
  investmentsWithValues.forEach(item => {
    const accountId = item.investment.accountId
    const accountName = item.investment.account?.name || accountId
    
    if (!accountDistribution[accountName]) {
      accountDistribution[accountName] = { value: 0, percentage: 0 }
    }
    accountDistribution[accountName].value += item.currentValue
  })
  
  // Calculate percentages for account distribution
  Object.keys(accountDistribution).forEach(account => {
    accountDistribution[account].percentage = totalValue > 0 
      ? (accountDistribution[account].value / totalValue) * 100 
      : 0
  })
  
  return {
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPercentage,
    assetAllocation,
    accountDistribution
  }
}

/**
 * Calculate goal progress based on linked investments
 */
export function calculateGoalProgress(
  goal: Goal,
  investmentsWithValues: InvestmentWithCurrentValue[]
): GoalProgress {
  // Filter investments linked to this goal
  const goalInvestments = investmentsWithValues.filter(
    item => item.investment.goalId === goal.id
  )
  
  const currentValue = goalInvestments.reduce((sum, item) => sum + item.currentValue, 0)
  const progress = goal.targetAmount > 0 ? (currentValue / goal.targetAmount) * 100 : 0
  const remainingAmount = Math.max(0, goal.targetAmount - currentValue)
  
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentValue,
    progress: Math.min(100, progress), // Cap at 100%
    remainingAmount,
    targetDate: goal.targetDate
  }
}

/**
 * Get top performing investments (gainers and losers)
 */
export function getTopPerformers(
  investmentsWithValues: InvestmentWithCurrentValue[],
  limit: number = 5
) {
  // Filter out investments with no price data (total value investments)
  const tradableInvestments = investmentsWithValues.filter(
    item => item.investment.units && item.investment.buyPrice && item.currentPrice
  )
  
  // Sort by absolute gain/loss (descending for gainers)
  const topGainers = [...tradableInvestments]
    .sort((a, b) => b.gainLoss - a.gainLoss)
    .slice(0, limit)
  
  // Sort by absolute gain/loss (ascending for losers)
  const topLosers = [...tradableInvestments]
    .sort((a, b) => a.gainLoss - b.gainLoss)
    .slice(0, limit)
    .filter(item => item.gainLoss < 0) // Only show actual losers
  
  // Sort by percentage gain/loss (descending for gainers)
  const topPercentageGainers = [...tradableInvestments]
    .sort((a, b) => b.gainLossPercentage - a.gainLossPercentage)
    .slice(0, limit)
  
  // Sort by percentage gain/loss (ascending for losers)
  const topPercentageLosers = [...tradableInvestments]
    .sort((a, b) => a.gainLossPercentage - b.gainLossPercentage)
    .slice(0, limit)
    .filter(item => item.gainLossPercentage < 0) // Only show actual losers
  
  return {
    topGainers,
    topLosers,
    topPercentageGainers,
    topPercentageLosers
  }
}

/**
 * Calculate investment value with price data map
 */
export function calculateInvestmentsWithPrices(
  investments: Investment[],
  priceData: Map<string, number> = new Map()
): InvestmentWithCurrentValue[] {
  return investments.map(investment => {
    const currentPrice = investment.symbol ? priceData.get(investment.symbol) : undefined
    return calculateInvestmentValue(investment, currentPrice)
  })
}

/**
 * Aggregate investments by type for asset allocation
 */
export function aggregateByAssetType(
  investmentsWithValues: InvestmentWithCurrentValue[]
): Record<string, { count: number; value: number; percentage: number; avgGainLoss: number }> {
  const totalValue = investmentsWithValues.reduce((sum, item) => sum + item.currentValue, 0)
  const aggregation: Record<string, { count: number; value: number; percentage: number; avgGainLoss: number }> = {}
  
  investmentsWithValues.forEach(item => {
    const type = item.investment.type
    if (!aggregation[type]) {
      aggregation[type] = { count: 0, value: 0, percentage: 0, avgGainLoss: 0 }
    }
    
    aggregation[type].count += 1
    aggregation[type].value += item.currentValue
    aggregation[type].avgGainLoss += item.gainLossPercentage
  })
  
  // Calculate percentages and average gain/loss
  Object.keys(aggregation).forEach(type => {
    const data = aggregation[type]
    data.percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0
    data.avgGainLoss = data.count > 0 ? data.avgGainLoss / data.count : 0
  })
  
  return aggregation
}

/**
 * Aggregate investments by account for account distribution
 */
export function aggregateByAccount(
  investmentsWithValues: InvestmentWithCurrentValue[]
): Record<string, { count: number; value: number; percentage: number; accountId: string }> {
  const totalValue = investmentsWithValues.reduce((sum, item) => sum + item.currentValue, 0)
  const aggregation: Record<string, { count: number; value: number; percentage: number; accountId: string }> = {}
  
  investmentsWithValues.forEach(item => {
    const accountName = item.investment.account?.name || `Account ${item.investment.accountId}`
    const accountId = item.investment.accountId
    
    if (!aggregation[accountName]) {
      aggregation[accountName] = { count: 0, value: 0, percentage: 0, accountId }
    }
    
    aggregation[accountName].count += 1
    aggregation[accountName].value += item.currentValue
  })
  
  // Calculate percentages
  Object.keys(aggregation).forEach(accountName => {
    const data = aggregation[accountName]
    data.percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0
  })
  
  return aggregation
}

/**
 * Helper function to determine if an investment is unit-based
 */
export function isUnitBasedInvestment(investment: Investment): boolean {
  return ['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(investment.type) && 
         Boolean(investment.units && investment.buyPrice)
}

/**
 * Helper function to determine if an investment is total-value based
 */
export function isTotalValueInvestment(investment: Investment): boolean {
  return ['REAL_ESTATE', 'JEWELRY', 'GOLD', 'FD', 'OTHER'].includes(investment.type) && 
         Boolean(investment.totalValue)
}

/**
 * Validate investment data consistency
 */
export function validateInvestmentData(investment: Investment): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check if it's a unit-based investment type
  if (['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(investment.type)) {
    if (!investment.units || investment.units <= 0) {
      errors.push('Units must be greater than 0 for unit-based investments')
    }
    if (!investment.buyPrice || investment.buyPrice <= 0) {
      errors.push('Buy price must be greater than 0 for unit-based investments')
    }
  } 
  // Check if it's a total-value investment type
  else if (['REAL_ESTATE', 'JEWELRY', 'GOLD', 'FD', 'OTHER'].includes(investment.type)) {
    if (!investment.totalValue || investment.totalValue <= 0) {
      errors.push('Total value must be greater than 0 for total-value investments')
    }
  } 
  // If neither condition is met, check what data is available
  else {
    if (!(investment.units && investment.buyPrice) && !investment.totalValue) {
      errors.push('Investment must have either (units and buyPrice) or totalValue')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Calculate SIP current value, gains/losses, and metrics
 */
export function calculateSipValue(
  sip: SIP,
  transactions: SIPTransaction[],
  currentPrice?: number
): SIPWithCurrentValue {
  const totalInvested = transactions.reduce((sum, txn) => sum + txn.amount, 0)
  const totalUnits = transactions.reduce((sum, txn) => sum + txn.units, 0)
  const averageNAV = totalUnits > 0 ? totalInvested / totalUnits : 0
  
  const currentValue = currentPrice && totalUnits > 0 
    ? totalUnits * currentPrice 
    : totalInvested
  
  const gainLoss = currentValue - totalInvested
  const gainLossPercentage = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0
  
  // Calculate next transaction date based on frequency
  const nextTransactionDate = calculateNextSipDate(sip, transactions)
  
  return {
    sip,
    totalInvested,
    totalUnits,
    currentValue,
    averageNAV,
    gainLoss,
    gainLossPercentage,
    nextTransactionDate
  }
}

/**
 * Calculate next SIP transaction date
 */
export function calculateNextSipDate(sip: SIP, transactions: SIPTransaction[]): Date | undefined {
  if (sip.status !== 'ACTIVE') {
    return undefined
  }
  
  // If no transactions yet, return start date
  if (transactions.length === 0) {
    return sip.startDate
  }
  
  // Get the last transaction date
  const lastTransaction = transactions
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0]
  
  const lastDate = new Date(lastTransaction.transactionDate)
  const nextDate = new Date(lastDate)
  
  switch (sip.frequency) {
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3)
      break
    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
  }
  
  // Check if next date exceeds end date
  if (sip.endDate && nextDate > sip.endDate) {
    return undefined
  }
  
  return nextDate
}

/**
 * Calculate SIP portfolio summary
 */
export function calculateSipSummary(sipsWithValues: SIPWithCurrentValue[]): SIPSummary {
  const totalSIPs = sipsWithValues.length
  const activeSIPs = sipsWithValues.filter(item => item.sip.status === 'ACTIVE').length
  
  const totalMonthlyAmount = sipsWithValues
    .filter(item => item.sip.status === 'ACTIVE')
    .reduce((sum, item) => {
      // Convert all frequencies to monthly equivalent
      let monthlyAmount = item.sip.amount
      switch (item.sip.frequency) {
        case 'QUARTERLY':
          monthlyAmount = item.sip.amount / 3
          break
        case 'YEARLY':
          monthlyAmount = item.sip.amount / 12
          break
      }
      return sum + monthlyAmount
    }, 0)
  
  const totalInvested = sipsWithValues.reduce((sum, item) => sum + item.totalInvested, 0)
  const totalCurrentValue = sipsWithValues.reduce((sum, item) => sum + item.currentValue, 0)
  const totalGainLoss = totalCurrentValue - totalInvested
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0
  
  return {
    totalSIPs,
    activeSIPs,
    totalMonthlyAmount,
    totalInvested,
    totalCurrentValue,
    totalGainLoss,
    totalGainLossPercentage
  }
}

/**
 * Get SIPs due for transaction processing
 */
export function getSipsDueForProcessing(
  sips: SIP[],
  transactions: SIPTransaction[],
  targetDate: Date = new Date()
): SIP[] {
  return sips.filter(sip => {
    if (sip.status !== 'ACTIVE') {
      return false
    }
    
    const sipTransactions = transactions.filter(txn => txn.sipId === sip.id)
    const nextDate = calculateNextSipDate(sip, sipTransactions)
    
    return nextDate && nextDate <= targetDate
  })
}

/**
 * Calculate SIP transaction units based on amount and NAV
 */
export function calculateSipTransactionUnits(amount: number, nav: number): number {
  if (nav <= 0) {
    throw new Error('NAV must be greater than 0')
  }
  return amount / nav
}

/**
 * Validate SIP data consistency
 */
export function validateSipData(sip: SIP): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!sip.name || sip.name.trim().length === 0) {
    errors.push('SIP name is required')
  }
  
  if (!sip.symbol || sip.symbol.trim().length === 0) {
    errors.push('Symbol is required')
  }
  
  if (!sip.amount || sip.amount <= 0) {
    errors.push('Amount must be greater than 0')
  }
  
  if (!sip.startDate) {
    errors.push('Start date is required')
  }
  
  if (sip.endDate && sip.startDate && sip.endDate <= sip.startDate) {
    errors.push('End date must be after start date')
  }
  
  if (!sip.accountId || sip.accountId.trim().length === 0) {
    errors.push('Account is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}