import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChartsDataPreparator } from '@/lib/server/data-preparators/charts'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      findMany: vi.fn()
    },
    goal: {
      findMany: vi.fn()
    },
    sIP: {
      findMany: vi.fn()
    },
    portfolioSnapshot: {
      findMany: vi.fn()
    },
    goalProgressHistory: {
      findMany: vi.fn()
    },
    priceCache: {
      findMany: vi.fn()
    }
  }
}))

// Mock price fetcher
vi.mock('@/lib/price-fetcher', () => ({
  batchGetPrices: vi.fn().mockResolvedValue([]),
  batchGetMutualFundNAVs: vi.fn().mockResolvedValue([])
}))

// Mock calculations
vi.mock('@/lib/calculations', () => ({
  calculateInvestmentsWithPrices: vi.fn().mockReturnValue([]),
  calculatePortfolioSummary: vi.fn().mockReturnValue({
    totalValue: 0,
    totalInvested: 0,
    totalGainLoss: 0,
    totalGainLossPercentage: 0,
    assetAllocation: {},
    accountDistribution: {}
  }),
  calculateGoalProgress: vi.fn().mockReturnValue({
    name: 'Test Goal',
    progress: 0,
    currentValue: 0,
    targetAmount: 100000,
    remainingAmount: 100000
  }),
  calculateSipValue: vi.fn().mockReturnValue({
    sip: { name: 'Test SIP' },
    totalInvested: 0,
    currentValue: 0,
    gainLoss: 0,
    gainLossPercentage: 0
  }),
  calculateSipSummary: vi.fn().mockReturnValue({
    totalCurrentValue: 0,
    totalInvested: 0,
    totalGainLoss: 0
  })
}))

describe('ChartsDataPreparator', () => {
  let preparator: ChartsDataPreparator

  beforeEach(() => {
    preparator = new ChartsDataPreparator()
    vi.clearAllMocks()
    
    // Setup default mock returns
    vi.mocked(prisma.investment.findMany).mockResolvedValue([])
    vi.mocked(prisma.goal.findMany).mockResolvedValue([])
    vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
    vi.mocked(prisma.portfolioSnapshot.findMany).mockResolvedValue([])
    vi.mocked(prisma.goalProgressHistory.findMany).mockResolvedValue([])
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])
  })

  it('should prepare charts data successfully', async () => {
    const result = await preparator.prepare()

    expect(result).toHaveProperty('timestamp')
    expect(result).toHaveProperty('dashboardData')
    expect(result).toHaveProperty('investments')
    expect(result).toHaveProperty('sips')
    expect(result).toHaveProperty('portfolioTrendData')
    expect(result).toHaveProperty('investmentGrowthData')
    expect(result).toHaveProperty('goalProgressTrendData')
    expect(result).toHaveProperty('portfolioPerformanceData')
    
    expect(result.dashboardData).toHaveProperty('portfolioSummary')
    expect(result.dashboardData).toHaveProperty('goalProgress')
    expect(result.dashboardData).toHaveProperty('totalInvestments')
    expect(result.dashboardData).toHaveProperty('totalGoals')
    
    expect(Array.isArray(result.investments)).toBe(true)
    expect(Array.isArray(result.sips)).toBe(true)
    expect(Array.isArray(result.portfolioTrendData)).toBe(true)
    expect(Array.isArray(result.investmentGrowthData)).toBe(true)
    expect(Array.isArray(result.goalProgressTrendData)).toBe(true)
    
    expect(result.portfolioPerformanceData).toHaveProperty('1M')
    expect(result.portfolioPerformanceData).toHaveProperty('3M')
    expect(result.portfolioPerformanceData).toHaveProperty('6M')
    expect(result.portfolioPerformanceData).toHaveProperty('1Y')
    expect(result.portfolioPerformanceData).toHaveProperty('ALL')
  })

  it('should handle database errors gracefully', async () => {
    // Mock database errors
    vi.mocked(prisma.portfolioSnapshot.findMany).mockRejectedValue(new Error('Table not found'))
    vi.mocked(prisma.goalProgressHistory.findMany).mockRejectedValue(new Error('Table not found'))

    const result = await preparator.prepare()

    // Should still return valid data structure
    expect(result).toHaveProperty('timestamp')
    expect(result).toHaveProperty('dashboardData')
    expect(result.portfolioTrendData).toEqual([])
    expect(result.goalProgressTrendData).toEqual([])
  })

  it('should return fallback data on complete failure', async () => {
    // Mock complete failure
    vi.mocked(prisma.investment.findMany).mockRejectedValue(new Error('Database connection failed'))

    const result = await preparator.prepare()

    expect(result).toHaveProperty('timestamp')
    expect(result.dashboardData.portfolioSummary.totalValue).toBe(0)
    expect(result.investments).toEqual([])
    expect(result.sips).toEqual([])
  })

  it('should fetch data from all required sources', async () => {
    await preparator.prepare()

    expect(prisma.investment.findMany).toHaveBeenCalled()
    expect(prisma.goal.findMany).toHaveBeenCalled()
    expect(prisma.sIP.findMany).toHaveBeenCalled()
    expect(prisma.priceCache.findMany).toHaveBeenCalled()
  })
})