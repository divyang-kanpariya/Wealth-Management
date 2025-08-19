import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import all data preparators
import { DashboardDataPreparator } from '@/lib/server/data-preparators/dashboard'
import { ChartsDataPreparator } from '@/lib/server/data-preparators/charts'
import { InvestmentsDataPreparator } from '@/lib/server/data-preparators/investments'
import { GoalsDataPreparator } from '@/lib/server/data-preparators/goals'
import { SIPsDataPreparator } from '@/lib/server/data-preparators/sips'
import { AccountsDataPreparator } from '@/lib/server/data-preparators/accounts'
import { InvestmentDetailDataPreparator } from '@/lib/server/data-preparators/investment-detail'
import { GoalDetailDataPreparator } from '@/lib/server/data-preparators/goal-detail'
import { SIPDetailDataPreparator } from '@/lib/server/data-preparators/sip-detail'
import { AccountDetailDataPreparator } from '@/lib/server/data-preparators/account-detail'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    goal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    sIP: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    priceCache: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

// Mock external services - mutual fund NAV functionality is now unified in price-fetcher

vi.mock('@/lib/price-fetcher', () => ({
  fetchStockPrices: vi.fn(),
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  redirect: vi.fn(),
}))

describe('Error Scenarios and Fallback Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Database Connection Errors', () => {
    it('should handle complete database failure gracefully', async () => {
      const preparator = new DashboardDataPreparator()
      
      // Mock complete database failure
      const { prisma } = await import('@/lib/prisma')
      const dbError = new Error('Connection refused')
      vi.mocked(prisma.investment.findMany).mockRejectedValue(dbError)
      vi.mocked(prisma.goal.findMany).mockRejectedValue(dbError)
      vi.mocked(prisma.sIP.findMany).mockRejectedValue(dbError)
      vi.mocked(prisma.account.findMany).mockRejectedValue(dbError)
      vi.mocked(prisma.transaction.findMany).mockRejectedValue(dbError)

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.summary).toBeDefined()
      
      // Should provide safe fallback values
      expect(typeof result.summary.totalValue).toBe('number')
      expect(typeof result.summary.totalInvested).toBe('number')
      expect(typeof result.summary.totalGains).toBe('number')
      expect(Array.isArray(result.recentTransactions)).toBe(true)
      expect(Array.isArray(result.goalProgress)).toBe(true)
    })

    it('should handle partial database failures', async () => {
      const preparator = new ChartsDataPreparator()
      
      // Mock partial database failure
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.sIP.findMany).mockRejectedValue(new Error('SIP table unavailable'))
      vi.mocked(prisma.priceCache.findMany).mockRejectedValue(new Error('Price cache unavailable'))

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.dashboardData).toBeDefined()
      expect(Array.isArray(result.investments)).toBe(true)
      expect(Array.isArray(result.sips)).toBe(true) // Should be empty array as fallback
      expect(Array.isArray(result.portfolioTrendData)).toBe(true)
    })

    it('should handle database timeout errors', async () => {
      const preparator = new InvestmentsDataPreparator()
      
      // Mock database timeout
      const { prisma } = await import('@/lib/prisma')
      const timeoutError = new Error('Query timeout')
      timeoutError.name = 'TimeoutError'
      vi.mocked(prisma.investment.findMany).mockRejectedValue(timeoutError)
      vi.mocked(prisma.priceCache.findMany).mockRejectedValue(timeoutError)

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(Array.isArray(result.investmentsWithValues)).toBe(true)
      expect(result.summary).toBeDefined()
      
      // Should provide empty but valid data structure
      expect(result.investmentsWithValues).toHaveLength(0)
      expect(result.summary.count).toBe(0)
    })
  })

  describe('External Service Failures', () => {
    it('should handle price service failures', async () => {
      const preparator = new InvestmentsDataPreparator()
      
      // Mock successful database but failed price service
      const { prisma } = await import('@/lib/prisma')
      const mockInvestments = [
        {
          id: '1',
          name: 'Test Stock',
          type: 'STOCK',
          symbol: 'TEST',
          units: 100,
          buyPrice: 50,
          currentPrice: null, // No current price available
          accountId: 'acc1',
          goalId: 'goal1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      
      vi.mocked(prisma.investment.findMany).mockResolvedValue(mockInvestments)
      vi.mocked(prisma.priceCache.findMany).mockRejectedValue(new Error('Price service unavailable'))

      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      vi.mocked(fetchStockPrices).mockRejectedValue(new Error('External API down'))

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.investmentsWithValues).toHaveLength(1)
      
      // Should use fallback pricing (buy price or zero)
      const investment = result.investmentsWithValues[0]
      expect(investment.currentPrice).toBeDefined()
      expect(investment.currentValue).toBeDefined()
    })

    it('should handle mutual fund NAV service failures', async () => {
      const preparator = new SIPsDataPreparator()
      
      // Mock successful database but failed NAV service
      const { prisma } = await import('@/lib/prisma')
      const mockSIPs = [
        {
          id: '1',
          name: 'Test SIP',
          amount: 5000,
          frequency: 'MONTHLY',
          startDate: new Date('2024-01-01'),
          status: 'ACTIVE',
          investment: {
            id: '1',
            name: 'Test MF',
            type: 'MUTUAL_FUND',
            symbol: 'TESTMF',
            units: 100,
            buyPrice: 25,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      
      vi.mocked(prisma.sIP.findMany).mockResolvedValue(mockSIPs)
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      // Mutual fund price fetching is now handled by unified price fetcher
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      vi.mocked(batchGetPrices).mockRejectedValue(new Error('Price service down'))

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.sipsWithValues).toHaveLength(1)
      
      // Should use fallback NAV values
      const sip = result.sipsWithValues[0]
      expect(sip.currentValue).toBeDefined()
      expect(typeof sip.currentValue).toBe('number')
    })

    it('should handle multiple external service failures', async () => {
      const preparator = new ChartsDataPreparator()
      
      // Mock database success but all external services fail
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
      vi.mocked(prisma.priceCache.findMany).mockRejectedValue(new Error('Price cache down'))

      const { batchGetPrices } = await import('@/lib/price-fetcher')
      vi.mocked(batchGetPrices).mockRejectedValue(new Error('Unified price API down'))

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.dashboardData).toBeDefined()
      expect(Array.isArray(result.investments)).toBe(true)
      expect(Array.isArray(result.sips)).toBe(true)
      expect(Array.isArray(result.portfolioTrendData)).toBe(true)
    })
  })

  describe('Data Corruption and Invalid Data', () => {
    it('should handle corrupted investment data', async () => {
      const preparator = new InvestmentsDataPreparator()
      
      // Mock corrupted data
      const { prisma } = await import('@/lib/prisma')
      const corruptedInvestments = [
        {
          id: '1',
          name: null, // Corrupted name
          type: 'INVALID_TYPE', // Invalid type
          symbol: '',
          units: -100, // Invalid units
          buyPrice: 'not_a_number', // Invalid price
          currentPrice: null,
          accountId: null,
          goalId: null,
          createdAt: 'invalid_date',
          updatedAt: new Date(),
        },
        {
          // Missing required fields
          id: '2',
          type: 'STOCK',
        },
      ]
      
      vi.mocked(prisma.investment.findMany).mockResolvedValue(corruptedInvestments as any)
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(Array.isArray(result.investmentsWithValues)).toBe(true)
      expect(result.summary).toBeDefined()
      
      // Should filter out or sanitize corrupted data
      result.investmentsWithValues.forEach(investment => {
        expect(typeof investment.name).toBe('string')
        expect(typeof investment.currentValue).toBe('number')
        expect(typeof investment.totalInvested).toBe('number')
      })
    })

    it('should handle invalid date formats', async () => {
      const preparator = new GoalDetailDataPreparator()
      
      // Mock goal with invalid dates
      const { prisma } = await import('@/lib/prisma')
      const mockGoal = {
        id: '1',
        name: 'Test Goal',
        targetAmount: 100000,
        targetDate: 'invalid_date', // Invalid date
        priority: 'HIGH',
        createdAt: 'also_invalid',
        updatedAt: new Date(),
      }
      
      vi.mocked(prisma.goal.findUnique).mockResolvedValue(mockGoal as any)
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])

      const result = await preparator.prepare('1')

      expect(result).toBeDefined()
      expect(result.goal).toBeDefined()
      
      // Should provide valid date fallbacks
      expect(result.goal.targetDate).toBeInstanceOf(Date)
    })

    it('should handle null and undefined values gracefully', async () => {
      const preparator = new AccountDetailDataPreparator()
      
      // Mock account with null values
      const { prisma } = await import('@/lib/prisma')
      const mockAccount = {
        id: '1',
        name: null,
        type: null,
        provider: undefined,
        accountNumber: '',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccount as any)
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])

      const result = await preparator.prepare('1')

      expect(result).toBeDefined()
      expect(result.account).toBeDefined()
      
      // Should provide safe string fallbacks
      expect(typeof result.account.name).toBe('string')
      expect(typeof result.account.type).toBe('string')
      expect(typeof result.account.provider).toBe('string')
    })
  })

  describe('Resource Not Found Scenarios', () => {
    it('should throw 404 for non-existent investment', async () => {
      const preparator = new InvestmentDetailDataPreparator()
      
      // Mock not found
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findUnique).mockResolvedValue(null)

      await expect(preparator.prepare('nonexistent')).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('should throw 404 for non-existent goal', async () => {
      const preparator = new GoalDetailDataPreparator()
      
      // Mock not found
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.goal.findUnique).mockResolvedValue(null)

      await expect(preparator.prepare('nonexistent')).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('should throw 404 for non-existent SIP', async () => {
      const preparator = new SIPDetailDataPreparator()
      
      // Mock not found
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.sIP.findUnique).mockResolvedValue(null)

      await expect(preparator.prepare('nonexistent')).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('should throw 404 for non-existent account', async () => {
      const preparator = new AccountDetailDataPreparator()
      
      // Mock not found
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.account.findUnique).mockResolvedValue(null)

      await expect(preparator.prepare('nonexistent')).rejects.toThrow('NEXT_NOT_FOUND')
    })
  })

  describe('Memory and Performance Under Stress', () => {
    it('should handle large datasets without memory issues', async () => {
      const preparator = new InvestmentsDataPreparator()
      
      // Mock very large dataset
      const { prisma } = await import('@/lib/prisma')
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `inv${i}`,
        name: `Investment ${i}`,
        type: 'STOCK',
        symbol: `STOCK${i}`,
        units: 100 + i,
        buyPrice: 50 + (i % 100),
        currentPrice: 60 + (i % 100),
        accountId: `acc${i % 100}`,
        goalId: `goal${i % 50}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      
      vi.mocked(prisma.investment.findMany).mockResolvedValue(largeDataset)
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      const initialMemory = process.memoryUsage().heapUsed

      const result = await preparator.prepare()

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      expect(result).toBeDefined()
      expect(result.investmentsWithValues).toHaveLength(10000)
      
      // Memory increase should be reasonable (less than 100MB for 10k records)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
    })

    it('should handle concurrent error scenarios', async () => {
      const preparators = [
        new DashboardDataPreparator(),
        new InvestmentsDataPreparator(),
        new GoalsDataPreparator(),
      ]
      
      // Mock different types of failures for each
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Timeout'))
      
      vi.mocked(prisma.goal.findMany)
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce([])
      
      vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
      vi.mocked(prisma.account.findMany).mockResolvedValue([])
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([])
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      const results = await Promise.allSettled([
        preparators[0].prepare(),
        preparators[1].prepare(),
        preparators[2].prepare(),
      ])

      // All should resolve (not reject) due to error handling
      results.forEach(result => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined()
        }
      })
    })
  })

  describe('Network and Connectivity Issues', () => {
    it('should handle intermittent network failures', async () => {
      const preparator = new ChartsDataPreparator()
      
      // Mock intermittent failures
      const { prisma } = await import('@/lib/prisma')
      let callCount = 0
      
      vi.mocked(prisma.investment.findMany).mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.reject(new Error('Network timeout'))
        }
        return Promise.resolve([])
      })
      
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.dashboardData).toBeDefined()
      
      // Should eventually succeed or provide fallback
      expect(Array.isArray(result.investments)).toBe(true)
    })

    it('should handle DNS resolution failures', async () => {
      const preparator = new SIPsDataPreparator()
      
      // Mock DNS-like failures
      const { prisma } = await import('@/lib/prisma')
      const dnsError = new Error('getaddrinfo ENOTFOUND')
      dnsError.name = 'DNSError'
      
      vi.mocked(prisma.sIP.findMany).mockRejectedValue(dnsError)
      vi.mocked(prisma.priceCache.findMany).mockRejectedValue(dnsError)

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(Array.isArray(result.sipsWithValues)).toBe(true)
      expect(result.summary).toBeDefined()
      
      // Should provide empty but valid structure
      expect(result.sipsWithValues).toHaveLength(0)
    })
  })

  describe('Graceful Degradation', () => {
    it('should provide reduced functionality when core services fail', async () => {
      const preparator = new DashboardDataPreparator()
      
      // Mock core service failures but keep basic data
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.sIP.findMany).mockRejectedValue(new Error('SIP service down'))
      vi.mocked(prisma.account.findMany).mockRejectedValue(new Error('Account service down'))
      vi.mocked(prisma.transaction.findMany).mockRejectedValue(new Error('Transaction service down'))

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.summary).toBeDefined()
      
      // Should still provide basic summary even with partial failures
      expect(typeof result.summary.totalValue).toBe('number')
      expect(Array.isArray(result.recentTransactions)).toBe(true)
      expect(Array.isArray(result.goalProgress)).toBe(true)
      
      // Degraded data should be empty but valid
      expect(result.recentTransactions).toHaveLength(0)
      expect(result.goalProgress).toHaveLength(0)
    })

    it('should maintain data consistency during partial failures', async () => {
      const preparator = new InvestmentsDataPreparator()
      
      // Mock scenario where investments load but prices fail
      const { prisma } = await import('@/lib/prisma')
      const mockInvestments = [
        {
          id: '1',
          name: 'Test Stock',
          type: 'STOCK',
          symbol: 'TEST',
          units: 100,
          buyPrice: 50,
          currentPrice: null,
          accountId: 'acc1',
          goalId: 'goal1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      
      vi.mocked(prisma.investment.findMany).mockResolvedValue(mockInvestments)
      vi.mocked(prisma.priceCache.findMany).mockRejectedValue(new Error('Price service down'))

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.investmentsWithValues).toHaveLength(1)
      
      const investment = result.investmentsWithValues[0]
      
      // Should maintain data consistency
      expect(investment.totalInvested).toBe(investment.units * investment.buyPrice)
      expect(typeof investment.currentValue).toBe('number')
      expect(typeof investment.totalGains).toBe('number')
      expect(typeof investment.gainsPercentage).toBe('number')
      
      // Summary should be consistent with individual items
      expect(result.summary.count).toBe(1)
      expect(result.summary.totalInvested).toBe(investment.totalInvested)
    })
  })
})