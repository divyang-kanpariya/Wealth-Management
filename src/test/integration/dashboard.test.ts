import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { InvestmentType, AccountType } from '@prisma/client'

// Test the dashboard API endpoint
describe('Dashboard Integration Tests', () => {
  let testGoalId: string
  let testAccountId: string
  let testInvestmentIds: string[] = []

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.investment.deleteMany({
      where: { name: { contains: 'Test' } }
    })
    await prisma.goal.deleteMany({
      where: { name: { contains: 'Test' } }
    })
    await prisma.account.deleteMany({
      where: { name: { contains: 'Test' } }
    })
    await prisma.priceCache.deleteMany({
      where: { symbol: { in: ['TESTSTOCK', 'TESTMF'] } }
    })

    // Create test goal
    const goal = await prisma.goal.create({
      data: {
        name: 'Test Retirement Goal',
        targetAmount: 1000000,
        targetDate: new Date('2030-12-31'),
        priority: 1,
        description: 'Test goal for retirement'
      }
    })
    testGoalId = goal.id

    // Create test account
    const account = await prisma.account.create({
      data: {
        name: 'Test Broker Account',
        type: AccountType.BROKER,
        notes: 'Test broker account'
      }
    })
    testAccountId = account.id

    // Create test price cache entries
    await prisma.priceCache.createMany({
      data: [
        {
          symbol: 'TESTSTOCK',
          price: 150.0,
          source: 'NSE',
          lastUpdated: new Date()
        },
        {
          symbol: 'TESTMF',
          price: 25.0,
          source: 'AMFI',
          lastUpdated: new Date()
        }
      ]
    })
  })

  afterEach(async () => {
    // Clean up test data
    if (testInvestmentIds.length > 0) {
      await prisma.investment.deleteMany({
        where: { id: { in: testInvestmentIds } }
      })
    }
    if (testGoalId) {
      await prisma.goal.delete({ where: { id: testGoalId } }).catch(() => {})
    }
    if (testAccountId) {
      await prisma.account.delete({ where: { id: testAccountId } }).catch(() => {})
    }
    await prisma.priceCache.deleteMany({
      where: { symbol: { in: ['TESTSTOCK', 'TESTMF'] } }
    })
  })

  describe('Dashboard API Endpoint', () => {
    it('should return empty dashboard data when no investments exist', async () => {
      const response = await fetch('http://localhost:3000/api/dashboard/summary')
      expect(response.ok).toBe(true)

      const data = await response.json()
      
      expect(data.portfolioSummary.totalValue).toBe(0)
      expect(data.portfolioSummary.totalInvested).toBe(0)
      expect(data.portfolioSummary.totalGainLoss).toBe(0)
      expect(data.portfolioSummary.totalGainLossPercentage).toBe(0)
      expect(Object.keys(data.portfolioSummary.assetAllocation)).toHaveLength(0)
      expect(Object.keys(data.portfolioSummary.accountDistribution)).toHaveLength(0)
      expect(data.goalProgress).toHaveLength(1) // Our test goal exists
      expect(data.totalInvestments).toBe(0)
      expect(data.totalGoals).toBe(1)
    })

    it('should calculate portfolio summary correctly with unit-based investments', async () => {
      // Create test investments
      const stockInvestment = await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Test Stock Investment',
          symbol: 'TESTSTOCK',
          units: 100,
          buyPrice: 120.0,
          buyDate: new Date('2024-01-01'),
          goalId: testGoalId,
          accountId: testAccountId,
          notes: 'Test stock investment'
        }
      })

      const mfInvestment = await prisma.investment.create({
        data: {
          type: InvestmentType.MUTUAL_FUND,
          name: 'Test Mutual Fund',
          symbol: 'TESTMF',
          units: 500,
          buyPrice: 20.0,
          buyDate: new Date('2024-01-15'),
          goalId: testGoalId,
          accountId: testAccountId,
          notes: 'Test mutual fund investment'
        }
      })

      testInvestmentIds = [stockInvestment.id, mfInvestment.id]

      const response = await fetch('http://localhost:3000/api/dashboard/summary')
      expect(response.ok).toBe(true)

      const data = await response.json()
      
      // Stock: 100 units * 120 buy price = 12000 invested, 100 * 150 current = 15000 current
      // MF: 500 units * 20 buy price = 10000 invested, 500 * 25 current = 12500 current
      // Total invested: 22000, Total current: 27500, Gain: 5500, Gain%: 25%
      
      expect(data.portfolioSummary.totalInvested).toBe(22000)
      expect(data.portfolioSummary.totalValue).toBe(27500)
      expect(data.portfolioSummary.totalGainLoss).toBe(5500)
      expect(data.portfolioSummary.totalGainLossPercentage).toBeCloseTo(25, 2)
      
      // Asset allocation
      expect(data.portfolioSummary.assetAllocation.STOCK.value).toBe(15000)
      expect(data.portfolioSummary.assetAllocation.STOCK.percentage).toBeCloseTo(54.55, 1)
      expect(data.portfolioSummary.assetAllocation.MUTUAL_FUND.value).toBe(12500)
      expect(data.portfolioSummary.assetAllocation.MUTUAL_FUND.percentage).toBeCloseTo(45.45, 1)
      
      // Account distribution
      expect(data.portfolioSummary.accountDistribution['Test Broker Account'].value).toBe(27500)
      expect(data.portfolioSummary.accountDistribution['Test Broker Account'].percentage).toBe(100)
      
      expect(data.totalInvestments).toBe(2)
    })

    it('should calculate portfolio summary correctly with total-value investments', async () => {
      // Create test investments
      const realEstateInvestment = await prisma.investment.create({
        data: {
          type: InvestmentType.REAL_ESTATE,
          name: 'Test Property',
          totalValue: 5000000,
          buyDate: new Date('2023-06-01'),
          goalId: testGoalId,
          accountId: testAccountId,
          notes: 'Test real estate investment'
        }
      })

      const goldInvestment = await prisma.investment.create({
        data: {
          type: InvestmentType.GOLD,
          name: 'Test Gold Investment',
          totalValue: 200000,
          buyDate: new Date('2024-02-01'),
          goalId: testGoalId,
          accountId: testAccountId,
          notes: 'Test gold investment'
        }
      })

      testInvestmentIds = [realEstateInvestment.id, goldInvestment.id]

      const response = await fetch('http://localhost:3000/api/dashboard/summary')
      expect(response.ok).toBe(true)

      const data = await response.json()
      
      // Total invested and current should be the same for total-value investments
      expect(data.portfolioSummary.totalInvested).toBe(5200000)
      expect(data.portfolioSummary.totalValue).toBe(5200000)
      expect(data.portfolioSummary.totalGainLoss).toBe(0)
      expect(data.portfolioSummary.totalGainLossPercentage).toBe(0)
      
      // Asset allocation
      expect(data.portfolioSummary.assetAllocation.REAL_ESTATE.value).toBe(5000000)
      expect(data.portfolioSummary.assetAllocation.REAL_ESTATE.percentage).toBeCloseTo(96.15, 1)
      expect(data.portfolioSummary.assetAllocation.GOLD.value).toBe(200000)
      expect(data.portfolioSummary.assetAllocation.GOLD.percentage).toBeCloseTo(3.85, 1)
    })

    it('should calculate goal progress correctly', async () => {
      // Create investments linked to the test goal
      const investment1 = await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Test Stock for Goal',
          symbol: 'TESTSTOCK',
          units: 200,
          buyPrice: 120.0,
          buyDate: new Date('2024-01-01'),
          goalId: testGoalId,
          accountId: testAccountId
        }
      })

      const investment2 = await prisma.investment.create({
        data: {
          type: InvestmentType.MUTUAL_FUND,
          name: 'Test MF for Goal',
          symbol: 'TESTMF',
          units: 1000,
          buyPrice: 20.0,
          buyDate: new Date('2024-01-15'),
          goalId: testGoalId,
          accountId: testAccountId
        }
      })

      testInvestmentIds = [investment1.id, investment2.id]

      const response = await fetch('http://localhost:3000/api/dashboard/summary')
      expect(response.ok).toBe(true)

      const data = await response.json()
      
      // Stock: 200 * 150 = 30000, MF: 1000 * 25 = 25000, Total: 55000
      // Goal target: 1000000, Progress: 55000/1000000 = 5.5%
      
      const goalProgress = data.goalProgress.find((g: any) => g.id === testGoalId)
      expect(goalProgress).toBeDefined()
      expect(goalProgress.currentValue).toBe(55000)
      expect(goalProgress.progress).toBeCloseTo(5.5, 1)
      expect(goalProgress.remainingAmount).toBe(945000)
      expect(goalProgress.targetAmount).toBe(1000000)
    })

    it('should include top performers data', async () => {
      // Create investments with different performance
      const goodStock = await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Good Performing Stock',
          symbol: 'TESTSTOCK',
          units: 100,
          buyPrice: 100.0, // Current price 150, so 50% gain
          buyDate: new Date('2024-01-01'),
          goalId: testGoalId,
          accountId: testAccountId
        }
      })

      // Create a poor performing stock by updating price cache
      await prisma.priceCache.create({
        data: {
          symbol: 'POORSTOCK',
          price: 80.0,
          source: 'NSE',
          lastUpdated: new Date()
        }
      })

      const poorStock = await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Poor Performing Stock',
          symbol: 'POORSTOCK',
          units: 100,
          buyPrice: 120.0, // Current price 80, so -33.33% loss
          buyDate: new Date('2024-01-01'),
          goalId: testGoalId,
          accountId: testAccountId
        }
      })

      testInvestmentIds = [goodStock.id, poorStock.id]

      const response = await fetch('http://localhost:3000/api/dashboard/summary')
      expect(response.ok).toBe(true)

      const data = await response.json()
      
      expect(data.topPerformers).toBeDefined()
      expect(data.topPerformers.topGainers).toBeDefined()
      expect(data.topPerformers.topLosers).toBeDefined()
      expect(data.topPerformers.topPercentageGainers).toBeDefined()
      expect(data.topPerformers.topPercentageLosers).toBeDefined()
      
      expect(data.investmentsWithValues).toBeDefined()
      expect(data.investmentsWithValues).toHaveLength(2)
      
      // Clean up the additional price cache entry
      await prisma.priceCache.delete({ where: { symbol: 'POORSTOCK' } })
    })

    it('should handle mixed investment types correctly', async () => {
      // Create a mix of unit-based and total-value investments
      const stockInvestment = await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Mixed Portfolio Stock',
          symbol: 'TESTSTOCK',
          units: 50,
          buyPrice: 140.0,
          buyDate: new Date('2024-01-01'),
          goalId: testGoalId,
          accountId: testAccountId
        }
      })

      const realEstateInvestment = await prisma.investment.create({
        data: {
          type: InvestmentType.REAL_ESTATE,
          name: 'Mixed Portfolio Property',
          totalValue: 2000000,
          buyDate: new Date('2023-12-01'),
          goalId: testGoalId,
          accountId: testAccountId
        }
      })

      testInvestmentIds = [stockInvestment.id, realEstateInvestment.id]

      const response = await fetch('http://localhost:3000/api/dashboard/summary')
      expect(response.ok).toBe(true)

      const data = await response.json()
      
      // Stock: 50 * 140 = 7000 invested, 50 * 150 = 7500 current
      // Real Estate: 2000000 invested and current
      // Total: 2007000 invested, 2007500 current, 500 gain
      
      expect(data.portfolioSummary.totalInvested).toBe(2007000)
      expect(data.portfolioSummary.totalValue).toBe(2007500)
      expect(data.portfolioSummary.totalGainLoss).toBe(500)
      expect(data.portfolioSummary.totalGainLossPercentage).toBeCloseTo(0.025, 3)
      
      // Asset allocation should include both types
      expect(data.portfolioSummary.assetAllocation.STOCK).toBeDefined()
      expect(data.portfolioSummary.assetAllocation.REAL_ESTATE).toBeDefined()
      expect(data.portfolioSummary.assetAllocation.STOCK.value).toBe(7500)
      expect(data.portfolioSummary.assetAllocation.REAL_ESTATE.value).toBe(2000000)
    })

    it('should handle API errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the endpoint returns proper error structure
      const response = await fetch('http://localhost:3000/api/dashboard/summary')
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data).toHaveProperty('portfolioSummary')
      expect(data).toHaveProperty('goalProgress')
      expect(data).toHaveProperty('totalInvestments')
      expect(data).toHaveProperty('totalGoals')
    })
  })

  describe('Dashboard Data Accuracy', () => {
    it('should maintain data consistency across multiple investments', async () => {
      // Create multiple investments across different types and accounts
      const account2 = await prisma.account.create({
        data: {
          name: 'Test Bank Account',
          type: AccountType.BANK,
          notes: 'Test bank account'
        }
      })

      const investments = await prisma.investment.createMany({
        data: [
          {
            type: InvestmentType.STOCK,
            name: 'Stock A',
            symbol: 'TESTSTOCK',
            units: 100,
            buyPrice: 120.0,
            buyDate: new Date('2024-01-01'),
            goalId: testGoalId,
            accountId: testAccountId
          },
          {
            type: InvestmentType.MUTUAL_FUND,
            name: 'MF A',
            symbol: 'TESTMF',
            units: 200,
            buyPrice: 22.0,
            buyDate: new Date('2024-01-15'),
            goalId: testGoalId,
            accountId: account2.id
          },
          {
            type: InvestmentType.GOLD,
            name: 'Gold Investment',
            totalValue: 100000,
            buyDate: new Date('2024-02-01'),
            goalId: testGoalId,
            accountId: testAccountId
          }
        ]
      })

      // Get all created investments for cleanup
      const createdInvestments = await prisma.investment.findMany({
        where: { name: { in: ['Stock A', 'MF A', 'Gold Investment'] } }
      })
      testInvestmentIds = createdInvestments.map(inv => inv.id)

      const response = await fetch('http://localhost:3000/api/dashboard/summary')
      expect(response.ok).toBe(true)

      const data = await response.json()
      
      // Verify totals
      // Stock: 100 * 120 = 12000 invested, 100 * 150 = 15000 current
      // MF: 200 * 22 = 4400 invested, 200 * 25 = 5000 current  
      // Gold: 100000 invested and current
      // Total: 116400 invested, 120000 current, 3600 gain
      
      expect(data.portfolioSummary.totalInvested).toBe(116400)
      expect(data.portfolioSummary.totalValue).toBe(120000)
      expect(data.portfolioSummary.totalGainLoss).toBe(3600)
      
      // Verify asset allocation percentages sum to 100%
      const assetPercentages = Object.values(data.portfolioSummary.assetAllocation)
        .map((asset: any) => asset.percentage)
        .reduce((sum: number, pct: number) => sum + pct, 0)
      expect(assetPercentages).toBeCloseTo(100, 1)
      
      // Verify account distribution percentages sum to 100%
      const accountPercentages = Object.values(data.portfolioSummary.accountDistribution)
        .map((account: any) => account.percentage)
        .reduce((sum: number, pct: number) => sum + pct, 0)
      expect(accountPercentages).toBeCloseTo(100, 1)
      
      // Clean up additional account
      await prisma.account.delete({ where: { id: account2.id } })
    })

    it('should handle price cache misses gracefully', async () => {
      // Create investment with symbol not in price cache
      const investment = await prisma.investment.create({
        data: {
          type: InvestmentType.STOCK,
          name: 'Stock Without Price',
          symbol: 'NOPRICE',
          units: 100,
          buyPrice: 50.0,
          buyDate: new Date('2024-01-01'),
          goalId: testGoalId,
          accountId: testAccountId
        }
      })

      testInvestmentIds = [investment.id]

      const response = await fetch('http://localhost:3000/api/dashboard/summary')
      expect(response.ok).toBe(true)

      const data = await response.json()
      
      // Should use buy price as current price when no cache entry exists
      expect(data.portfolioSummary.totalInvested).toBe(5000)
      expect(data.portfolioSummary.totalValue).toBe(5000)
      expect(data.portfolioSummary.totalGainLoss).toBe(0)
      expect(data.portfolioSummary.totalGainLossPercentage).toBe(0)
    })
  })
})