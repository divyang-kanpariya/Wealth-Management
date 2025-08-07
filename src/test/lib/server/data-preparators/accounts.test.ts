import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountsDataPreparator } from '@/lib/server/data-preparators/accounts'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findMany: vi.fn()
    }
  }
}))

// Mock Next.js cache
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn)
}))

describe('AccountsDataPreparator', () => {
  let preparator: AccountsDataPreparator
  
  beforeEach(() => {
    preparator = new AccountsDataPreparator()
    // Clear cache before each test
    preparator['cache'].clear()
    vi.clearAllMocks()
  })

  it('should prepare accounts data successfully', async () => {
    const mockAccounts = [
      {
        id: '1',
        name: 'Test Account 1',
        type: 'BROKER',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: [
          {
            id: '1',
            name: 'Test Stock',
            type: 'STOCK',
            units: 100,
            buyPrice: 50,
            totalValue: null,
            buyDate: new Date(),
            accountId: '1',
            goalId: null,
            symbol: 'TEST',
            quantity: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      },
      {
        id: '2',
        name: 'Test Account 2',
        type: 'BANK',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: [
          {
            id: '2',
            name: 'Test Real Estate',
            type: 'REAL_ESTATE',
            units: null,
            buyPrice: null,
            totalValue: 1000000,
            buyDate: new Date(),
            accountId: '2',
            goalId: null,
            symbol: null,
            quantity: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }
    ]

    vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts)

    const result = await preparator.prepare()

    expect(result).toBeDefined()
    expect(result.accounts).toHaveLength(2)
    expect(result.totalAccounts).toBe(2)
    expect(result.totalInvestments).toBe(2)
    expect(result.totalPortfolioValue).toBe(1005000) // 100*50 + 1000000
    
    // Check account totals calculation
    expect(result.accounts[0].totalValue).toBe(5000) // 100 * 50
    expect(result.accounts[0].investmentCount).toBe(1)
    expect(result.accounts[1].totalValue).toBe(1000000)
    expect(result.accounts[1].investmentCount).toBe(1)
  })

  it('should handle empty accounts list', async () => {
    vi.mocked(prisma.account.findMany).mockResolvedValue([])

    const result = await preparator.prepare()

    expect(result).toBeDefined()
    expect(result.accounts).toHaveLength(0)
    expect(result.totalAccounts).toBe(0)
    expect(result.totalInvestments).toBe(0)
    expect(result.totalPortfolioValue).toBe(0)
  })

  it('should handle errors gracefully and return fallback data', async () => {
    vi.mocked(prisma.account.findMany).mockRejectedValue(new Error('Database error'))

    const result = await preparator.prepare()

    expect(result).toBeDefined()
    expect(result.accounts).toHaveLength(0)
    expect(result.totalAccounts).toBe(0)
    expect(result.totalInvestments).toBe(0)
    expect(result.totalPortfolioValue).toBe(0)
  })

  it('should calculate account totals correctly for mixed investment types', async () => {
    const mockAccount = {
      id: '1',
      name: 'Mixed Account',
      type: 'BROKER',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      investments: [
        {
          id: '1',
          name: 'Stock Investment',
          type: 'STOCK',
          units: 100,
          buyPrice: 50,
          totalValue: null,
          buyDate: new Date(),
          accountId: '1',
          goalId: null,
          symbol: 'STOCK1',
          quantity: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Real Estate',
          type: 'REAL_ESTATE',
          units: null,
          buyPrice: null,
          totalValue: 500000,
          buyDate: new Date(),
          accountId: '1',
          goalId: null,
          symbol: null,
          quantity: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          name: 'Mutual Fund',
          type: 'MUTUAL_FUND',
          units: 200,
          buyPrice: 25,
          totalValue: null,
          buyDate: new Date(),
          accountId: '1',
          goalId: null,
          symbol: 'MF1',
          quantity: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    }

    vi.mocked(prisma.account.findMany).mockResolvedValue([mockAccount])

    const result = await preparator.prepare()

    expect(result.accounts).toHaveLength(1)
    expect(result.accounts[0].totalValue).toBe(510000) // 100*50 + 500000 + 200*25
    expect(result.accounts[0].investmentCount).toBe(3)
    expect(result.totalPortfolioValue).toBe(510000)
    expect(result.totalInvestments).toBe(3)
  })
})