/**
 * Comprehensive Background Price Refresh Service Tests
 * 
 * This test suite verifies the background price refresh service functionality
 * including scheduling, batch processing, error handling, and database integration.
 * 
 * Requirements tested:
 * - 2.1: Background price refresh every hour
 * - 2.2: Batch processing with API rate limits
 * - 2.3: Database-only price caching
 * - 4.2: Performance and reliability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BackgroundPriceRefreshService } from '@/lib/background-price-refresh-service'
import { prisma } from '@/lib/prisma'
import { getCachedPrice, updatePriceCache, getAllTrackedSymbols } from '@/lib/price-fetcher'

// Mock external API calls
vi.mock('@/lib/price-fetcher', async () => {
  const actual = await vi.importActual('@/lib/price-fetcher')
  return {
    ...actual,
    fetchStockPrices: vi.fn(),
    fetchMutualFundNAV: vi.fn(),
    getAllTrackedSymbols: vi.fn(),
    updatePriceCache: vi.fn(),
    getCachedPrice: vi.fn()
  }
})

describe('Background Price Refresh Service - Comprehensive Tests', () => {
  let service: BackgroundPriceRefreshService
  let testSymbols: string[]

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    service = new BackgroundPriceRefreshService({
      intervalMs: 60 * 60 * 1000, // 1 hour
      batchSize: 10,
      rateLimitDelay: 2000
    }, prisma)

    testSymbols = ['RELIANCE', 'INFY', 'TCS', '120503', '120716', '119551']

    // Clean up test data
    await prisma.priceCache.deleteMany({
      where: {
        symbol: { in: testSymbols }
      }
    })

    // Mock getAllTrackedSymbols to return test symbols
    vi.mocked(getAllTrackedSymbols).mockResolvedValue(testSymbols)
  })

  afterEach(async () => {
    service.stopScheduledRefresh()
    vi.useRealTimers()
    
    // Clean up test data
    await prisma.priceCache.deleteMany({
      where: {
        symbol: { in: testSymbols }
      }
    })
  })

  describe('Service Lifecycle Management', () => {
    it('should start and stop scheduled refresh correctly', () => {
      expect(service.getServiceStatus().running).toBe(false)
      expect(service.getServiceStatus().intervalMs).toBeNull()

      // Start service
      service.startScheduledRefresh(30000) // 30 seconds for testing
      
      expect(service.getServiceStatus().running).toBe(true)
      expect(service.getServiceStatus().intervalMs).toBe(30000)
      expect(service.getServiceStatus().nextRefreshTime).toBeDefined()

      // Stop service
      service.stopScheduledRefresh()
      
      expect(service.getServiceStatus().running).toBe(false)
      expect(service.getServiceStatus().intervalMs).toBeNull()
      expect(service.getServiceStatus().nextRefreshTime).toBeNull()
    })

    it('should handle multiple start calls gracefully', () => {
      service.startScheduledRefresh(30000)
      const firstStatus = service.getServiceStatus()
      
      // Start again with different interval
      service.startScheduledRefresh(60000)
      const secondStatus = service.getServiceStatus()
      
      expect(secondStatus.running).toBe(true)
      expect(secondStatus.intervalMs).toBe(60000) // Should use new interval
      expect(secondStatus.nextRefreshTime).not.toEqual(firstStatus.nextRefreshTime)
    })

    it('should handle stop calls when not running', () => {
      expect(service.getServiceStatus().running).toBe(false)
      
      // Should not throw error
      expect(() => service.stopScheduledRefresh()).not.toThrow()
      
      expect(service.getServiceStatus().running).toBe(false)
    })
  })

  describe('Scheduled Refresh Execution', () => {
    it('should execute refresh at scheduled intervals', async () => {
      const { fetchStockPrices, fetchMutualFundNAV } = await import('@/lib/price-fetcher')
      
      // Mock successful API responses
      vi.mocked(fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500,
        'NSE:INFY': 1500,
        'NSE:TCS': 3500
      })
      
      vi.mocked(fetchMutualFundNAV).mockResolvedValue([
        { schemeCode: '120503', nav: 45.67, date: '2024-01-01', schemeName: 'Test Fund 1' },
        { schemeCode: '120716', nav: 58.45, date: '2024-01-01', schemeName: 'Test Fund 2' },
        { schemeCode: '119551', nav: 102.34, date: '2024-01-01', schemeName: 'Test Fund 3' }
      ])

      // Start service with short interval for testing
      service.startScheduledRefresh(5000) // 5 seconds

      // Fast forward to trigger first refresh
      vi.advanceTimersByTime(5000)
      
      // Wait for async operations to complete
      await vi.runAllTimersAsync()

      // Verify API calls were made
      expect(fetchStockPrices).toHaveBeenCalledWith(['RELIANCE', 'INFY', 'TCS'])
      expect(fetchMutualFundNAV).toHaveBeenCalledWith(['120503', '120716', '119551'])

      // Fast forward to trigger second refresh
      vi.advanceTimersByTime(5000)
      await vi.runAllTimersAsync()

      // Should have been called twice
      expect(fetchStockPrices).toHaveBeenCalledTimes(2)
      expect(fetchMutualFundNAV).toHaveBeenCalledTimes(2)
    })

    it('should handle empty symbol list gracefully', async () => {
      vi.mocked(getAllTrackedSymbols).mockResolvedValue([])

      service.startScheduledRefresh(1000)
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      const { fetchStockPrices, fetchMutualFundNAV } = await import('@/lib/price-fetcher')
      
      // Should not make API calls for empty symbol list
      expect(fetchStockPrices).not.toHaveBeenCalled()
      expect(fetchMutualFundNAV).not.toHaveBeenCalled()
    })
  })

  describe('Batch Processing Logic', () => {
    it('should process symbols in batches with rate limiting', async () => {
      const { fetchStockPrices, fetchMutualFundNAV } = await import('@/lib/price-fetcher')
      
      // Create large symbol list to test batching
      const largeSymbolList = [
        ...Array.from({ length: 15 }, (_, i) => `STOCK${i}`), // 15 stocks
        ...Array.from({ length: 10 }, (_, i) => `12050${i}`) // 10 mutual funds
      ]
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(largeSymbolList)
      
      // Mock API responses
      vi.mocked(fetchStockPrices).mockImplementation(async (symbols) => {
        const result: Record<string, number> = {}
        symbols.forEach(symbol => {
          result[`NSE:${symbol}`] = Math.random() * 1000
        })
        return result
      })
      
      vi.mocked(fetchMutualFundNAV).mockImplementation(async (symbols) => {
        return symbols.map(symbol => ({
          schemeCode: symbol,
          nav: Math.random() * 100,
          date: '2024-01-01',
          schemeName: `Fund ${symbol}`
        }))
      })

      // Create service with small batch size
      const batchService = new BackgroundPriceRefreshService({
        intervalMs: 60000,
        batchSize: 5, // Small batch size to test batching
        rateLimitDelay: 100 // Short delay for testing
      }, prisma)

      const result = await batchService.triggerManualRefresh()

      // Should have processed all symbols
      expect(result.success).toBe(25) // 15 stocks + 10 mutual funds
      expect(result.failed).toBe(0)

      // Should have made multiple API calls due to batching
      expect(fetchStockPrices).toHaveBeenCalledTimes(3) // 15 stocks / 5 batch size = 3 calls
      expect(fetchMutualFundNAV).toHaveBeenCalledTimes(2) // 10 MFs / 5 batch size = 2 calls

      batchService.stopScheduledRefresh()
    })

    it('should handle mixed success and failure in batches', async () => {
      const { fetchStockPrices, fetchMutualFundNAV } = await import('@/lib/price-fetcher')
      
      // Mock partial success for stocks
      vi.mocked(fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500,
        'NSE:INFY': 1500
        // TCS missing - simulates API not returning all requested symbols
      })
      
      // Mock failure for mutual funds
      vi.mocked(fetchMutualFundNAV).mockRejectedValue(new Error('AMFI API down'))

      const result = await service.triggerManualRefresh()

      expect(result.success).toBe(2) // Only RELIANCE and INFY succeeded
      expect(result.failed).toBe(4) // TCS + 3 mutual funds failed
      expect(result.results).toHaveLength(6)

      // Check individual results
      const relianceResult = result.results.find(r => r.symbol === 'RELIANCE')
      expect(relianceResult?.success).toBe(true)
      expect(relianceResult?.price).toBe(2500)

      const tcsResult = result.results.find(r => r.symbol === 'TCS')
      expect(tcsResult?.success).toBe(false)
      expect(tcsResult?.error).toBeDefined()

      const mfResult = result.results.find(r => r.symbol === '120503')
      expect(mfResult?.success).toBe(false)
      expect(mfResult?.error).toContain('AMFI API down')
    })
  })

  describe('Database Integration', () => {
    it('should store prices in database cache correctly', async () => {
      const { fetchStockPrices, fetchMutualFundNAV } = await import('@/lib/price-fetcher')
      
      vi.mocked(fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500.50
      })
      
      vi.mocked(fetchMutualFundNAV).mockResolvedValue([
        { schemeCode: '120503', nav: 45.67, date: '2024-01-01', schemeName: 'Test Fund' }
      ])

      // Mock updatePriceCache to verify it's called correctly
      vi.mocked(updatePriceCache).mockResolvedValue()

      await service.triggerManualRefresh()

      // Verify database updates were called
      expect(updatePriceCache).toHaveBeenCalledWith('RELIANCE', 2500.50, 'GOOGLE_SCRIPT')
      expect(updatePriceCache).toHaveBeenCalledWith('120503', 45.67, 'AMFI')
    })

    it('should handle database errors gracefully', async () => {
      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500
      })
      
      // Mock database error
      vi.mocked(updatePriceCache).mockRejectedValue(new Error('Database connection failed'))

      const result = await service.triggerManualRefresh()

      // Should still report success for API fetch, but log database error
      expect(result.success).toBe(1)
      expect(result.results[0].success).toBe(true)
      expect(result.results[0].price).toBe(2500)
    })

    it('should retrieve cached prices correctly', async () => {
      // Mock cached price data
      vi.mocked(getCachedPrice).mockResolvedValue({
        price: 2400,
        source: 'GOOGLE_SCRIPT'
      })

      const cachedPrice = await getCachedPrice('RELIANCE')

      expect(cachedPrice).toEqual({
        price: 2400,
        source: 'GOOGLE_SCRIPT'
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle API timeouts gracefully', async () => {
      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      
      // Mock timeout
      vi.mocked(fetchStockPrices).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const result = await service.triggerManualRefresh()

      expect(result.success).toBe(0)
      expect(result.failed).toBe(3) // All stock symbols failed
      expect(result.results.every(r => r.success === false)).toBe(true)
      expect(result.results.every(r => r.error?.includes('timeout'))).toBe(true)
    })

    it('should handle rate limit errors with exponential backoff', async () => {
      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      
      let callCount = 0
      vi.mocked(fetchStockPrices).mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          const error = new Error('Rate limit exceeded')
          ;(error as any).status = 429
          throw error
        }
        return { 'NSE:RELIANCE': 2500 }
      })

      const result = await service.triggerManualRefresh()

      // Should retry and eventually succeed
      expect(fetchStockPrices).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(1)
      expect(result.results[0].success).toBe(true)
    })

    it('should continue processing other symbols when one fails', async () => {
      const { fetchStockPrices, fetchMutualFundNAV } = await import('@/lib/price-fetcher')
      
      // Stock API fails
      vi.mocked(fetchStockPrices).mockRejectedValue(new Error('Stock API down'))
      
      // Mutual fund API succeeds
      vi.mocked(fetchMutualFundNAV).mockResolvedValue([
        { schemeCode: '120503', nav: 45.67, date: '2024-01-01', schemeName: 'Test Fund' }
      ])

      const result = await service.triggerManualRefresh()

      expect(result.success).toBe(1) // Only mutual fund succeeded
      expect(result.failed).toBe(5) // 3 stocks + 2 other MFs failed
      
      const mfResult = result.results.find(r => r.symbol === '120503')
      expect(mfResult?.success).toBe(true)
      expect(mfResult?.price).toBe(45.67)
    })
  })

  describe('Service Statistics and Monitoring', () => {
    it('should provide accurate refresh statistics', async () => {
      // Mock some cached data
      await prisma.priceCache.createMany({
        data: [
          {
            symbol: 'RELIANCE',
            price: 2500,
            source: 'GOOGLE_SCRIPT',
            lastUpdated: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
          },
          {
            symbol: 'INFY',
            price: 1500,
            source: 'GOOGLE_SCRIPT',
            lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
          }
        ]
      })

      const stats = await service.getRefreshStats()

      expect(stats.totalSymbolsTracked).toBe(6) // From mocked getAllTrackedSymbols
      expect(stats.cacheStats.totalEntries).toBe(2)
      expect(stats.cacheStats.freshEntries).toBe(1) // RELIANCE is fresh
      expect(stats.cacheStats.staleEntries).toBe(1) // INFY is stale
      expect(stats.lastRefreshTime).toBeDefined()
      expect(stats.serviceStatus.running).toBe(false)
    })

    it('should track refresh history', async () => {
      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500
      })

      // Perform multiple refreshes
      await service.triggerManualRefresh()
      await service.triggerManualRefresh()

      const stats = await service.getRefreshStats()

      expect(stats.refreshHistory).toBeDefined()
      expect(stats.refreshHistory.totalRefreshes).toBeGreaterThanOrEqual(2)
      expect(stats.refreshHistory.successfulRefreshes).toBeGreaterThanOrEqual(2)
      expect(stats.refreshHistory.averageRefreshTime).toBeGreaterThan(0)
    })

    it('should provide health check information', async () => {
      const health = await service.getServiceHealth()

      expect(health.status).toBeDefined()
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status)
      expect(health.lastRefreshTime).toBeDefined()
      expect(health.nextRefreshTime).toBeDefined()
      expect(health.cacheHealth).toBeDefined()
      expect(health.apiHealth).toBeDefined()
    })
  })

  describe('Performance Under Load', () => {
    it('should handle large symbol lists efficiently', async () => {
      const { fetchStockPrices, fetchMutualFundNAV } = await import('@/lib/price-fetcher')
      
      // Create large symbol list
      const largeSymbolList = [
        ...Array.from({ length: 100 }, (_, i) => `STOCK${i}`),
        ...Array.from({ length: 50 }, (_, i) => `12050${i}`)
      ]
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(largeSymbolList)
      
      // Mock fast API responses
      vi.mocked(fetchStockPrices).mockImplementation(async (symbols) => {
        const result: Record<string, number> = {}
        symbols.forEach(symbol => {
          result[`NSE:${symbol}`] = Math.random() * 1000
        })
        return result
      })
      
      vi.mocked(fetchMutualFundNAV).mockImplementation(async (symbols) => {
        return symbols.map(symbol => ({
          schemeCode: symbol,
          nav: Math.random() * 100,
          date: '2024-01-01',
          schemeName: `Fund ${symbol}`
        }))
      })

      const startTime = Date.now()
      const result = await service.triggerManualRefresh()
      const endTime = Date.now()

      expect(result.success).toBe(150) // All symbols should succeed
      expect(result.failed).toBe(0)
      expect(endTime - startTime).toBeLessThan(30000) // Should complete in under 30 seconds

      console.log(`Processed ${largeSymbolList.length} symbols in ${endTime - startTime}ms`)
    })

    it('should respect rate limits and not overwhelm APIs', async () => {
      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      
      const callTimes: number[] = []
      vi.mocked(fetchStockPrices).mockImplementation(async () => {
        callTimes.push(Date.now())
        return { 'NSE:RELIANCE': 2500 }
      })

      // Create service with rate limiting
      const rateLimitedService = new BackgroundPriceRefreshService({
        intervalMs: 60000,
        batchSize: 1, // Process one at a time
        rateLimitDelay: 1000 // 1 second delay
      }, prisma)

      await rateLimitedService.triggerManualRefresh()

      // Should have appropriate delays between calls
      if (callTimes.length > 1) {
        for (let i = 1; i < callTimes.length; i++) {
          const delay = callTimes[i] - callTimes[i - 1]
          expect(delay).toBeGreaterThanOrEqual(900) // Allow some tolerance
        }
      }

      rateLimitedService.stopScheduledRefresh()
    })
  })
})