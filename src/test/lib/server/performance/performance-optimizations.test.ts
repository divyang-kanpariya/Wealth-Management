import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  AdvancedCacheManager,
  ParallelDataFetcher,
  DatabaseQueryOptimizer,
  PerformanceMonitor,
  OptimizedDataPreparator,
  PreparatorPerformanceMonitor
} from '@/lib/server/performance'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    goal: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    sIP: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    account: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    }
  }
}))

describe('Performance Optimizations', () => {
  describe('AdvancedCacheManager', () => {
    let cache: AdvancedCacheManager<string>

    beforeEach(() => {
      cache = new AdvancedCacheManager(1000, 10) // 1 second TTL, max 10 items
    })

    it('should cache and retrieve data', () => {
      cache.set('test-key', 'test-value')
      expect(cache.get('test-key')).toBe('test-value')
    })

    it('should return null for expired data', async () => {
      cache.set('test-key', 'test-value', 10) // 10ms TTL
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(cache.get('test-key')).toBeNull()
    })

    it('should return stale data within stale-while-revalidate window', async () => {
      cache.set('test-key', 'test-value', 10) // 10ms TTL
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(cache.getStale('test-key')).toBe('test-value')
    })

    it('should track cache statistics', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.get('key1') // hit
      cache.get('key3') // miss

      const stats = cache.getStats()
      expect(stats.totalEntries).toBe(2)
      expect(stats.totalHits).toBe(1)
      expect(stats.totalMisses).toBe(1)
      expect(stats.hitRate).toBe(50)
    })

    it('should evict LRU items when at capacity', () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`)
      }

      // Add one more item to trigger eviction
      cache.set('key10', 'value10')

      // First item should be evicted
      expect(cache.get('key0')).toBeNull()
      expect(cache.get('key10')).toBe('value10')
    })

    it('should cleanup expired entries', async () => {
      cache.set('key1', 'value1', 10) // 10ms TTL
      cache.set('key2', 'value2', 1000) // 1s TTL
      
      await new Promise(resolve => setTimeout(resolve, 20))
      
      const removedCount = cache.cleanup()
      expect(removedCount).toBe(1)
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBe('value2')
    })
  })

  describe('ParallelDataFetcher', () => {
    let fetcher: ParallelDataFetcher

    beforeEach(() => {
      fetcher = new ParallelDataFetcher()
    })

    it('should fetch data in parallel', async () => {
      const fetchFunctions = {
        data1: async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return 'result1'
        },
        data2: async () => {
          await new Promise(resolve => setTimeout(resolve, 15))
          return 'result2'
        }
      }

      const results = await fetcher.fetchInParallel(fetchFunctions)

      expect(results.data1.data).toBe('result1')
      expect(results.data2.data).toBe('result2')
      expect(results.data1.duration).toBeGreaterThan(0)
      expect(results.data2.duration).toBeGreaterThan(0)
    })

    it('should handle fetch errors with retries', async () => {
      let attempts = 0
      const fetchFunctions = {
        failingData: async () => {
          attempts++
          if (attempts < 3) {
            throw new Error('Temporary failure')
          }
          return 'success'
        }
      }

      const results = await fetcher.fetchInParallel(fetchFunctions, { retries: 2 })

      expect(results.failingData.data).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should timeout long-running operations', async () => {
      const fetchFunctions = {
        slowData: async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return 'slow-result'
        }
      }

      const results = await fetcher.fetchInParallel(fetchFunctions, { timeout: 50 })

      expect(results.slowData.error).toBeDefined()
      expect(results.slowData.error?.message).toContain('Timeout')
    })
  })

  describe('DatabaseQueryOptimizer', () => {
    let optimizer: DatabaseQueryOptimizer

    beforeEach(() => {
      optimizer = new DatabaseQueryOptimizer()
      vi.clearAllMocks()
    })

    it('should record query metrics', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])

      await optimizer.getOptimizedInvestments()

      const metrics = optimizer.getQueryMetrics()
      expect(metrics.length).toBe(1)
      expect(metrics[0].query).toBe('getOptimizedInvestments')
      expect(metrics[0].duration).toBeGreaterThan(0)
    })

    it('should identify slow queries', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return []
      })

      await optimizer.getOptimizedInvestments()

      const slowQueries = optimizer.getSlowQueries(40)
      expect(slowQueries.length).toBe(1)
    })

    it('should calculate average query times', async () => {
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])

      // Execute multiple queries
      await optimizer.getOptimizedInvestments()
      await optimizer.getOptimizedInvestments()

      const averageTime = optimizer.getAverageQueryTime('getOptimizedInvestments')
      expect(averageTime).toBeGreaterThan(0)
    })
  })

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor

    beforeEach(() => {
      monitor = new PerformanceMonitor()
    })

    it('should track operation performance', async () => {
      const stopTimer = monitor.startTimer('test-operation')
      await new Promise(resolve => setTimeout(resolve, 10))
      stopTimer()

      const metrics = monitor.getMetrics({ name: 'test-operation' })
      expect(metrics.length).toBe(1)
      expect(metrics[0].duration).toBeGreaterThan(0)
    })

    it('should track page generation metrics', () => {
      monitor.trackPageGeneration('test-page', 100, 50, true)

      const pageMetrics = monitor.getPageMetrics({ pageName: 'test-page' })
      expect(pageMetrics.length).toBe(1)
      expect(pageMetrics[0].totalDuration).toBe(150)
      expect(pageMetrics[0].cacheHit).toBe(true)
    })

    it('should calculate performance statistics', () => {
      monitor.trackPageGeneration('page1', 100, 50, true)
      monitor.trackPageGeneration('page2', 200, 100, false)

      const summary = monitor.getPerformanceSummary()
      expect(summary.totalRequests).toBe(2)
      expect(summary.averagePageLoadTime).toBe(175)
      expect(summary.cacheHitRate).toBe(50)
    })

    it('should identify slow pages', () => {
      monitor.trackPageGeneration('fast-page', 50, 25, true)
      monitor.trackPageGeneration('slow-page', 2000, 1000, false)

      const slowPages = monitor.getSlowPages(1000)
      expect(slowPages.length).toBe(1)
      expect(slowPages[0].pageName).toBe('slow-page')
    })
  })

  describe('OptimizedDataPreparator', () => {
    class TestPreparator extends OptimizedDataPreparator<{ data: string; timestamp: Date }> {
      constructor() {
        super({
          cacheKey: 'test-data',
          pageName: 'test-page',
          cacheType: 'list'
        })
      }

      protected async fetchFreshData(): Promise<{ data: string; timestamp: Date }> {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { data: 'fresh-data', timestamp: new Date() }
      }

      protected async getFallbackData(): Promise<{ data: string; timestamp: Date }> {
        return { data: 'fallback-data', timestamp: new Date() }
      }
    }

    let preparator: TestPreparator

    beforeEach(() => {
      preparator = new TestPreparator()
    })

    it('should cache and return data', async () => {
      const result1 = await preparator.prepare()
      const result2 = await preparator.prepare()

      expect(result1.data).toBe('fresh-data')
      expect(result2.data).toBe('fresh-data')
      // Second call should be faster due to caching
    })

    it('should return fallback data on error', async () => {
      // Override fetchFreshData to throw error
      preparator['fetchFreshData'] = async () => {
        throw new Error('Test error')
      }

      const result = await preparator.prepare()
      expect(result.data).toBe('fallback-data')
    })

    it('should provide performance statistics', async () => {
      await preparator.prepare()

      const stats = preparator.getPerformanceStats()
      expect(stats.cache).toBeDefined()
      expect(stats.performance).toBeDefined()
    })
  })

  describe('PreparatorPerformanceMonitor', () => {
    it('should provide overall statistics', () => {
      const stats = PreparatorPerformanceMonitor.getOverallStats()
      
      expect(stats.performance).toBeDefined()
      expect(stats.cache).toBeDefined()
      expect(stats.queries).toBeDefined()
    })

    it('should start and stop periodic reporting', () => {
      const stopReporting = PreparatorPerformanceMonitor.startPeriodicReporting(100)
      expect(typeof stopReporting).toBe('function')
      
      // Should not throw when stopping
      expect(() => stopReporting()).not.toThrow()
    })
  })
})