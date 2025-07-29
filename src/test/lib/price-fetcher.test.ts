import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  fetchStockPrices,
  fetchMutualFundNAV,
  getMutualFundNAV,
  getCachedPrice,
  updatePriceCache,
  getPrice,
  batchGetPrices,
  clearAllCaches,
  getCacheStats
} from '@/lib/price-fetcher'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    priceCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn()
    }
  }))
}))

// Mock fetch
global.fetch = vi.fn()

const mockPrisma = new PrismaClient() as any

describe('Price Fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any existing cache
    clearAllCaches()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchStockPrices', () => {
    it('should fetch stock price from NSE API successfully', async () => {
      const mockResponse = {
        'NSE:RELIANCE': 2500.50
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const prices = await fetchStockPrices(['RELIANCE'])
      expect(prices['NSE:RELIANCE']).toBe(2500.50)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.nseindia.com/api/quote-equity?symbol=RELIANCE',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla'),
            'Accept': 'application/json'
          })
        })
      )
    })

    it('should throw error when NSE API returns non-ok response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(fetchStockPrices(['INVALID'])).rejects.toThrow('NSE API error: 404 Not Found')
    })

    it('should throw error when NSE API returns invalid data', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' })
      })

      await expect(fetchStockPrices(['RELIANCE'])).rejects.toThrow('Invalid NSE response for symbol RELIANCE')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchStockPrices(['RELIANCE'])).rejects.toThrow('Failed to fetch stock price for RELIANCE')
    })
  })

  describe('fetchMutualFundNAV', () => {
    it('should fetch and parse mutual fund NAV data successfully', async () => {
      const mockNavData = `Scheme Code|ISIN Div Payout|ISIN Div Reinvestment|Scheme Name|Net Asset Value|Date
100001||INF209K01157|Aditya Birla Sun Life Liquid Fund - Regular Plan - Growth|100.5678|01-Jan-2024
100002||INF209K01165|Aditya Birla Sun Life Equity Fund - Regular Plan - Growth|250.1234|01-Jan-2024`

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockNavData)
      })

      const navData = await fetchMutualFundNAV()
      
      expect(navData).toHaveLength(2)
      expect(navData[0]).toEqual({
        schemeCode: '100001',
        schemeName: 'Aditya Birla Sun Life Liquid Fund - Regular Plan - Growth',
        nav: 100.5678,
        date: '01-Jan-2024'
      })
      expect(navData[1]).toEqual({
        schemeCode: '100002',
        schemeName: 'Aditya Birla Sun Life Equity Fund - Regular Plan - Growth',
        nav: 250.1234,
        date: '01-Jan-2024'
      })
    })

    it('should filter out invalid NAV entries', async () => {
      const mockNavData = `Scheme Code|ISIN Div Payout|ISIN Div Reinvestment|Scheme Name|Net Asset Value|Date
100001||INF209K01157|Valid Fund|100.5678|01-Jan-2024
100002||INF209K01165|Invalid Fund|N.A.|01-Jan-2024
100003||INF209K01173|Another Valid Fund|200.1234|01-Jan-2024`

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockNavData)
      })

      const navData = await fetchMutualFundNAV()
      
      expect(navData).toHaveLength(2)
      expect(navData.every(item => !isNaN(item.nav))).toBe(true)
    })

    it('should throw error when AMFI API fails', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(fetchMutualFundNAV()).rejects.toThrow('AMFI API error: 500 Internal Server Error')
    })
  })

  describe('getMutualFundNAV', () => {
    it('should get mutual fund price by scheme code', async () => {
      const mockNavData = `Scheme Code|ISIN Div Payout|ISIN Div Reinvestment|Scheme Name|Net Asset Value|Date
100001||INF209K01157|Test Fund|150.75|01-Jan-2024`

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockNavData)
      })

      const price = await getMutualFundNAV('100001')
      expect(price).toBe(150.75)
    })

    it('should throw error when scheme code not found', async () => {
      const mockNavData = `Scheme Code|ISIN Div Payout|ISIN Div Reinvestment|Scheme Name|Net Asset Value|Date
100001||INF209K01157|Test Fund|150.75|01-Jan-2024`

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockNavData)
      })

      await expect(getMutualFundNAV('999999')).rejects.toThrow('Mutual fund with scheme code 999999 not found')
    })
  })

  describe('getCachedPrice', () => {
    it('should return null when no cache exists', async () => {
      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(null)

      const result = await getCachedPrice('TEST')
      expect(result).toBeNull()
    })

    it('should return cached price when valid cache exists', async () => {
      const mockCacheEntry = {
        symbol: 'TEST',
        price: 100.50,
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        source: 'NSE'
      }

      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(mockCacheEntry)

      const result = await getCachedPrice('TEST')
      expect(result).toEqual({
        price: 100.50,
        source: 'NSE'
      })
    })

    it('should return null when cache is expired', async () => {
      const mockCacheEntry = {
        symbol: 'TEST',
        price: 100.50,
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        source: 'NSE'
      }

      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(mockCacheEntry)

      const result = await getCachedPrice('TEST')
      expect(result).toBeNull()
    })
  })

  describe('updatePriceCache', () => {
    it('should update both in-memory and database cache', async () => {
      mockPrisma.priceCache.upsert.mockResolvedValueOnce({})

      await updatePriceCache('TEST', 100.50, 'NSE')

      expect(mockPrisma.priceCache.upsert).toHaveBeenCalledWith({
        where: { symbol: 'TEST' },
        update: {
          price: 100.50,
          lastUpdated: expect.any(Date),
          source: 'NSE'
        },
        create: {
          symbol: 'TEST',
          price: 100.50,
          source: 'NSE'
        }
      })
    })

    it('should not throw when database update fails', async () => {
      mockPrisma.priceCache.upsert.mockRejectedValueOnce(new Error('Database error'))

      await expect(updatePriceCache('TEST', 100.50, 'NSE')).resolves.not.toThrow()
    })
  })

  describe('getPrice', () => {
    it('should return cached price when available', async () => {
      const mockCacheEntry = {
        symbol: 'TEST',
        price: 100.50,
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000),
        source: 'NSE'
      }

      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(mockCacheEntry)

      const price = await getPrice('TEST')
      expect(price).toBe(100.50)
    })

    it('should fetch fresh price when cache is empty', async () => {
      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(null)
      mockPrisma.priceCache.upsert.mockResolvedValueOnce({})

      const mockResponse = {
        info: {
          symbol: 'TEST',
          companyName: 'Test Company',
          lastPrice: 200.75
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const price = await getPrice('TEST')
      expect(price).toBe(200.75)
      expect(mockPrisma.priceCache.upsert).toHaveBeenCalled()
    })

    it('should return stale cache when fresh fetch fails', async () => {
      mockPrisma.priceCache.findUnique
        .mockResolvedValueOnce(null) // First call for fresh cache
        .mockResolvedValueOnce({ // Second call for stale cache
          symbol: 'TEST',
          price: 150.25,
          lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
          source: 'NSE'
        })

      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const price = await getPrice('TEST')
      expect(price).toBe(150.25)
    })
  })

  describe('batchGetPrices', () => {
    it('should handle batch price requests', async () => {
      mockPrisma.priceCache.findUnique.mockResolvedValue(null)
      mockPrisma.priceCache.upsert.mockResolvedValue({})

      const mockStockResponse = {
        info: { symbol: 'STOCK1', companyName: 'Stock 1', lastPrice: 100.50 }
      }

      const mockNavData = `Scheme Code|ISIN Div Payout|ISIN Div Reinvestment|Scheme Name|Net Asset Value|Date
MF001||INF209K01157|Test Fund|200.75|01-Jan-2024`

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStockResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockNavData)
        })

      const requests = ['STOCK1', 'MF001']

      const results = await batchGetPrices(requests)

      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({
        symbol: 'STOCK1',
        price: 100.50
      })
      expect(results[1]).toEqual({
        symbol: 'MF001',
        price: 200.75
      })
    })

    it('should handle partial failures in batch requests', async () => {
      mockPrisma.priceCache.findUnique.mockResolvedValue(null)
      mockPrisma.priceCache.upsert.mockResolvedValue({})

      const mockStockResponse = {
        info: { symbol: 'STOCK1', companyName: 'Stock 1', lastPrice: 100.50 }
      }

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStockResponse)
        })
        .mockRejectedValueOnce(new Error('Network error'))

      const requests = ['STOCK1', 'INVALID']

      const results = await batchGetPrices(requests)

      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({
        symbol: 'STOCK1',
        price: 100.50
      })
      expect(results[1]).toEqual({
        symbol: 'INVALID',
        price: null,
        error: expect.stringContaining('Failed to fetch stock price')
      })
    })
  })

  describe('clearAllCaches', () => {
    it('should clear both in-memory and database caches', async () => {
      mockPrisma.priceCache.deleteMany.mockResolvedValueOnce({ count: 5 })

      await clearAllCaches()

      expect(mockPrisma.priceCache.deleteMany).toHaveBeenCalled()
    })

    it('should not throw when database clear fails', async () => {
      mockPrisma.priceCache.deleteMany.mockRejectedValueOnce(new Error('Database error'))

      await expect(clearAllCaches()).resolves.not.toThrow()
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockPrisma.priceCache.aggregate.mockResolvedValueOnce({
        _count: 10,
        _min: { lastUpdated: new Date('2024-01-01') },
        _max: { lastUpdated: new Date('2024-01-02') }
      })

      const stats = await getCacheStats()

      expect(stats).toEqual({
        memoryCache: { size: expect.any(Number) },
        databaseCache: {
          count: 10,
          oldestEntry: new Date('2024-01-01'),
          newestEntry: new Date('2024-01-02')
        }
      })
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.priceCache.aggregate.mockRejectedValueOnce(new Error('Database error'))

      const stats = await getCacheStats()

      expect(stats).toEqual({
        memoryCache: { size: expect.any(Number) },
        databaseCache: { count: 0 }
      })
    })
  })
})