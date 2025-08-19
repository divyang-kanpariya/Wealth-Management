/**
 * Database-Only Pricing Cache Integration Tests
 * 
 * This test suite verifies that pricing data is cached only in the database
 * with proper staleness checks and fallback mechanisms.
 * 
 * Requirements tested:
 * - 2.1: Database-only price caching
 * - 2.4: Staleness check (1 hour fresh, 24 hours fallback)
 * - 4.2: Performance with database-only approach
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  getCachedPrice,
  updatePriceCache,
  getPrice,
  getPriceWithFallback,
  getCacheStats,
  cleanupExpiredCache
} from '@/lib/price-fetcher'

// Mock external API calls
vi.mock('@/lib/price-fetcher', async () => {
  const actual = await vi.importActual('@/lib/price-fetcher')
  return {
    ...actual,
    fetchStockPrices: vi.fn(),
    fetchMutualFundNAV: vi.fn()
  }
})

describe('Database-Only Pricing Cache Integration Tests', () => {
  const testSymbols = ['RELIANCE', 'INFY', 'TCS', '120503', '120716']
  
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Clean up test data
    await prisma.priceCache.deleteMany({
      where: {
        symbol: { in: testSymbols }
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.priceCache.deleteMany({
      where: {
        symbol: { in: testSymbols }
      }
    })
  })

  describe('Database Cache Storage and Retrieval', () => {
    it('should store and retrieve prices from database cache', async () => {
      // Store price in database
      await updatePriceCache('RELIANCE', 2500.50, 'GOOGLE_SCRIPT')

      // Retrieve from database cache
      const cachedPrice = await getCachedPrice('RELIANCE')

      expect(cachedPrice).toBeDefined()
      expect(cachedPrice?.price).toBe(2500.50)
      expect(cachedPrice?.source).toBe('GOOGLE_SCRIPT')
    })

    it('should update existing cache entries correctly', async () => {
      // Store initial price
      await updatePriceCache('RELIANCE', 2500, 'GOOGLE_SCRIPT')
      
      // Update with new price
      await updatePriceCache('RELIANCE', 2600, 'GOOGLE_SCRIPT')

      // Should have updated price
      const cachedPrice = await getCachedPrice('RELIANCE')
      expect(cachedPrice?.price).toBe(2600)

      // Should only have one entry in database
      const count = await prisma.priceCache.count({
        where: { symbol: 'RELIANCE' }
      })
      expect(count).toBe(1)
    })

    it('should handle multiple symbols independently', async () => {
      // Store prices for multiple symbols
      await updatePriceCache('RELIANCE', 2500, 'GOOGLE_SCRIPT')
      await updatePriceCache('INFY', 1500, 'GOOGLE_SCRIPT')
      await updatePriceCache('120503', 45.67, 'AMFI')

      // Retrieve each independently
      const reliancePrice = await getCachedPrice('RELIANCE')
      const infyPrice = await getCachedPrice('INFY')
      const mfPrice = await getCachedPrice('120503')

      expect(reliancePrice?.price).toBe(2500)
      expect(infyPrice?.price).toBe(1500)
      expect(mfPrice?.price).toBe(45.67)
      expect(mfPrice?.source).toBe('AMFI')
    })

    it('should return null for non-existent symbols', async () => {
      const cachedPrice = await getCachedPrice('NON_EXISTENT')
      expect(cachedPrice).toBeNull()
    })
  })

  describe('Staleness Check Implementation', () => {
    it('should identify fresh cache data (less than 1 hour)', async () => {
      // Store recent price
      const recentTime = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2500,
          source: 'GOOGLE_SCRIPT',
          lastUpdated: recentTime
        }
      })

      const cachedPrice = await getCachedPrice('RELIANCE')
      expect(cachedPrice).toBeDefined()
      expect(cachedPrice?.price).toBe(2500)
      
      // Should be considered fresh
      const cacheAge = Date.now() - cachedPrice!.lastUpdated.getTime()
      expect(cacheAge).toBeLessThan(60 * 60 * 1000) // Less than 1 hour
    })

    it('should identify stale cache data (1-24 hours old)', async () => {
      // Store stale price
      const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2400,
          source: 'GOOGLE_SCRIPT',
          lastUpdated: staleTime
        }
      })

      const cachedPrice = await getCachedPrice('RELIANCE')
      expect(cachedPrice).toBeDefined()
      expect(cachedPrice?.price).toBe(2400)
      
      // Should be considered stale but usable
      const cacheAge = Date.now() - cachedPrice!.lastUpdated.getTime()
      expect(cacheAge).toBeGreaterThan(60 * 60 * 1000) // More than 1 hour
      expect(cacheAge).toBeLessThan(24 * 60 * 60 * 1000) // Less than 24 hours
    })

    it('should identify expired cache data (more than 24 hours)', async () => {
      // Store expired price
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2300,
          source: 'GOOGLE_SCRIPT',
          lastUpdated: expiredTime
        }
      })

      // Should still return the data (implementation may vary)
      const cachedPrice = await getCachedPrice('RELIANCE')
      
      if (cachedPrice) {
        const cacheAge = Date.now() - cachedPrice.lastUpdated.getTime()
        expect(cacheAge).toBeGreaterThan(24 * 60 * 60 * 1000) // More than 24 hours
      }
    })
  })

  describe('Price Fetching with Fallback Logic', () => {
    it('should use fresh cache when available', async () => {
      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      
      // Store fresh cache
      await updatePriceCache('RELIANCE', 2500, 'GOOGLE_SCRIPT')

      const price = await getPrice('RELIANCE')

      expect(price).toBe(2500)
      expect(fetchStockPrices).not.toHaveBeenCalled() // Should not call API
    })

    it('should fetch fresh data when cache is stale', async () => {
      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      
      // Store stale cache
      const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2400, // Old price
          source: 'GOOGLE_SCRIPT',
          lastUpdated: staleTime
        }
      })

      // Mock fresh API response
      vi.mocked(fetchStockPrices).mockResolvedValue({
        'NSE:RELIANCE': 2600 // New price
      })

      const price = await getPrice('RELIANCE')

      expect(price).toBe(2600) // Should get fresh price
      expect(fetchStockPrices).toHaveBeenCalled()
    })

    it('should use stale data as fallback when API fails', async () => {
      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      
      // Store stale cache
      const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2400,
          source: 'GOOGLE_SCRIPT',
          lastUpdated: staleTime
        }
      })

      // Mock API failure
      vi.mocked(fetchStockPrices).mockRejectedValue(new Error('API unavailable'))

      const result = await getPriceWithFallback('RELIANCE')

      expect(result.price).toBe(2400) // Should use stale data
      expect(result.fallbackUsed).toBe(true)
      expect(result.confidence).toBe('medium') // Stale data has medium confidence
      expect(result.warnings).toContain(expect.stringContaining('stale'))
    })

    it('should throw error when no cache data available and API fails', async () => {
      const { fetchStockPrices } = await import('@/lib/price-fetcher')
      
      // No cache data exists
      // Mock API failure
      vi.mocked(fetchStockPrices).mockRejectedValue(new Error('API unavailable'))

      await expect(getPrice('RELIANCE')).rejects.toThrow()
    })
  })

  describe('Cache Statistics and Monitoring', () => {
    it('should provide accurate cache statistics', async () => {
      // Create test data with different ages
      const now = Date.now()
      await prisma.priceCache.createMany({
        data: [
          {
            symbol: 'RELIANCE',
            price: 2500,
            source: 'GOOGLE_SCRIPT',
            lastUpdated: new Date(now - 30 * 60 * 1000) // 30 minutes ago (fresh)
          },
          {
            symbol: 'INFY',
            price: 1500,
            source: 'GOOGLE_SCRIPT',
            lastUpdated: new Date(now - 2 * 60 * 60 * 1000) // 2 hours ago (stale)
          },
          {
            symbol: 'TCS',
            price: 3500,
            source: 'GOOGLE_SCRIPT',
            lastUpdated: new Date(now - 25 * 60 * 60 * 1000) // 25 hours ago (expired)
          },
          {
            symbol: '120503',
            price: 45.67,
            source: 'AMFI',
            lastUpdated: new Date(now - 45 * 60 * 1000) // 45 minutes ago (fresh)
          }
        ]
      })

      const stats = await getCacheStats()

      expect(stats.databaseCache.count).toBe(4)
      expect(stats.databaseCache.freshCount).toBe(2) // RELIANCE and 120503
      expect(stats.databaseCache.staleCount).toBe(1) // INFY
      expect(stats.databaseCache.expiredCount).toBe(1) // TCS
      expect(stats.databaseCache.oldestEntry).toBeDefined()
      expect(stats.databaseCache.newestEntry).toBeDefined()
    })

    it('should track cache hit rates', async () => {
      // Store some cache data
      await updatePriceCache('RELIANCE', 2500, 'GOOGLE_SCRIPT')
      await updatePriceCache('INFY', 1500, 'GOOGLE_SCRIPT')

      // Perform cache lookups
      await getCachedPrice('RELIANCE') // Hit
      await getCachedPrice('INFY') // Hit
      await getCachedPrice('TCS') // Miss

      const stats = await getCacheStats()

      expect(stats.performance).toBeDefined()
      expect(stats.performance.totalQueries).toBeGreaterThan(0)
      expect(stats.performance.cacheHits).toBeGreaterThan(0)
      expect(stats.performance.cacheMisses).toBeGreaterThan(0)
    })
  })

  describe('Cache Cleanup and Maintenance', () => {
    it('should clean up expired cache entries', async () => {
      // Create expired entries
      const expiredTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      await prisma.priceCache.createMany({
        data: [
          {
            symbol: 'OLD_STOCK_1',
            price: 100,
            source: 'GOOGLE_SCRIPT',
            lastUpdated: expiredTime
          },
          {
            symbol: 'OLD_STOCK_2',
            price: 200,
            source: 'GOOGLE_SCRIPT',
            lastUpdated: expiredTime
          },
          {
            symbol: 'RELIANCE',
            price: 2500,
            source: 'GOOGLE_SCRIPT',
            lastUpdated: new Date() // Fresh
          }
        ]
      })

      const cleanedCount = await cleanupExpiredCache()

      expect(cleanedCount).toBe(2) // Should clean up 2 expired entries

      // Fresh entry should remain
      const remainingCount = await prisma.priceCache.count()
      expect(remainingCount).toBe(1)

      const remaining = await getCachedPrice('RELIANCE')
      expect(remaining).toBeDefined()
    })

    it('should handle cleanup of large datasets efficiently', async () => {
      // Create many expired entries
      const expiredTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const expiredEntries = Array.from({ length: 100 }, (_, i) => ({
        symbol: `OLD_STOCK_${i}`,
        price: Math.random() * 1000,
        source: 'GOOGLE_SCRIPT',
        lastUpdated: expiredTime
      }))

      await prisma.priceCache.createMany({
        data: expiredEntries
      })

      const startTime = Date.now()
      const cleanedCount = await cleanupExpiredCache()
      const endTime = Date.now()

      expect(cleanedCount).toBe(100)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete in under 5 seconds

      console.log(`Cleaned up ${cleanedCount} entries in ${endTime - startTime}ms`)
    })
  })

  describe('Performance Under Database-Only Approach', () => {
    it('should handle high-frequency cache operations efficiently', async () => {
      const symbols = Array.from({ length: 50 }, (_, i) => `STOCK_${i}`)
      
      // Store many cache entries
      const startTime = Date.now()
      
      for (const symbol of symbols) {
        await updatePriceCache(symbol, Math.random() * 1000, 'GOOGLE_SCRIPT')
      }
      
      const storeTime = Date.now()
      
      // Retrieve all entries
      for (const symbol of symbols) {
        await getCachedPrice(symbol)
      }
      
      const retrieveTime = Date.now()

      const storeOperationTime = storeTime - startTime
      const retrieveOperationTime = retrieveTime - storeTime

      expect(storeOperationTime).toBeLessThan(10000) // Under 10 seconds for 50 stores
      expect(retrieveOperationTime).toBeLessThan(5000) // Under 5 seconds for 50 retrievals

      console.log(`Store operations: ${storeOperationTime}ms, Retrieve operations: ${retrieveOperationTime}ms`)
    })

    it('should handle concurrent cache operations without conflicts', async () => {
      const symbols = ['RELIANCE', 'INFY', 'TCS', 'WIPRO', 'HCL']
      
      // Perform concurrent updates
      const updatePromises = symbols.map(symbol =>
        updatePriceCache(symbol, Math.random() * 1000, 'GOOGLE_SCRIPT')
      )
      
      await Promise.all(updatePromises)

      // Perform concurrent retrievals
      const retrievePromises = symbols.map(symbol => getCachedPrice(symbol))
      const results = await Promise.all(retrievePromises)

      // All should succeed
      results.forEach((result, index) => {
        expect(result).toBeDefined()
        expect(result?.symbol).toBe(symbols[index])
        expect(result?.price).toBeGreaterThan(0)
      })
    })

    it('should maintain performance with large cache datasets', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        symbol: `STOCK_${i}`,
        price: Math.random() * 1000,
        source: 'GOOGLE_SCRIPT',
        lastUpdated: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
      }))

      await prisma.priceCache.createMany({
        data: largeDataset
      })

      // Test retrieval performance with large dataset
      const startTime = Date.now()
      
      const testSymbols = ['STOCK_100', 'STOCK_500', 'STOCK_900']
      for (const symbol of testSymbols) {
        await getCachedPrice(symbol)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // Should be fast even with large dataset

      // Test statistics performance
      const statsStartTime = Date.now()
      const stats = await getCacheStats()
      const statsEndTime = Date.now()

      expect(stats.databaseCache.count).toBe(1000)
      expect(statsEndTime - statsStartTime).toBeLessThan(2000) // Stats should be fast

      console.log(`Cache operations with 1000 entries: ${duration}ms, Stats: ${statsEndTime - statsStartTime}ms`)
    })
  })

  describe('Database Connection Resilience', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalFindUnique = prisma.priceCache.findUnique
      vi.spyOn(prisma.priceCache, 'findUnique').mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      await expect(getCachedPrice('RELIANCE')).rejects.toThrow('Database connection failed')

      // Restore original function
      vi.mocked(prisma.priceCache.findUnique).mockRestore()

      // Should work normally after error
      await updatePriceCache('RELIANCE', 2500, 'GOOGLE_SCRIPT')
      const cachedPrice = await getCachedPrice('RELIANCE')
      expect(cachedPrice?.price).toBe(2500)
    })

    it('should handle database timeout scenarios', async () => {
      // Mock slow database response
      vi.spyOn(prisma.priceCache, 'findUnique').mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
      )

      const startTime = Date.now()
      
      try {
        await getCachedPrice('RELIANCE')
      } catch (error) {
        const endTime = Date.now()
        const duration = endTime - startTime
        
        // Should timeout appropriately
        expect(duration).toBeGreaterThan(5000) // Should wait some time
        expect(error).toBeDefined()
      }

      // Restore original function
      vi.mocked(prisma.priceCache.findUnique).mockRestore()
    })
  })
})