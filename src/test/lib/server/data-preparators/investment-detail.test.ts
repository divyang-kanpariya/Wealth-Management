import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvestmentDetailDataPreparator } from '@/lib/server/data-preparators/investment-detail'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      findUnique: vi.fn(),
    },
    priceCache: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn),
}))

describe('InvestmentDetailDataPreparator', () => {
  let preparator: InvestmentDetailDataPreparator

  beforeEach(() => {
    preparator = new InvestmentDetailDataPreparator()
    vi.clearAllMocks()
  })

  const mockInvestment = {
    id: 'test-investment-id',
    name: 'Test Investment',
    type: 'STOCK',
    symbol: 'TEST',
    units: 100,
    buyPrice: 50,
    buyDate: new Date('2023-01-01'),
    goalId: 'goal-1',
    accountId: 'account-1',
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
    goal: {
      id: 'goal-1',
      name: 'Test Goal',
      targetAmount: 100000,
      targetDate: new Date('2024-12-31'),
      priority: 'HIGH',
      description: 'Test goal description',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    account: {
      id: 'account-1',
      name: 'Test Account',
      type: 'DEMAT',
      notes: 'Test account notes',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }

  it('should prepare investment detail data successfully', async () => {
    // Mock database response
    vi.mocked(prisma.investment.findUnique).mockResolvedValue(mockInvestment)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([
      {
        id: 'price-1',
        symbol: 'TEST',
        price: 60,
        lastUpdated: new Date(),
        source: 'API',
      },
    ])

    const result = await preparator.prepare('test-investment-id')

    expect(result).toBeDefined()
    expect(result.investment).toBeDefined()
    expect(result.investment.name).toBe('Test Investment')
    expect(result.investmentWithValue).toBeDefined()
    expect(result.currentPrice).toBe(60)
    expect(result.priceData.get('TEST')).toBe(60)
    expect(result.timestamp).toBeInstanceOf(Date)
  })

  it('should throw not found error when investment does not exist', async () => {
    // Mock database to return null
    vi.mocked(prisma.investment.findUnique).mockResolvedValue(null)
    
    // Mock notFound to throw an error like Next.js does
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })

    await expect(preparator.prepare('non-existent-id')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('should handle investments without symbols (value-based)', async () => {
    const valueBased = {
      ...mockInvestment,
      symbol: null,
      units: null,
      buyPrice: null,
      totalValue: 50000,
      type: 'REAL_ESTATE',
    }

    vi.mocked(prisma.investment.findUnique).mockResolvedValue(valueBased)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    const result = await preparator.prepare('test-investment-id')

    expect(result).toBeDefined()
    expect(result.investment.totalValue).toBe(50000)
    expect(result.currentPrice).toBeUndefined()
    expect(result.priceData.size).toBe(0)
  })

  it('should handle price data fetch failures gracefully', async () => {
    vi.mocked(prisma.investment.findUnique).mockResolvedValue(mockInvestment)
    vi.mocked(prisma.priceCache.findMany).mockRejectedValue(new Error('Price fetch failed'))

    const result = await preparator.prepare('test-investment-id')

    expect(result).toBeDefined()
    expect(result.investment.name).toBe('Test Investment')
    expect(result.priceData.size).toBe(0)
    expect(result.currentPrice).toBeUndefined()
  })

  it('should handle investments without goals or accounts', async () => {
    const investmentWithoutRelations = {
      ...mockInvestment,
      goal: null,
      account: null,
      goalId: null,
      accountId: null,
    }

    vi.mocked(prisma.investment.findUnique).mockResolvedValue(investmentWithoutRelations)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    const result = await preparator.prepare('test-investment-id')

    expect(result).toBeDefined()
    expect(result.investment.goal).toBeUndefined()
    expect(result.investment.account).toBeNull()
  }, 10000)

  it('should handle database errors gracefully', async () => {
    vi.mocked(prisma.investment.findUnique).mockRejectedValue(new Error('Database error'))

    await expect(preparator.prepare('test-investment-id')).rejects.toThrow('Failed to prepare investment detail data')
  })

  it('should calculate investment values correctly for unit-based investments', async () => {
    vi.mocked(prisma.investment.findUnique).mockResolvedValue(mockInvestment)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([
      {
        id: 'price-1',
        symbol: 'TEST',
        price: 60,
        lastUpdated: new Date(),
        source: 'API',
      },
    ])

    const result = await preparator.prepare('test-investment-id')

    expect(result.investmentWithValue.currentValue).toBe(6000) // 100 units * 60 price
    expect(result.investmentWithValue.gainLoss).toBe(1000) // 6000 - 5000 (100 * 50)
    expect(result.investmentWithValue.gainLossPercentage).toBe(20) // (1000 / 5000) * 100
  })

  it('should handle mutual fund investments correctly', async () => {
    const mutualFund = {
      ...mockInvestment,
      type: 'MUTUAL_FUND',
      symbol: 'MF001',
    }

    vi.mocked(prisma.investment.findUnique).mockResolvedValue(mutualFund)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([
      {
        id: 'price-1',
        symbol: 'MF001',
        price: 25.5,
        lastUpdated: new Date(),
        source: 'AMFI',
      },
    ])

    const result = await preparator.prepare('test-investment-id')

    expect(result.investment.type).toBe('MUTUAL_FUND')
    expect(result.currentPrice).toBe(25.5)
    expect(result.priceData.get('MF001')).toBe(25.5)
  })

  it('should handle crypto investments correctly', async () => {
    const crypto = {
      ...mockInvestment,
      type: 'CRYPTO',
      symbol: 'BTC',
    }

    vi.mocked(prisma.investment.findUnique).mockResolvedValue(crypto)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([
      {
        id: 'price-1',
        symbol: 'BTC',
        price: 45000,
        lastUpdated: new Date(),
        source: 'CRYPTO_API',
      },
    ])

    const result = await preparator.prepare('test-investment-id')

    expect(result.investment.type).toBe('CRYPTO')
    expect(result.currentPrice).toBe(45000)
    expect(result.priceData.get('BTC')).toBe(45000)
  })
})