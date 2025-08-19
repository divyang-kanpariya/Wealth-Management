import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  fetchUnifiedPrices,
  getCachedPrice,
  updatePriceCache,
  getPrice,
  batchGetPrices,
  clearAllCaches,
  getCacheStats,
  manualPriceRefresh
} from '@/lib/price-fetcher'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    priceCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn()
    },
    priceHistory: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    investment: {
      findMany: vi.fn()
    },
    sIP: {
      findMany: vi.fn()
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

  describe('fetchUnifiedPrices', () => {
    it('should fetch prices for both stocks and mutual funds', async () => {
      const mockResponse = {
        'NSE:RELIANCE': 2500,
        'NSE:INFY': 1500,
        'MUTF_IN:123456': 150.75
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const prices = await fetchUnifiedPrices(['RELIANCE', 'INFY', '123456'])
      
      expect(prices).toEqual({
        'NSE:RELIANCE': 2500,
        'NSE:INFY': 1500,
        'MUTF_IN:123456': 150.75
      })
    })

    it('should format symbols correctly', async () => {
      const mockResponse = {
        'NSE:RELIANCE': 2500,
        'MUTF_IN:123456': 150.75
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // Test with already formatted symbols
      const prices = await fetchUnifiedPrices(['NSE:RELIANCE', 'MUTF_IN:123456'])
      
      expect(prices).toEqual(mockResponse)
    })

    it('should handle API errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(fetchUnifiedPrices(['RELIANCE'])).rejects.toThrow('Google Script API error: 500 Internal Server Error')
    })
  })

  describe('manualPriceRefresh', () => {
    it('should refresh prices for multiple symbols', async () => {
      const mockResponse = {
        'NSE:RELIANCE': 2500.50,
        'MUTF_IN:123456': 150.75
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      mockPrisma.priceCache.upsert.mockResolvedValue({})
      mockPrisma.priceHistory.create.mockResolvedValue({})

      const result = await manualPriceRefresh(['RELIANCE', '123456'])
      
      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].symbol).toBe('RELIANCE')
      expect(result.results[0].price).toBe(2500.50)
      expect(result.results[1].symbol).toBe('123456')
      expect(result.results[1].price).toBe(150.75)
    })

    it('should handle partial failures', async () => {
      const mockResponse = {
        'NSE:RELIANCE': 2500.50
        // Missing MUTF_IN:123456
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      mockPrisma.priceCache.upsert.mockResolvedValue({})
      mockPrisma.priceHistory.create.mockResolvedValue({})

      const result = await manualPriceRefresh(['RELIANCE', '123456'])
      
      expect(result.success).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].success).toBe(true)
      expect(result.results[1].success).toBe(false)
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
        source: 'GOOGLE_SCRIPT'
      }

      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(mockCacheEntry)

      const result = await getCachedPrice('TEST')
      expect(result).toEqual({
        price: 100.50,
        source: 'GOOGLE_SCRIPT',
        isStale: false
      })
    })

    it('should return stale cache when cache is old but within 24 hours', async () => {
      const mockCacheEntry = {
        symbol: 'TEST',
        price: 100.50,
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        source: 'GOOGLE_SCRIPT'
      }

      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(mockCacheEntry)

      const result = await getCachedPrice('TEST')
      expect(result).toEqual({
        price: 100.50,
        source: 'GOOGLE_SCRIPT_STALE',
        isStale: true
      })
    })

    it('should return null when cache is expired (over 24 hours)', async () => {
      const mockCacheEntry = {
        symbol: 'TEST',
        price: 100.50,
        lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        source: 'GOOGLE_SCRIPT'
      }

      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(mockCacheEntry)

      const result = await getCachedPrice('TEST')
      expect(result).toBeNull()
    })
  })

  describe('updatePriceCache', () => {
    it('should update database cache', async () => {
      mockPrisma.priceCache.upsert.mockResolvedValueOnce({})

      await updatePriceCache('TEST', 100.50, 'GOOGLE_SCRIPT')

      expect(mockPrisma.priceCache.upsert).toHaveBeenCalledWith({
        where: { symbol: 'TEST' },
        update: {
          price: 100.50,
          lastUpdated: expect.any(Date),
          source: 'GOOGLE_SCRIPT'
        },
        create: {
          symbol: 'TEST',
          price: 100.50,
          source: 'GOOGLE_SCRIPT'
        }
      })
    })

    it('should throw when database update fails', async () => {
      mockPrisma.priceCache.upsert.mockRejectedValueOnce(new Error('Database error'))

      await expect(updatePriceCache('TEST', 100.50, 'GOOGLE_SCRIPT')).rejects.toThrow('Database error')
    })
  })

  describe('getPrice', () => {
    it('should return cached price when available and fresh', async () => {
      const mockCacheEntry = {
        symbol: 'TEST',
        price: 100.50,
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        source: 'GOOGLE_SCRIPT'
      }

      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(mockCacheEntry)

      const price = await getPrice('TEST')
      expect(price).toBe(100.50)
    })

    it('should fetch fresh price when cache is empty', async () => {
      mockPrisma.priceCache.findUnique.mockResolvedValueOnce(null)
      mockPrisma.priceCache.upsert.mockResolvedValueOnce({})
      mockPrisma.priceHistory.create.mockResolvedValueOnce({})

      const mockResponse = {
        'NSE:TEST': 200.75
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const price = await getPrice('TEST')
      expect(price).toBe(200.75)
      expect(mockPrisma.priceCache.upsert).toHaveBeenCalled()
    })

    it('should use stale cache when fresh fetch fails', async () => {
      // First call returns null (no fresh cache)
      // Second call returns stale cache
      mockPrisma.priceCache.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          symbol: 'TEST',
          price: 150.25,
          lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (stale)
          source: 'GOOGLE_SCRIPT'
        })

      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const price = await getPrice('TEST')
      expect(price).toBe(150.25)
    })
  })

  describe('batchGetPrices', () => {
    it('should handle batch price requests using unified API', async () => {
      mockPrisma.priceCache.upsert.mockResolvedValue({})
      mockPrisma.priceHistory.create.mockResolvedValue({})

      const mockResponse = {
        'NSE:STOCK1': 100.50,
        'MUTF_IN:MF001': 200.75
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
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
      mockPrisma.priceCache.upsert.mockResolvedValue({})
      mockPrisma.priceHistory.create.mockResolvedValue({})

      const mockResponse = {
        'NSE:STOCK1': 100.50
        // Missing MUTF_IN:INVALID
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

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
        error: 'Price not available for INVALID'
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
      
      mockPrisma.priceCache.count
        .mockResolvedValueOnce(8) // fresh count
        .mockResolvedValueOnce(2) // stale count
        .mockResolvedValueOnce(0) // expired count

      const stats = await getCacheStats()

      expect(stats).toEqual({
        databaseCache: {
          count: 10,
          freshCount: 8,
          staleCount: 2,
          expiredCount: 0,
          oldestEntry: new Date('2024-01-01'),
          newestEntry: new Date('2024-01-02')
        }
      })
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.priceCache.aggregate.mockRejectedValueOnce(new Error('Database error'))

      const stats = await getCacheStats()

      expect(stats).toEqual({
        databaseCache: {
          count: 0,
          freshCount: 0,
          staleCount: 0,
          expiredCount: 0
        }
      })
    })
  })
})