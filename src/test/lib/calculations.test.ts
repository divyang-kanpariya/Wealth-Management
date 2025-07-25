import { describe, it, expect } from 'vitest'
import {
  calculateInvestmentValue,
  calculatePortfolioSummary,
  calculateGoalProgress,
  getTopPerformers,
  calculateInvestmentsWithPrices,
  aggregateByAssetType,
  aggregateByAccount,
  isUnitBasedInvestment,
  isTotalValueInvestment,
  validateInvestmentData
} from '../../lib/calculations'
import { Investment, Goal, Account, InvestmentType, AccountType } from '../../types'

// Mock data for testing
const mockAccount: Account = {
  id: 'acc1',
  name: 'Test Broker',
  type: AccountType.BROKER,
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockGoal: Goal = {
  id: 'goal1',
  name: 'Retirement',
  targetAmount: 100000,
  targetDate: new Date('2030-12-31'),
  priority: 1,
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockStockInvestment: Investment = {
  id: 'inv1',
  type: InvestmentType.STOCK,
  name: 'RELIANCE',
  symbol: 'RELIANCE',
  units: 100,
  buyPrice: 2000,
  buyDate: new Date('2023-01-01'),
  goalId: 'goal1',
  accountId: 'acc1',
  createdAt: new Date(),
  updatedAt: new Date(),
  account: mockAccount,
  goal: mockGoal
}

const mockMutualFundInvestment: Investment = {
  id: 'inv2',
  type: InvestmentType.MUTUAL_FUND,
  name: 'SBI Blue Chip Fund',
  symbol: 'SBI001',
  units: 500,
  buyPrice: 100,
  buyDate: new Date('2023-01-01'),
  goalId: 'goal1',
  accountId: 'acc1',
  createdAt: new Date(),
  updatedAt: new Date(),
  account: mockAccount,
  goal: mockGoal
}

const mockRealEstateInvestment: Investment = {
  id: 'inv3',
  type: InvestmentType.REAL_ESTATE,
  name: 'Apartment in Mumbai',
  totalValue: 5000000,
  buyDate: new Date('2023-01-01'),
  goalId: 'goal1',
  accountId: 'acc1',
  createdAt: new Date(),
  updatedAt: new Date(),
  account: mockAccount,
  goal: mockGoal
}

describe('calculateInvestmentValue', () => {
  it('should calculate value for unit-based investment with current price', () => {
    const result = calculateInvestmentValue(mockStockInvestment, 2200)
    
    expect(result.investment).toBe(mockStockInvestment)
    expect(result.currentPrice).toBe(2200)
    expect(result.currentValue).toBe(220000) // 100 * 2200
    expect(result.gainLoss).toBe(20000) // 220000 - 200000
    expect(result.gainLossPercentage).toBe(10) // (20000 / 200000) * 100
  })

  it('should calculate value for unit-based investment without current price', () => {
    const result = calculateInvestmentValue(mockStockInvestment)
    
    expect(result.currentPrice).toBeUndefined()
    expect(result.currentValue).toBe(200000) // 100 * 2000 (buy price)
    expect(result.gainLoss).toBe(0)
    expect(result.gainLossPercentage).toBe(0)
  })

  it('should calculate value for total-value investment', () => {
    const result = calculateInvestmentValue(mockRealEstateInvestment)
    
    expect(result.currentValue).toBe(5000000)
    expect(result.gainLoss).toBe(0)
    expect(result.gainLossPercentage).toBe(0)
  })

  it('should handle negative gains correctly', () => {
    const result = calculateInvestmentValue(mockStockInvestment, 1800) // Price drop
    
    expect(result.currentValue).toBe(180000) // 100 * 1800
    expect(result.gainLoss).toBe(-20000) // 180000 - 200000
    expect(result.gainLossPercentage).toBe(-10) // (-20000 / 200000) * 100
  })

  it('should throw error for invalid investment data', () => {
    const invalidInvestment: Investment = {
      ...mockStockInvestment,
      units: undefined,
      buyPrice: undefined,
      totalValue: undefined
    }
    
    expect(() => calculateInvestmentValue(invalidInvestment)).toThrow()
  })
})

describe('calculatePortfolioSummary', () => {
  it('should calculate portfolio summary correctly', () => {
    const investmentsWithValues = [
      calculateInvestmentValue(mockStockInvestment, 2200), // 220000 current, 200000 invested
      calculateInvestmentValue(mockMutualFundInvestment, 110), // 55000 current, 50000 invested
      calculateInvestmentValue(mockRealEstateInvestment) // 5000000 current and invested
    ]
    
    const summary = calculatePortfolioSummary(investmentsWithValues)
    
    expect(summary.totalValue).toBe(5275000) // 220000 + 55000 + 5000000
    expect(summary.totalInvested).toBe(5250000) // 200000 + 50000 + 5000000
    expect(summary.totalGainLoss).toBe(25000) // 5275000 - 5250000
    expect(summary.totalGainLossPercentage).toBeCloseTo(0.476, 2) // (25000 / 5250000) * 100
    
    // Check asset allocation
    expect(summary.assetAllocation[InvestmentType.STOCK].value).toBe(220000)
    expect(summary.assetAllocation[InvestmentType.MUTUAL_FUND].value).toBe(55000)
    expect(summary.assetAllocation[InvestmentType.REAL_ESTATE].value).toBe(5000000)
    
    // Check percentages
    expect(summary.assetAllocation[InvestmentType.STOCK].percentage).toBeCloseTo(4.17, 2)
    expect(summary.assetAllocation[InvestmentType.MUTUAL_FUND].percentage).toBeCloseTo(1.04, 2)
    expect(summary.assetAllocation[InvestmentType.REAL_ESTATE].percentage).toBeCloseTo(94.79, 2)
  })

  it('should handle empty portfolio', () => {
    const summary = calculatePortfolioSummary([])
    
    expect(summary.totalValue).toBe(0)
    expect(summary.totalInvested).toBe(0)
    expect(summary.totalGainLoss).toBe(0)
    expect(summary.totalGainLossPercentage).toBe(0)
    expect(Object.keys(summary.assetAllocation)).toHaveLength(0)
  })
})

describe('calculateGoalProgress', () => {
  it('should calculate goal progress correctly', () => {
    const investmentsWithValues = [
      calculateInvestmentValue(mockStockInvestment, 2200), // 220000 current
      calculateInvestmentValue(mockMutualFundInvestment, 110) // 55000 current
    ]
    
    const progress = calculateGoalProgress(mockGoal, investmentsWithValues)
    
    expect(progress.id).toBe('goal1')
    expect(progress.name).toBe('Retirement')
    expect(progress.targetAmount).toBe(100000)
    expect(progress.currentValue).toBe(275000) // 220000 + 55000
    expect(progress.progress).toBe(100) // Capped at 100% even though over target
    expect(progress.remainingAmount).toBe(0) // Max(0, 100000 - 275000)
  })

  it('should handle goal with no linked investments', () => {
    const progress = calculateGoalProgress(mockGoal, [])
    
    expect(progress.currentValue).toBe(0)
    expect(progress.progress).toBe(0)
    expect(progress.remainingAmount).toBe(100000)
  })

  it('should handle partial progress correctly', () => {
    const partialInvestment = calculateInvestmentValue({
      ...mockStockInvestment,
      units: 25 // Quarter of the original
    }, 2000)
    
    const progress = calculateGoalProgress(mockGoal, [partialInvestment])
    
    expect(progress.currentValue).toBe(50000) // 25 * 2000
    expect(progress.progress).toBe(50) // (50000 / 100000) * 100
    expect(progress.remainingAmount).toBe(50000) // 100000 - 50000
  })
})

describe('getTopPerformers', () => {
  it('should identify top performers correctly', () => {
    const investmentsWithValues = [
      calculateInvestmentValue(mockStockInvestment, 2200), // +10% gain
      calculateInvestmentValue(mockMutualFundInvestment, 90), // -10% loss
      calculateInvestmentValue({
        ...mockStockInvestment,
        id: 'inv4',
        name: 'TATA',
        symbol: 'TATA',
        units: 50,
        buyPrice: 1000
      }, 1200) // +20% gain
    ]
    
    const performers = getTopPerformers(investmentsWithValues, 2)
    
    // Top gainers by absolute value
    expect(performers.topGainers).toHaveLength(2)
    expect(performers.topGainers[0].investment.name).toBe('RELIANCE') // 20000 gain
    expect(performers.topGainers[1].investment.name).toBe('TATA') // 10000 gain
    
    // Top losers by absolute value
    expect(performers.topLosers).toHaveLength(1)
    expect(performers.topLosers[0].investment.name).toBe('SBI Blue Chip Fund') // -5000 loss
    
    // Top percentage gainers
    expect(performers.topPercentageGainers[0].investment.name).toBe('TATA') // 20%
    expect(performers.topPercentageGainers[1].investment.name).toBe('RELIANCE') // 10%
    
    // Top percentage losers
    expect(performers.topPercentageLosers[0].investment.name).toBe('SBI Blue Chip Fund') // -10%
  })

  it('should filter out non-tradable investments', () => {
    const investmentsWithValues = [
      calculateInvestmentValue(mockRealEstateInvestment), // No price data
      calculateInvestmentValue(mockStockInvestment, 2200)
    ]
    
    const performers = getTopPerformers(investmentsWithValues)
    
    expect(performers.topGainers).toHaveLength(1)
    expect(performers.topGainers[0].investment.name).toBe('RELIANCE')
  })
})

describe('calculateInvestmentsWithPrices', () => {
  it('should calculate investments with price data map', () => {
    const investments = [mockStockInvestment, mockMutualFundInvestment, mockRealEstateInvestment]
    const priceData = new Map([
      ['RELIANCE', 2200],
      ['SBI001', 110]
    ])
    
    const result = calculateInvestmentsWithPrices(investments, priceData)
    
    expect(result).toHaveLength(3)
    expect(result[0].currentPrice).toBe(2200)
    expect(result[1].currentPrice).toBe(110)
    expect(result[2].currentPrice).toBeUndefined() // Real estate has no symbol
  })

  it('should handle empty price data', () => {
    const investments = [mockStockInvestment]
    const result = calculateInvestmentsWithPrices(investments)
    
    expect(result[0].currentPrice).toBeUndefined()
    expect(result[0].currentValue).toBe(200000) // Uses buy price
  })
})

describe('aggregateByAssetType', () => {
  it('should aggregate investments by asset type', () => {
    const investmentsWithValues = [
      calculateInvestmentValue(mockStockInvestment, 2200), // +10%
      calculateInvestmentValue(mockMutualFundInvestment, 110), // +10%
      calculateInvestmentValue(mockRealEstateInvestment) // 0%
    ]
    
    const aggregation = aggregateByAssetType(investmentsWithValues)
    
    expect(aggregation[InvestmentType.STOCK].count).toBe(1)
    expect(aggregation[InvestmentType.STOCK].value).toBe(220000)
    expect(aggregation[InvestmentType.STOCK].avgGainLoss).toBe(10)
    
    expect(aggregation[InvestmentType.MUTUAL_FUND].count).toBe(1)
    expect(aggregation[InvestmentType.MUTUAL_FUND].value).toBe(55000)
    expect(aggregation[InvestmentType.MUTUAL_FUND].avgGainLoss).toBe(10)
    
    expect(aggregation[InvestmentType.REAL_ESTATE].count).toBe(1)
    expect(aggregation[InvestmentType.REAL_ESTATE].value).toBe(5000000)
    expect(aggregation[InvestmentType.REAL_ESTATE].avgGainLoss).toBe(0)
  })
})

describe('aggregateByAccount', () => {
  it('should aggregate investments by account', () => {
    const investmentsWithValues = [
      calculateInvestmentValue(mockStockInvestment, 2200),
      calculateInvestmentValue(mockMutualFundInvestment, 110)
    ]
    
    const aggregation = aggregateByAccount(investmentsWithValues)
    
    expect(aggregation['Test Broker'].count).toBe(2)
    expect(aggregation['Test Broker'].value).toBe(275000) // 220000 + 55000
    expect(aggregation['Test Broker'].percentage).toBe(100)
    expect(aggregation['Test Broker'].accountId).toBe('acc1')
  })
})

describe('isUnitBasedInvestment', () => {
  it('should identify unit-based investments correctly', () => {
    expect(isUnitBasedInvestment(mockStockInvestment)).toBe(true)
    expect(isUnitBasedInvestment(mockMutualFundInvestment)).toBe(true)
    expect(isUnitBasedInvestment(mockRealEstateInvestment)).toBe(false)
    
    const cryptoInvestment: Investment = {
      ...mockStockInvestment,
      type: InvestmentType.CRYPTO
    }
    expect(isUnitBasedInvestment(cryptoInvestment)).toBe(true)
  })
})

describe('isTotalValueInvestment', () => {
  it('should identify total-value investments correctly', () => {
    expect(isTotalValueInvestment(mockRealEstateInvestment)).toBe(true)
    expect(isTotalValueInvestment(mockStockInvestment)).toBe(false)
    
    const goldInvestment: Investment = {
      ...mockRealEstateInvestment,
      type: InvestmentType.GOLD
    }
    expect(isTotalValueInvestment(goldInvestment)).toBe(true)
  })
})

describe('validateInvestmentData', () => {
  it('should validate unit-based investment correctly', () => {
    const result = validateInvestmentData(mockStockInvestment)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should validate total-value investment correctly', () => {
    const result = validateInvestmentData(mockRealEstateInvestment)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should identify invalid unit-based investment', () => {
    const invalidInvestment: Investment = {
      ...mockStockInvestment,
      units: 0,
      buyPrice: -100
    }
    
    const result = validateInvestmentData(invalidInvestment)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Units must be greater than 0 for unit-based investments')
    expect(result.errors).toContain('Buy price must be greater than 0 for unit-based investments')
  })

  it('should identify invalid total-value investment', () => {
    const invalidInvestment: Investment = {
      ...mockRealEstateInvestment,
      totalValue: 0
    }
    
    const result = validateInvestmentData(invalidInvestment)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Total value must be greater than 0 for total-value investments')
  })

  it('should identify investment with missing data', () => {
    const invalidInvestment: Investment = {
      ...mockStockInvestment,
      units: undefined,
      buyPrice: undefined,
      totalValue: undefined
    }
    
    const result = validateInvestmentData(invalidInvestment)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Units must be greater than 0 for unit-based investments')
    expect(result.errors).toContain('Buy price must be greater than 0 for unit-based investments')
  })
})