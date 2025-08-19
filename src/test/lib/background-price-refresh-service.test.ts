import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { BackgroundPriceRefreshService } from '@/lib/background-price-refresh-service'
import * as priceFetcher from '@/lib/price-fetcher'

// Mock the price fetcher functions
vi.mock('@/lib/price-fetcher', async () => {
  const actual = await vi.importActual('@/lib/price-fetcher')
  return {
    ...actual,
    fetchUnifiedPrices: vi.fn(),
    updatePriceCache: vi.fn(),
    savePriceHistory: vi.fn(),
    getAllTrackedSymbols: vi.fn()
  }
})

const prisma = new PrismaClient()

describe('BackgroundPriceRefreshService', () => {
  let service: BackgroundPriceRefreshService

  beforeAll(async () => {
    // Clean up test data
    await prisma.priceCache.deleteMany()
    await prisma.priceHistory.deleteMany()
  })

  beforeEach(() => {
    service = new BackgroundPriceRefreshService()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Stop any running services
    service.stopScheduledRefresh()
    
    // Clean up test data
    await prisma.priceCache.deleteMany()
    await prisma.priceHistory.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Service Management', () => {
    it('should start and stop scheduled refresh', async () => {
      // Mock getAllTrackedSymbols to return empty array to avoid actual API calls
      vi.mocked(priceFetcher.getAllTrackedSymbols).mockResolvedValue([])

      const initialStatus = service.getServiceStatus()
      expect(initialStatus.running).toBe(false)

      await service.startScheduledRefresh(5000) // 5 seconds for testing

      const runningStatus = service.getServiceStatus()
      expect(runningStatus.running).toBe(true)
      expect(runningStatus.intervalMs).toBe(5000)

      service.stopScheduledRefresh()

      const stoppedStatus = service.getServiceStatus()
      expect(stoppedStatus.running).toBe(false)
    })

    it('should not start multiple instances', async () => {
      vi.mocked(priceFetcher.getAllTrackedSymbols).mockResolvedValue([])

      await service.startScheduledRefresh(5000)
      
      // Try to start again
      await service.startScheduledRefresh(3000)
      
      const status = service.getServiceStatus()
      expect(status.running).toBe(true)
      expect(status.intervalMs).toBe(5000) // Should keep original interval
    })

    it('should provide correct service status', () => {
      const status = service.getServiceStatus()
      
      expect(status).toHaveProperty('running')
      expect(status).toHaveProperty('isRefreshing')
      expect(status).toHaveProperty('intervalMs')
      expect(status).toHaveProperty('config')
      expect(status.config).toHaveProperty('batchSize')
      expect(status.config).toHaveProperty('rateLimitDelay')
      expect(status.config).toHaveProperty('maxRetries')
      expect(status.config).toHaveProperty('retryDelay')
    })
  })

  describe('Batch Processing', () => {
    it('should process stock symbols in batches', async () => {
      const stockSymbols = ['RELIANCE', 'INFY', 'TCS', 'HDFC', 'ICICIBANK']
      
      // Mock successful stock price fetch
      vi.mocked(priceFetcher.fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500,
        'NSE:INFY': 1500,
        'NSE:TCS': 3500,
        'NSE:HDFC': 1600,
        'NSE:ICICIBANK': 900
      })

      vi.mocked(priceFetcher.updatePriceCache).mockResolvedValue()
      vi.mocked(priceFetcher.savePriceHistory).mockResolvedValue()

      const result = await service.batchRefreshPrices(stockSymbols)

      expect(result.success).toBe(5)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(5)
      
      // Verify all symbols were processed
      const processedSymbols = result.results.map(r => r.symbol)
      expect(processedSymbols).toEqual(expect.arrayContaining(stockSymbols))
    })

    it('should process mutual fund symbols in batches', async () => {
      const mfSymbols = ['120503', '120504', '120505']
      
      // Mock successful unified price fetch
      vi.mocked(priceFetcher.fetchUnifiedPrices).mockResolvedValue({
        'MUTF_IN:120503': 45.67,
        'MUTF_IN:120504': 23.45,
        'MUTF_IN:120505': 67.89
      })

      vi.mocked(priceFetcher.updatePriceCache).mockResolvedValue()
      vi.mocked(priceFetcher.savePriceHistory).mockResolvedValue()

      const result = await service.batchRefreshPrices(mfSymbols)

      expect(result.success).toBe(3)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(3)
      
      // Verify all symbols were processed
      const processedSymbols = result.results.map(r => r.symbol)
      expect(processedSymbols).toEqual(expect.arrayContaining(mfSymbols))
    })

    it('should handle mixed stock and mutual fund symbols', async () => {
      const mixedSymbols = ['RELIANCE', '120503', 'INFY', '120504']
      
      // Mock stock prices
      vi.mocked(priceFetcher.fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500,
        'NSE:INFY': 1500
      })

      // Mock unified price fetching
      vi.mocked(priceFetcher.fetchUnifiedPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500,
        'NSE:INFY': 1500,
        'MUTF_IN:120503': 45.67,
        'MUTF_IN:120504': 23.45
      })

      vi.mocked(priceFetcher.updatePriceCache).mockResolvedValue()
      vi.mocked(priceFetcher.savePriceHistory).mockResolvedValue()

      const result = await service.batchRefreshPrices(mixedSymbols)

      expect(result.success).toBe(4)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(4)
    })

    it('should handle API failures gracefully', async () => {
      const symbols = ['RELIANCE', 'INFY']
      
      // Mock API failure
      vi.mocked(priceFetcher.fetchStockPrices).mockRejectedValue(new Error('API Error'))

      const result = await service.batchRefreshPrices(symbols)

      expect(result.success).toBe(0)
      expect(result.failed).toBe(2)
      expect(result.results).toHaveLength(2)
      
      result.results.forEach(r => {
        expect(r.success).toBe(false)
        expect(r.error).toContain('Batch fetch failed')
      })
    })

    it('should handle cache update failures', async () => {
      const symbols = ['RELIANCE']
      
      // Mock successful API call but failed cache update
      vi.mocked(priceFetcher.fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500
      })
      vi.mocked(priceFetcher.updatePriceCache).mockRejectedValue(new Error('Cache Error'))

      const result = await service.batchRefreshPrices(symbols)

      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.results[0].error).toContain('Cache update failed')
    })
  })

  describe('Manual Refresh', () => {
    it('should refresh specific symbols manually', async () => {
      const symbols = ['RELIANCE', '120503']
      
      vi.mocked(priceFetcher.fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500
      })
      vi.mocked(priceFetcher.fetchUnifiedPrices).mockResolvedValue({
        'NSE:RELIANCE': 2500,
        'MUTF_IN:120503': 45.67
      })
      vi.mocked(priceFetcher.updatePriceCache).mockResolvedValue()
      vi.mocked(priceFetcher.savePriceHistory).mockResolvedValue()

      const result = await service.refreshSpecificSymbols(symbols)

      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
    })
  })

  describe('Statistics and Health', () => {
    it('should provide refresh statistics', async () => {
      // Add some test data to database
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2500,
          source: 'GOOGLE_SCRIPT',
          lastUpdated: new Date()
        }
      })

      await prisma.priceHistory.create({
        data: {
          symbol: 'RELIANCE',
          price: 2500,
          source: 'GOOGLE_SCRIPT',
          timestamp: new Date()
        }
      })

      const stats = await service.getRefreshStatistics()

      expect(stats).toHaveProperty('totalCachedPrices')
      expect(stats).toHaveProperty('freshPrices')
      expect(stats).toHaveProperty('stalePrices')
      expect(stats).toHaveProperty('priceHistoryCount')
      expect(stats).toHaveProperty('uniqueSymbolsTracked')
      expect(stats.totalCachedPrices).toBeGreaterThan(0)
      expect(stats.priceHistoryCount).toBeGreaterThan(0)
    })

    it('should perform health check', async () => {
      const health = await service.healthCheck()

      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('running')
      expect(health).toHaveProperty('issues')
      expect(health.status).toMatch(/healthy|unhealthy/)
      expect(Array.isArray(health.issues)).toBe(true)
    })

    it('should report unhealthy when service is not running', async () => {
      const health = await service.healthCheck()

      expect(health.status).toBe('unhealthy')
      expect(health.running).toBe(false)
      expect(health.issues).toContain('Background refresh service is not running')
    })
  })

  describe('Error Handling', () => {
    it('should retry failed operations', async () => {
      const symbols = ['RELIANCE']
      
      // Mock first two calls to fail, third to succeed
      vi.mocked(priceFetcher.fetchStockPrices)
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce({ 'NSE:RELIANCE': 2500 })

      vi.mocked(priceFetcher.updatePriceCache).mockResolvedValue()
      vi.mocked(priceFetcher.savePriceHistory).mockResolvedValue()

      const result = await service.batchRefreshPrices(symbols)

      expect(result.success).toBe(1)
      expect(result.failed).toBe(0)
      expect(priceFetcher.fetchStockPrices).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const symbols = ['RELIANCE']
      
      // Mock all calls to fail
      vi.mocked(priceFetcher.fetchStockPrices).mockRejectedValue(new Error('Persistent failure'))

      const result = await service.batchRefreshPrices(symbols)

      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      expect(priceFetcher.fetchStockPrices).toHaveBeenCalledTimes(3) // maxRetries = 3
    })
  })

  describe('Rate Limiting', () => {
    it('should process symbols in configured batch sizes', async () => {
      const symbols = Array.from({ length: 25 }, (_, i) => `STOCK${i}`)
      
      // Mock successful responses
      const mockPrices: Record<string, number> = {}
      symbols.forEach((symbol, i) => {
        mockPrices[`NSE:${symbol}`] = 1000 + i
      })
      
      vi.mocked(priceFetcher.fetchStockPrices).mockResolvedValue(mockPrices)
      vi.mocked(priceFetcher.updatePriceCache).mockResolvedValue()
      vi.mocked(priceFetcher.savePriceHistory).mockResolvedValue()

      const startTime = Date.now()
      const result = await service.batchRefreshPrices(symbols)
      const endTime = Date.now()

      expect(result.success).toBe(25)
      expect(result.failed).toBe(0)
      
      // Should take some time due to rate limiting delays
      // With 25 symbols, batch size 10, we expect 3 batches with 2 delays of 2000ms each
      expect(endTime - startTime).toBeGreaterThan(3000) // At least 4 seconds
    })
  })
})