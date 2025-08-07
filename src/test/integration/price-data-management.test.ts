import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  getPriceWithFallback,
  getMutualFundNAVWithFallback,
  savePriceHistory,
  getPriceHistory,
  getPriceTrend,
  refreshAllPrices,
  manualPriceRefresh,
  startPriceRefreshScheduler,
  stopPriceRefreshScheduler,
  getRefreshSchedulerStatus,
  cleanupPriceHistory,
  getEnhancedCacheStats,
  clearAllCaches
} from '@/lib/price-fetcher'

const prisma = new PrismaClient()

// Mock external API calls
vi.mock('@/lib/price-fetcher', async () => {
  const actual = await vi.importActual('@/lib/price-fetcher')
  return {
    ...actual,
    fetchStockPrices: vi.fn().mockImplementation(async (symbols: string[]) => {
      // Mock successful response for test symbols
      const mockPrices: { [key: string]: number } = {}
      symbols.forEach(symbol => {
        const cleanSymbol = symbol.replace('NSE:', '')
        if (cleanSymbol === 'RELIANCE') {
          mockPrices[symbol] = 2500.50
        } else if (cleanSymbol === 'INFY') {
          mockPrices[symbol] = 1800.25
        } else if (cleanSymbol === 'FAIL_SYMBOL') {
          // This symbol will not be included in response to simulate failure
        } else {
          mockPrices[symbol] = 1000 + Math.random() * 1000
        }
      })
      return mockPrices
    }),
    fetchMutualFundNAV: vi.fn().mockImplementation(async (schemeCodes?: string[]) => {
      const mockNavData = [
        { schemeCode: '123456', nav: 150.75, date: '2024-01-26', schemeName: 'Test Mutual Fund 1' },
        { schemeCode: '789012', nav: 89.25, date: '2024-01-26', schemeName: 'Test Mutual Fund 2' }
      ]
      
      if (schemeCodes) {
        return mockNavData.filter(item => schemeCodes.includes(item.schemeCode))
      }
      
      return mockNavData
    })
  }
})

