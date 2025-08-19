import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { performance } from 'perf_hooks'

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

// Mock Prisma with realistic data
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
  fetchStockPrices: vi.fn().mockResolvedValue(new Map()),
}))

describe('Page Load Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup realistic mock data
    const { prisma } = require('@/lib/prisma')
    
    // Mock investments data
    const mockInvestments = Array.from({ length: 50 }, (_, i) => ({
      id: `inv${i}`,
      name: `Investment ${i}`,
      type: 'STOCK',
      symbol: `STOCK${i}`,
      units: 100 + i,
      buyPrice: 50 + i,
      currentPrice: 60 + i,
      accountId: `acc${i % 5}`,
      goalId: `goal${i % 10}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    
    // Mock goals data
    const mockGoals = Array.from({ length: 10 }, (_, i) => ({
      id: `goal${i}`,
      name: `Goal ${i}`,
      targetAmount: 100000 + (i * 50000),
      targetDate: new Date('2025-12-31'),
      priority: i % 2 === 0 ? 'HIGH' : 'MEDIUM',
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    
    // Mock SIPs data
    const mockSIPs = Array.from({ length: 20 }, (_, i) => ({
      id: `sip${i}`,
      name: `SIP ${i}`,
      amount: 5000 + (i * 1000),
      frequency: 'MONTHLY',
      startDate: new Date('2024-01-01'),
      status: 'ACTIVE',
      investmentId: `inv${i}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    
    // Mock accounts data
    const mockAccounts = Array.from({ length: 5 }, (_, i) => ({
      id: `acc${i}`,
      name: `Account ${i}`,
      type: 'DEMAT',
      provider: `Broker ${i}`,
      accountNumber: `12345${i}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    
    // Mock transactions data
    const mockTransactions = Array.from({ length: 100 }, (_, i) => ({
      id: `txn${i}`,
      type: 'BUY',
      amount: 5000 + (i * 100),
      units: 10 + i,
      price: 50 + i,
      date: new Date(),
      investmentId: `inv${i % 50}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    
    // Mock price cache data
    const mockPriceCache = Array.from({ length: 50 }, (_, i) => ({
      id: `price${i}`,
      symbol: `STOCK${i}`,
      price: 60 + i,
      timestamp: new Date(),
      source: 'GOOGLE',
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    
    // Setup mocks
    vi.mocked(prisma.investment.findMany).mockResolvedValue(mockInvestments)
    vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals)
    vi.mocked(prisma.sIP.findMany).mockResolvedValue(mockSIPs)
    vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts)
    vi.mocked(prisma.transaction.findMany).mockResolvedValue(mockTransactions)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue(mockPriceCache)
    
    // Setup detail mocks
    vi.mocked(prisma.investment.findUnique).mockResolvedValue(mockInvestments[0])
    vi.mocked(prisma.goal.findUnique).mockResolvedValue(mockGoals[0])
    vi.mocked(prisma.sIP.findUnique).mockResolvedValue(mockSIPs[0])
    vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccounts[0])
    
    // Setup count mocks
    vi.mocked(prisma.investment.count).mockResolvedValue(50)
    vi.mocked(prisma.goal.count).mockResolvedValue(10)
    vi.mocked(prisma.sIP.count).mockResolvedValue(20)
    vi.mocked(prisma.account.count).mockResolvedValue(5)
    vi.mocked(prisma.transaction.count).mockResolvedValue(100)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('List Page Performance', () => {
    it('should load dashboard page within 500ms', async () => {
      const preparator = new DashboardDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare()
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(500) // 500ms target
      
      console.log(`Dashboard load time: ${loadTime.toFixed(2)}ms`)
    })

    it('should load charts page within 1000ms', async () => {
      const preparator = new ChartsDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare()
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(1000) // 1s target for complex charts
      
      console.log(`Charts load time: ${loadTime.toFixed(2)}ms`)
    })

    it('should load investments page within 300ms', async () => {
      const preparator = new InvestmentsDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare()
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(300) // 300ms target
      
      console.log(`Investments load time: ${loadTime.toFixed(2)}ms`)
    })

    it('should load goals page within 300ms', async () => {
      const preparator = new GoalsDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare()
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(300) // 300ms target
      
      console.log(`Goals load time: ${loadTime.toFixed(2)}ms`)
    })

    it('should load SIPs page within 400ms', async () => {
      const preparator = new SIPsDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare()
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(400) // 400ms target
      
      console.log(`SIPs load time: ${loadTime.toFixed(2)}ms`)
    })

    it('should load accounts page within 200ms', async () => {
      const preparator = new AccountsDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare()
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(200) // 200ms target
      
      console.log(`Accounts load time: ${loadTime.toFixed(2)}ms`)
    })
  })

  describe('Detail Page Performance', () => {
    it('should load investment detail within 200ms', async () => {
      const preparator = new InvestmentDetailDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare('inv1')
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(200) // 200ms target
      
      console.log(`Investment detail load time: ${loadTime.toFixed(2)}ms`)
    })

    it('should load goal detail within 200ms', async () => {
      const preparator = new GoalDetailDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare('goal1')
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(200) // 200ms target
      
      console.log(`Goal detail load time: ${loadTime.toFixed(2)}ms`)
    })

    it('should load SIP detail within 200ms', async () => {
      const preparator = new SIPDetailDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare('sip1')
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(200) // 200ms target
      
      console.log(`SIP detail load time: ${loadTime.toFixed(2)}ms`)
    })

    it('should load account detail within 150ms', async () => {
      const preparator = new AccountDetailDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare('acc1')
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(loadTime).toBeLessThan(150) // 150ms target
      
      console.log(`Account detail load time: ${loadTime.toFixed(2)}ms`)
    })
  })

  describe('Concurrent Load Performance', () => {
    it('should handle multiple concurrent page loads efficiently', async () => {
      const preparators = [
        new DashboardDataPreparator(),
        new InvestmentsDataPreparator(),
        new GoalsDataPreparator(),
        new SIPsDataPreparator(),
        new AccountsDataPreparator(),
      ]
      
      const startTime = performance.now()
      
      const results = await Promise.all(
        preparators.map(preparator => preparator.prepare())
      )
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      expect(results).toHaveLength(5)
      results.forEach(result => expect(result).toBeDefined())
      
      // Should complete all within 2 seconds when run concurrently
      expect(totalTime).toBeLessThan(2000)
      
      console.log(`Concurrent load time for 5 pages: ${totalTime.toFixed(2)}ms`)
    })

    it('should handle multiple detail page loads efficiently', async () => {
      const preparators = [
        new InvestmentDetailDataPreparator(),
        new GoalDetailDataPreparator(),
        new SIPDetailDataPreparator(),
        new AccountDetailDataPreparator(),
      ]
      
      const startTime = performance.now()
      
      const results = await Promise.all([
        preparators[0].prepare('inv1'),
        preparators[1].prepare('goal1'),
        preparators[2].prepare('sip1'),
        preparators[3].prepare('acc1'),
      ])
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      expect(results).toHaveLength(4)
      results.forEach(result => expect(result).toBeDefined())
      
      // Should complete all within 1 second when run concurrently
      expect(totalTime).toBeLessThan(1000)
      
      console.log(`Concurrent detail load time for 4 pages: ${totalTime.toFixed(2)}ms`)
    })
  })

  describe('Cache Performance', () => {
    it('should show significant improvement on cached requests', async () => {
      const preparator = new DashboardDataPreparator()
      
      // First request (cold)
      const startTime1 = performance.now()
      const result1 = await preparator.prepare()
      const endTime1 = performance.now()
      const coldTime = endTime1 - startTime1
      
      // Second request (should use cache)
      const startTime2 = performance.now()
      const result2 = await preparator.prepare()
      const endTime2 = performance.now()
      const cachedTime = endTime2 - startTime2
      
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      
      // Cached request should be at least 50% faster
      expect(cachedTime).toBeLessThan(coldTime * 0.5)
      
      console.log(`Cold load: ${coldTime.toFixed(2)}ms, Cached load: ${cachedTime.toFixed(2)}ms`)
      console.log(`Cache improvement: ${((coldTime - cachedTime) / coldTime * 100).toFixed(1)}%`)
    })

    it('should maintain cache performance across different preparators', async () => {
      const preparators = [
        new InvestmentsDataPreparator(),
        new GoalsDataPreparator(),
        new SIPsDataPreparator(),
      ]
      
      // First round (cold)
      const startTime1 = performance.now()
      await Promise.all(preparators.map(p => p.prepare()))
      const endTime1 = performance.now()
      const coldTime = endTime1 - startTime1
      
      // Second round (cached)
      const startTime2 = performance.now()
      await Promise.all(preparators.map(p => p.prepare()))
      const endTime2 = performance.now()
      const cachedTime = endTime2 - startTime2
      
      // Cached requests should be significantly faster
      expect(cachedTime).toBeLessThan(coldTime * 0.3)
      
      console.log(`Cold concurrent: ${coldTime.toFixed(2)}ms, Cached concurrent: ${cachedTime.toFixed(2)}ms`)
    })
  })

  describe('Memory Performance', () => {
    it('should not cause memory leaks during repeated operations', async () => {
      const preparator = new DashboardDataPreparator()
      
      const initialMemory = process.memoryUsage().heapUsed
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await preparator.prepare()
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
      
      console.log(`Memory increase after 10 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should handle large datasets efficiently', async () => {
      // Mock larger dataset
      const { prisma } = require('@/lib/prisma')
      const largeInvestments = Array.from({ length: 500 }, (_, i) => ({
        id: `inv${i}`,
        name: `Investment ${i}`,
        type: 'STOCK',
        symbol: `STOCK${i}`,
        units: 100 + i,
        buyPrice: 50 + i,
        currentPrice: 60 + i,
        accountId: `acc${i % 5}`,
        goalId: `goal${i % 10}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      
      vi.mocked(prisma.investment.findMany).mockResolvedValue(largeInvestments)
      
      const preparator = new InvestmentsDataPreparator()
      
      const startTime = performance.now()
      const result = await preparator.prepare()
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(result.investmentsWithValues).toHaveLength(500)
      
      // Should still complete within reasonable time even with 500 investments
      expect(loadTime).toBeLessThan(1000)
      
      console.log(`Large dataset (500 investments) load time: ${loadTime.toFixed(2)}ms`)
    })
  })

  describe('Error Scenario Performance', () => {
    it('should handle database errors quickly with fallback', async () => {
      const preparator = new DashboardDataPreparator()
      
      // Mock database error
      const { prisma } = require('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockRejectedValue(new Error('Database error'))
      
      const startTime = performance.now()
      const result = await preparator.prepare()
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      // Error handling should be fast
      expect(loadTime).toBeLessThan(100)
      
      console.log(`Error fallback time: ${loadTime.toFixed(2)}ms`)
    })

    it('should handle partial failures efficiently', async () => {
      const preparator = new ChartsDataPreparator()
      
      // Mock partial failure
      const { prisma } = require('@/lib/prisma')
      vi.mocked(prisma.priceCache.findMany).mockRejectedValue(new Error('Price service down'))
      
      const startTime = performance.now()
      const result = await preparator.prepare()
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      expect(result).toBeDefined()
      // Should still complete reasonably fast even with partial failures
      expect(loadTime).toBeLessThan(800)
      
      console.log(`Partial failure handling time: ${loadTime.toFixed(2)}ms`)
    })
  })
})