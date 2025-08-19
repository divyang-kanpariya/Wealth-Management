import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  fetchStockPrices,
  fetchMutualFundNAV,
  getPrice,
  getMutualFundNAV,
  getPriceWithFallback,
  getMutualFundNAVWithFallback,
  batchGetPrices,
  batchGetMutualFundNAVs,
  manualPriceRefresh
} from '@/lib/price-fetcher'
import {
  PricingError,
  APIRateLimitError,
  APITimeoutError,
  DataNotFoundError,
  checkPricingServiceHealth
} from '@/lib/pricing-error-handler'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    priceCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn()
    },
    priceHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn()
    },
    investment: {
      findMany: vi.fn()
    },
    sIP: {
      findMany: vi.fn()
    }
  }))
}))

// Mock fetch globally
global.fetch = vi.fn()

const mockPrisma = new PrismaClient() as any

describe('Enhanced Pricing Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Stock Price Fetching with Error Handling', () => {
    it('should fetch stock prices successfully', async () => {
      const mockResponse = {
        'NSE:RELIANCE': 2500.50,
        'NSE:INFY': 1532.30
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      const prices = await fetchStockPrices(['RELIANCE', 'INFY'])

      expect(prices).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('script.google.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            symbols: ['NSE:RELIANCE', 'NSE:INFY']
          })
        })
      )
    })

    it('should handle API rate limit errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response)

      await expect(fetchStockPrices(['RELIANCE']))
        .rejects.toThrow(APIRateLimitError)
    })

    it('should handle API timeout with retry', async () => {
      // First attempt times out, second succeeds
      vi.mocked(global.fetch)
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(resolve, 35000)) // Longer than timeout
        )
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 'NSE:RELIANCE': 2500 })
        } as Response)

      const promise = fetchStockPrices(['RELIANCE'])

      // Fast forward past timeout
      vi.advanceTimersByTime(35000)

      // Should eventually succeed after retry
      const result = await promise
      expect(result).toEqual({ 'NSE:RELIANCE': 2500 })
    })

    it('should handle invalid API responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null) // Invalid response
      } as Response)

      await expect(fetchStockPrices(['RELIANCE']))
        .rejects.toThrow(PricingError)
    })
  })

  describe('Mutual Fund NAV Fetching with Error Handling', () => {
    it('should fetch mutual fund NAVs successfully', async () => {
      const mockResponse = `Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
120716;INF204K01YX5;INF204K01YY3;Axis Long Term Equity Fund - Direct Plan - Growth;58.4567;01-Jan-2024`

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse)
      } as Response)

      const navData = await fetchMutualFundNAV(['120716'])

      expect(navData).toHaveLength(1)
      expect(navData[0]).toEqual({
        schemeCode: '120716',
        nav: 58.4567,
        date: '01-Jan-2024',
        schemeName: 'Axis Long Term Equity Fund - Direct Plan - Growth'
      })
    })

    it('should handle empty AMFI response', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('') // Empty response
      } as Response)

      await expect(fetchMutualFundNAV(['120716']))
        .rejects.toThrow(PricingError)
    })

    it('should handle AMFI API errors with retry', async () => {
      // First attempt fails, second succeeds
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(`120716;INF204K01YX5;INF204K01YY3;Test Fund;100.00;01-Jan-2024`)
        } as Response)

      const navData = await fetchMutualFundNAV(['120716'])

      expect(navData).toHaveLength(1)
      expect(navData[0].nav).toBe(100.00)
    })
  })

  describe('Price Fetching with Fallback Mechanisms', () => {
    it('should return fresh cached data when available', async () => {
      const mockCachedData = {
        symbol: 'RELIANCE',
        price: 2500,
        source: 'GOOGLE_SCRIPT',
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }

      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(mockCachedData)

      const price = await getPrice('RELIANCE')

      expect(price).toBe(2500)
      expect(global.fetch).not.toHaveBeenCalled() // Should use cache
    })

    it('should fetch fresh data when cache is stale', async () => {
      const mockStaleData = {
        symbol: 'RELIANCE',
        price: 2400, // Old price
        source: 'GOOGLE_SCRIPT',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      }

      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(mockStaleData)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'NSE:RELIANCE': 2500 })
      } as Response)

      const price = await getPrice('RELIANCE')

      expect(price).toBe(2500) // Should get fresh price
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should use stale data as fallback when fresh fetch fails', async () => {
      const mockStaleData = {
        symbol: 'RELIANCE',
        price: 2400,
        source: 'GOOGLE_SCRIPT',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago (stale)
      }

      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(mockStaleData)
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const result = await getPriceWithFallback('RELIANCE')

      expect(result.price).toBe(2400) // Should use stale data
      expect(result.fallbackUsed).toBe(true)
      expect(result.confidence).toBe('medium')
      expect(result.warnings).toContain(expect.stringContaining('stale data'))
    })

    it('should throw error when no fallback data available', async () => {
      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(null)
      vi.mocked(mockPrisma.priceHistory.findMany).mockResolvedValue([])
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      await expect(getPrice('RELIANCE'))
        .rejects.toThrow(PricingError)
    })
  })

  describe('Batch Operations with Error Handling', () => {
    it('should handle mixed success and failure in batch operations', async () => {
      // Mock successful response for some symbols
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          'NSE:RELIANCE': 2500,
          'NSE:INFY': 1500
          // INVALID symbol not in response
        })
      } as Response)

      const results = await batchGetPrices(['RELIANCE', 'INFY', 'INVALID'])

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ symbol: 'RELIANCE', price: 2500 })
      expect(results[1]).toEqual({ symbol: 'INFY', price: 1500 })
      expect(results[2]).toEqual({
        symbol: 'INVALID',
        price: null,
        error: expect.stringContaining('not available')
      })
    })

    it('should handle complete batch failure gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const results = await batchGetPrices(['RELIANCE', 'INFY'])

      expect(results).toHaveLength(2)
      expect(results[0].price).toBeNull()
      expect(results[0].error).toBeDefined()
      expect(results[1].price).toBeNull()
      expect(results[1].error).toBeDefined()
    })

    it('should respect rate limits in batch operations', async () => {
      const symbols = Array.from({ length: 15 }, (_, i) => `STOCK${i}`)

      // Mock successful responses
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response)
      )

      const startTime = Date.now()
      await batchGetPrices(symbols)

      // Should have delays between batches
      expect(Date.now() - startTime).toBeGreaterThan(0)
    })
  })

  describe('Manual Price Refresh with Enhanced Error Handling', () => {
    it('should refresh mixed stock and mutual fund symbols', async () => {
      // Mock stock price response
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 'NSE:RELIANCE': 2500 })
        } as Response)
        // Mock mutual fund NAV response
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(`120716;INF204K01YX5;INF204K01YY3;Test Fund;100.00;01-Jan-2024`)
        } as Response)

      const result = await manualPriceRefresh(['RELIANCE', '120716'])

      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].success).toBe(true)
      expect(result.results[0].price).toBe(2500)
      expect(result.results[1].success).toBe(true)
      expect(result.results[1].price).toBe(100)
    })

    it('should provide user-friendly error messages in manual refresh', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const result = await manualPriceRefresh(['RELIANCE'])

      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.results[0].success).toBe(false)
      expect(result.results[0].userFriendlyError).toBeDefined()
      expect(result.results[0].userFriendlyError).not.toContain('Network error') // Should be user-friendly
    })
  })

  describe('Service Health Check', () => {
    it('should report healthy status when all services are operational', async () => {
      // Mock successful API responses
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true } as Response) // Google Script
        .mockResolvedValueOnce({ ok: true } as Response) // AMFI

      // Mock successful database query
      vi.mocked(mockPrisma.priceCache.count).mockResolvedValue(100)

      const health = await checkPricingServiceHealth()

      expect(health.status).toBe('healthy')
      expect(health.services.googleScript.status).toBe('up')
      expect(health.services.amfi.status).toBe('up')
      expect(health.services.database.status).toBe('up')
      expect(health.rateLimits).toBeDefined()
    })

    it('should report degraded status when some services are down', async () => {
      // Mock mixed responses
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true } as Response) // Google Script up
        .mockRejectedValueOnce(new Error('AMFI down')) // AMFI down

      vi.mocked(mockPrisma.priceCache.count).mockResolvedValue(100)

      const health = await checkPricingServiceHealth()

      expect(health.status).toBe('degraded')
      expect(health.services.googleScript.status).toBe('up')
      expect(health.services.amfi.status).toBe('down')
      expect(health.services.database.status).toBe('up')
    })

    it('should include response times in health check', async () => {
      vi.mocked(global.fetch)
        .mockImplementationOnce(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ ok: true } as Response), 100)
          )
        )
        .mockResolvedValueOnce({ ok: true } as Response)

      vi.mocked(mockPrisma.priceCache.count).mockResolvedValue(100)

      // Advance timers to simulate response time
      const healthPromise = checkPricingServiceHealth()
      vi.advanceTimersByTime(100)
      const health = await healthPromise

      expect(health.services.googleScript.responseTime).toBeGreaterThan(0)
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should recover from temporary network issues', async () => {
      // First attempt fails, second succeeds
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 'NSE:RELIANCE': 2500 })
        } as Response)

      const price = await getPrice('RELIANCE')

      expect(price).toBe(2500)
      expect(global.fetch).toHaveBeenCalledTimes(2) // Should retry
    })

    it('should handle database connectivity issues gracefully', async () => {
      // Mock database error
      vi.mocked(mockPrisma.priceCache.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      )

      // Mock successful API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'NSE:RELIANCE': 2500 })
      } as Response)

      // Should still be able to fetch fresh data
      const price = await getPrice('RELIANCE')
      expect(price).toBe(2500)
    })

    it('should handle partial API responses correctly', async () => {
      // Mock response with some missing data
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          'NSE:RELIANCE': 2500,
          // INFY missing from response
        })
      } as Response)

      const results = await batchGetPrices(['RELIANCE', 'INFY'])

      expect(results[0]).toEqual({ symbol: 'RELIANCE', price: 2500 })
      expect(results[1]).toEqual({
        symbol: 'INFY',
        price: null,
        error: expect.stringContaining('not available')
      })
    })
  })

  describe('Performance Under Error Conditions', () => {
    it('should not exceed timeout limits even with retries', async () => {
      // Mock slow responses that eventually timeout
      vi.mocked(global.fetch).mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 35000)) // Longer than timeout
      )

      const startTime = Date.now()
      
      try {
        await getPrice('RELIANCE')
      } catch (error) {
        // Should timeout and not take too long
        const duration = Date.now() - startTime
        expect(duration).toBeLessThan(120000) // Should not exceed 2 minutes total
        expect(error).toBeInstanceOf(PricingError)
      }
    })

    it('should handle high-frequency requests with rate limiting', async () => {
      const symbols = Array.from({ length: 50 }, (_, i) => `STOCK${i}`)

      // Mock successful responses
      vi.mocked(global.fetch).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response)
      )

      const startTime = Date.now()
      await batchGetPrices(symbols)
      const duration = Date.now() - startTime

      // Should have appropriate delays for rate limiting
      expect(duration).toBeGreaterThan(1000) // At least some delay
    })
  })
})