describe('Enhanced Price Data Management', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.priceHistory.deleteMany()
    await prisma.priceCache.deleteMany()
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.priceHistory.deleteMany()
    await prisma.priceCache.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Stop any running scheduler
    stopPriceRefreshScheduler()
  })

  afterEach(async () => {
    // Clean up after each test
    await prisma.priceHistory.deleteMany()
    await prisma.priceCache.deleteMany()
    stopPriceRefreshScheduler()
  })

  describe('Price History Tracking', () => {
    it('should save price history correctly', async () => {
      await savePriceHistory('RELIANCE', 2500.50, 'GOOGLE_SCRIPT')
      
      const history = await getPriceHistory('RELIANCE')
      expect(history).toHaveLength(1)
      expect(history[0].price).toBe(2500.50)
      expect(history[0].source).toBe('GOOGLE_SCRIPT')
    })

    it('should retrieve price history with date range', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      // Create test data
      await prisma.priceHistory.createMany({
        data: [
          { symbol: 'RELIANCE', price: 2400, source: 'TEST', timestamp: twoDaysAgo },
          { symbol: 'RELIANCE', price: 2450, source: 'TEST', timestamp: yesterday },
          { symbol: 'RELIANCE', price: 2500, source: 'TEST', timestamp: now }
        ]
      })

      const history = await getPriceHistory('RELIANCE', yesterday, now)
      expect(history).toHaveLength(2)
      expect(history[0].price).toBe(2500) // Most recent first
      expect(history[1].price).toBe(2450)
    })

    it('should calculate price trend correctly', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Create test data showing upward trend
      await prisma.priceHistory.createMany({
        data: [
          { symbol: 'RELIANCE', price: 2400, source: 'TEST', timestamp: yesterday },
          { symbol: 'RELIANCE', price: 2500, source: 'TEST', timestamp: now }
        ]
      })

      const trend = await getPriceTrend('RELIANCE', 7)
      expect(trend.currentPrice).toBe(2500)
      expect(trend.previousPrice).toBe(2400)
      expect(trend.change).toBe(100)
      expect(trend.changePercent).toBeCloseTo(4.17, 1)
      expect(trend.trend).toBe('up')
      expect(trend.dataPoints).toBe(2)
    })

    it('should handle empty price history gracefully', async () => {
      const trend = await getPriceTrend('NONEXISTENT', 7)
      expect(trend.currentPrice).toBeNull()
      expect(trend.previousPrice).toBeNull()
      expect(trend.change).toBeNull()
      expect(trend.changePercent).toBeNull()
      expect(trend.trend).toBe('unknown')
      expect(trend.dataPoints).toBe(0)
    })
  })

  describe('Enhanced Price Fetching with Fallback', () => {
    it('should fetch fresh price and save to history', async () => {
      const result = await getPriceWithFallback('RELIANCE')
      
      expect(result.price).toBe(2500.50)
      expect(result.source).toBe('GOOGLE_SCRIPT')
      expect(result.cached).toBe(false)
      expect(result.fallbackUsed).toBe(false)

      // Check that price was saved to history
      const history = await getPriceHistory('RELIANCE')
      expect(history).toHaveLength(1)
      expect(history[0].price).toBe(2500.50)
    })

    it('should use cached price when available', async () => {
      // First call to populate cache
      await getPriceWithFallback('RELIANCE')
      
      // Second call should use cache
      const result = await getPriceWithFallback('RELIANCE')
      expect(result.cached).toBe(true)
      expect(result.fallbackUsed).toBe(false)
    })

    it('should use stale cache as fallback when fresh fetch fails', async () => {
      // First, populate cache with good data
      await getPriceWithFallback('RELIANCE')
      
      // Mock API failure for subsequent calls
      const mockFetchStockPrices = vi.mocked(
        await import('@/lib/price-fetcher')
      ).fetchStockPrices
      mockFetchStockPrices.mockRejectedValueOnce(new Error('API failure'))
      
      const result = await getPriceWithFallback('FAIL_SYMBOL', true)
      expect(result.fallbackUsed).toBe(true)
      expect(result.source).toContain('STALE')
    })

    it('should use price history as fallback when cache is unavailable', async () => {
      // Create old history data
      await savePriceHistory('RELIANCE', 2400, 'HISTORICAL')
      
      // Mock API failure
      const mockFetchStockPrices = vi.mocked(
        await import('@/lib/price-fetcher')
      ).fetchStockPrices
      mockFetchStockPrices.mockRejectedValueOnce(new Error('API failure'))
      
      const result = await getPriceWithFallback('RELIANCE', true)
      expect(result.fallbackUsed).toBe(true)
      expect(result.source).toContain('HISTORY')
    })
  })

  describe('Enhanced Mutual Fund NAV Fetching', () => {
    it('should fetch fresh NAV and save to history', async () => {
      const result = await getMutualFundNAVWithFallback('123456')
      
      expect(result.nav).toBe(150.75)
      expect(result.source).toBe('AMFI')
      expect(result.cached).toBe(false)
      expect(result.fallbackUsed).toBe(false)

      // Check that NAV was saved to history
      const history = await getPriceHistory('123456')
      expect(history).toHaveLength(1)
      expect(history[0].price).toBe(150.75)
    })

    it('should use fallback mechanisms for mutual funds', async () => {
      // First, populate cache
      await getMutualFundNAVWithFallback('123456')
      
      // Mock API failure
      const mockFetchMutualFundNAV = vi.mocked(
        await import('@/lib/price-fetcher')
      ).fetchMutualFundNAV
      mockFetchMutualFundNAV.mockRejectedValueOnce(new Error('AMFI API failure'))
      
      const result = await getMutualFundNAVWithFallback('123456', true)
      expect(result.fallbackUsed).toBe(true)
    })
  })

  describe('Manual Price Refresh', () => {
    it('should refresh prices for specified symbols', async () => {
      const symbols = ['RELIANCE', 'INFY']
      const result = await manualPriceRefresh(symbols)
      
      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
      
      result.results.forEach(r => {
        expect(r.success).toBe(true)
        expect(r.price).toBeGreaterThan(0)
      })
    })

    it('should handle mixed success and failure in manual refresh', async () => {
      const symbols = ['RELIANCE', 'FAIL_SYMBOL']
      
      // Mock partial failure
      const mockFetchStockPrices = vi.mocked(
        await import('@/lib/price-fetcher')
      ).fetchStockPrices
      mockFetchStockPrices.mockImplementationOnce(async (symbols: string[]) => {
        return { 'NSE:RELIANCE': 2500.50 } // Only return price for RELIANCE
      })
      
      const result = await manualPriceRefresh(symbols)
      
      expect(result.success).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.results).toHaveLength(2)
      
      const successResult = result.results.find(r => r.symbol === 'RELIANCE')
      const failResult = result.results.find(r => r.symbol === 'FAIL_SYMBOL')
      
      expect(successResult?.success).toBe(true)
      expect(failResult?.success).toBe(false)
      expect(failResult?.error).toBeDefined()
    })

    it('should handle mutual fund scheme codes in manual refresh', async () => {
      const symbols = ['123456'] // Numeric symbol indicates mutual fund
      const result = await manualPriceRefresh(symbols)
      
      expect(result.success).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.results[0].price).toBe(150.75)
    })
  })

  describe('Automatic Price Refresh Scheduler', () => {
    it('should start and stop scheduler correctly', async () => {
      expect(getRefreshSchedulerStatus().running).toBe(false)
      
      startPriceRefreshScheduler(1000) // 1 second for testing
      expect(getRefreshSchedulerStatus().running).toBe(true)
      
      stopPriceRefreshScheduler()
      expect(getRefreshSchedulerStatus().running).toBe(false)
    })

    it('should not start multiple schedulers', async () => {
      startPriceRefreshScheduler(1000)
      const consoleSpy = vi.spyOn(console, 'log')
      
      startPriceRefreshScheduler(1000) // Try to start again
      expect(consoleSpy).toHaveBeenCalledWith('Price refresh scheduler already running')
      
      stopPriceRefreshScheduler()
      consoleSpy.mockRestore()
    })

    it('should run scheduled refresh', async () => {
      // Add some test data to cache so scheduler has something to refresh
      await savePriceHistory('RELIANCE', 2400, 'TEST')
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2400,
          source: 'TEST'
        }
      })

      startPriceRefreshScheduler(100) // Very short interval for testing
      
      // Wait for at least one refresh cycle
      await new Promise(resolve => setTimeout(resolve, 200))
      
      stopPriceRefreshScheduler()
      
      // Check that refresh was attempted (history should have new entries)
      const history = await getPriceHistory('RELIANCE')
      expect(history.length).toBeGreaterThan(1)
    }, 10000) // Increase timeout for this test
  })

  describe('Price History Cleanup', () => {
    it('should clean up old price history data', async () => {
      const now = new Date()
      const oldDate = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000) // 400 days ago
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago

      // Create test data
      await prisma.priceHistory.createMany({
        data: [
          { symbol: 'RELIANCE', price: 2000, source: 'OLD', timestamp: oldDate },
          { symbol: 'RELIANCE', price: 2500, source: 'RECENT', timestamp: recentDate }
        ]
      })

      const deletedCount = await cleanupPriceHistory(365) // Keep 365 days
      expect(deletedCount).toBe(1) // Only the old record should be deleted

      const remainingHistory = await getPriceHistory('RELIANCE')
      expect(remainingHistory).toHaveLength(1)
      expect(remainingHistory[0].source).toBe('RECENT')
    })
  })

  describe('Enhanced Cache Statistics', () => {
    it('should provide comprehensive cache statistics', async () => {
      // Add test data
      await savePriceHistory('RELIANCE', 2500, 'TEST')
      await savePriceHistory('INFY', 1800, 'TEST')
      await prisma.priceCache.create({
        data: { symbol: 'RELIANCE', price: 2500, source: 'TEST' }
      })

      const stats = await getEnhancedCacheStats()
      
      expect(stats.databaseCache.count).toBe(1)
      expect(stats.priceHistory.count).toBe(2)
      expect(stats.priceHistory.uniqueSymbols).toBe(2)
      expect(stats.scheduler).toBeDefined()
      expect(typeof stats.scheduler.running).toBe('boolean')
    })
  })

  describe('Error Handling and Reliability', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalCreate = prisma.priceHistory.create
      prisma.priceHistory.create = vi.fn().mockRejectedValue(new Error('Database error'))

      // Should not throw error, just log it
      await expect(savePriceHistory('RELIANCE', 2500, 'TEST')).resolves.not.toThrow()

      // Restore original method
      prisma.priceHistory.create = originalCreate
    })

    it('should handle API timeout and retry', async () => {
      let callCount = 0
      const mockFetchStockPrices = vi.mocked(
        await import('@/lib/price-fetcher')
      ).fetchStockPrices
      
      mockFetchStockPrices.mockImplementation(async () => {
        callCount++
        if (callCount < 3) {
          throw new Error('Timeout')
        }
        return { 'NSE:RELIANCE': 2500.50 }
      })

      const result = await getPriceWithFallback('RELIANCE', true)
      expect(callCount).toBe(3) // Should retry 3 times
      expect(result.price).toBe(2500.50)
    })

    it('should handle malformed API responses', async () => {
      const mockFetchStockPrices = vi.mocked(
        await import('@/lib/price-fetcher')
      ).fetchStockPrices
      
      mockFetchStockPrices.mockResolvedValueOnce({}) // Empty response

      await expect(getPriceWithFallback('RELIANCE', true)).rejects.toThrow()
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle batch operations efficiently', async () => {
      const symbols = Array.from({ length: 50 }, (_, i) => `STOCK${i}`)
      
      const startTime = Date.now()
      const result = await manualPriceRefresh(symbols)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
      expect(result.results).toHaveLength(50)
    })

    it('should limit history query results', async () => {
      // Create many history records
      const historyData = Array.from({ length: 200 }, (_, i) => ({
        symbol: 'RELIANCE',
        price: 2000 + i,
        source: 'TEST',
        timestamp: new Date(Date.now() - i * 60 * 1000) // 1 minute apart
      }))

      await prisma.priceHistory.createMany({ data: historyData })

      const history = await getPriceHistory('RELIANCE', undefined, undefined, 50)
      expect(history).toHaveLength(50) // Should be limited to 50 results
    })
  })
})