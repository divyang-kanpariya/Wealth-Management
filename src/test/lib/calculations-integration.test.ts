import { describe, it, expect } from 'vitest'
import {
  calculateInvestmentValue,
  calculatePortfolioSummary,
  calculateGoalProgress,
  calculateInvestmentsWithPrices
} from '../../lib/calculations'
import { Investment, Goal, Account, InvestmentType, AccountType } from '../../types'

describe('Calculations Integration Tests', () => {
  // Mock data for integration testing
  const mockAccount: Account = {
    id: 'acc1',
    name: 'Zerodha',
    type: AccountType.BROKER,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockGoal: Goal = {
    id: 'goal1',
    name: 'House Down Payment',
    targetAmount: 500000,
    targetDate: new Date('2025-12-31'),
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockInvestments: Investment[] = [
    {
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
    },
    {
      id: 'inv2',
      type: InvestmentType.MUTUAL_FUND,
      name: 'SBI Blue Chip Fund',
      symbol: 'SBI001',
      units: 1000,
      buyPrice: 50,
      buyDate: new Date('2023-02-01'),
      goalId: 'goal1',
      accountId: 'acc1',
      createdAt: new Date(),
      updatedAt: new Date(),
      account: mockAccount,
      goal: mockGoal
    },
    {
      id: 'inv3',
      type: InvestmentType.GOLD,
      name: 'Gold Coins',
      totalValue: 100000,
      buyDate: new Date('2023-03-01'),
      goalId: 'goal1',
      accountId: 'acc1',
      createdAt: new Date(),
      updatedAt: new Date(),
      account: mockAccount,
      goal: mockGoal
    }
  ]

  it('should calculate complete portfolio with mixed investment types', () => {
    // Mock current prices
    const priceData = new Map([
      ['RELIANCE', 2200], // 10% gain
      ['SBI001', 55]      // 10% gain
    ])

    // Calculate investments with current prices
    const investmentsWithValues = calculateInvestmentsWithPrices(mockInvestments, priceData)

    // Verify individual calculations
    expect(investmentsWithValues[0].currentValue).toBe(220000) // 100 * 2200
    expect(investmentsWithValues[0].gainLoss).toBe(20000)      // 220000 - 200000
    expect(investmentsWithValues[0].gainLossPercentage).toBe(10)

    expect(investmentsWithValues[1].currentValue).toBe(55000)  // 1000 * 55
    expect(investmentsWithValues[1].gainLoss).toBe(5000)       // 55000 - 50000
    expect(investmentsWithValues[1].gainLossPercentage).toBe(10)

    expect(investmentsWithValues[2].currentValue).toBe(100000) // Gold - no price change
    expect(investmentsWithValues[2].gainLoss).toBe(0)
    expect(investmentsWithValues[2].gainLossPercentage).toBe(0)

    // Calculate portfolio summary
    const portfolioSummary = calculatePortfolioSummary(investmentsWithValues)

    expect(portfolioSummary.totalValue).toBe(375000)     // 220000 + 55000 + 100000
    expect(portfolioSummary.totalInvested).toBe(350000)  // 200000 + 50000 + 100000
    expect(portfolioSummary.totalGainLoss).toBe(25000)   // 375000 - 350000
    expect(portfolioSummary.totalGainLossPercentage).toBeCloseTo(7.14, 2) // (25000 / 350000) * 100

    // Check asset allocation
    expect(portfolioSummary.assetAllocation[InvestmentType.STOCK].value).toBe(220000)
    expect(portfolioSummary.assetAllocation[InvestmentType.STOCK].percentage).toBeCloseTo(58.67, 2)
    
    expect(portfolioSummary.assetAllocation[InvestmentType.MUTUAL_FUND].value).toBe(55000)
    expect(portfolioSummary.assetAllocation[InvestmentType.MUTUAL_FUND].percentage).toBeCloseTo(14.67, 2)
    
    expect(portfolioSummary.assetAllocation[InvestmentType.GOLD].value).toBe(100000)
    expect(portfolioSummary.assetAllocation[InvestmentType.GOLD].percentage).toBeCloseTo(26.67, 2)

    // Check account distribution
    expect(portfolioSummary.accountDistribution['Zerodha'].value).toBe(375000)
    expect(portfolioSummary.accountDistribution['Zerodha'].percentage).toBe(100)
  })

  it('should calculate goal progress correctly', () => {
    const priceData = new Map([
      ['RELIANCE', 2200],
      ['SBI001', 55]
    ])

    const investmentsWithValues = calculateInvestmentsWithPrices(mockInvestments, priceData)
    const goalProgress = calculateGoalProgress(mockGoal, investmentsWithValues)

    expect(goalProgress.id).toBe('goal1')
    expect(goalProgress.name).toBe('House Down Payment')
    expect(goalProgress.targetAmount).toBe(500000)
    expect(goalProgress.currentValue).toBe(375000)
    expect(goalProgress.progress).toBe(75) // (375000 / 500000) * 100
    expect(goalProgress.remainingAmount).toBe(125000) // 500000 - 375000
  })

  it('should handle portfolio with no current prices', () => {
    const investmentsWithValues = calculateInvestmentsWithPrices(mockInvestments)

    const portfolioSummary = calculatePortfolioSummary(investmentsWithValues)

    // Should use buy prices for calculations
    expect(portfolioSummary.totalValue).toBe(350000)    // 200000 + 50000 + 100000
    expect(portfolioSummary.totalInvested).toBe(350000) // Same as total value
    expect(portfolioSummary.totalGainLoss).toBe(0)      // No gains without current prices
    expect(portfolioSummary.totalGainLossPercentage).toBe(0)
  })

  it('should handle mixed scenarios with partial price data', () => {
    const priceData = new Map([
      ['RELIANCE', 1800] // 10% loss, no price for mutual fund
    ])

    const investmentsWithValues = calculateInvestmentsWithPrices(mockInvestments, priceData)
    const portfolioSummary = calculatePortfolioSummary(investmentsWithValues)

    expect(investmentsWithValues[0].currentValue).toBe(180000) // 100 * 1800 (loss)
    expect(investmentsWithValues[1].currentValue).toBe(50000)  // Uses buy price (no current price)
    expect(investmentsWithValues[2].currentValue).toBe(100000) // Gold unchanged

    expect(portfolioSummary.totalValue).toBe(330000)     // 180000 + 50000 + 100000
    expect(portfolioSummary.totalInvested).toBe(350000)  // 200000 + 50000 + 100000
    expect(portfolioSummary.totalGainLoss).toBe(-20000)  // 330000 - 350000
    expect(portfolioSummary.totalGainLossPercentage).toBeCloseTo(-5.71, 2) // (-20000 / 350000) * 100
  })
})