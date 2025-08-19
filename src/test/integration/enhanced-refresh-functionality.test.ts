/**
 * Enhanced Refresh Functionality Integration Tests
 * 
 * This test suite verifies the enhanced refresh functionality including
 * real-time progress tracking, better error handling, and immediate UI feedback.
 * 
 * Requirements tested:
 * - 3.1: Manual refresh triggers immediate API calls
 * - 3.2: Real-time progress feedback
 * - 3.3: Enhanced error handling and user feedback
 * - 4.3: Performance under various conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RealTimeRefreshService, quickRefresh } from '@/lib/server/refresh-service'
import { refreshDashboard } from '@/lib/server/actions/dashboard'
import { prisma } from '@/lib/prisma'

// Mock external dependencies
vi.mock('@/lib/price-fetcher', async () => {
  const actual = await vi.importActual('@/lib/price-fetcher')
  return {
    ...actual,
    batchGetPrices: vi.fn(),
    batchGetMutualFundNAVs: vi.fn(),
    updatePriceCache: vi.fn(),
    getAllTrackedSymbols: vi.fn()
  }
})

describe('Enhanced Refresh Functionality Integration Tests', () => {
  let refreshService: RealTimeRefreshService
  let testSymbols: string[]

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    refreshService = RealTimeRefreshService.getInstance()
    testSymbols = ['RELIANCE', 'INFY', 'TCS', '120503', '120716']

    // Clean up any existing refreshes
    refreshService.cleanupOldRefreshes()
    ;(refreshService as any).activeRefreshes.clear()

    // Clean up test data
    await prisma.priceCache.deleteMany({
      where: {
        symbol: { in: testSymbols }
      }
    })

    // Mock getAllTrackedSymbols
    const { getAllTrackedSymbols } = await import('@/lib/price-fetcher')
    vi.mocked(getAllTrackedSymbols).mockResolvedValue(testSymbols)
  })

  afterEach(async () => {
    vi.useRealTimers()
    refreshService.cleanupOldRefreshes()
    ;(refreshService as any).activeRefreshes.clear()
    
    // Clean up test data
    await prisma.priceCache.deleteMany({
      where: {
        symbol: { in: testSymbols }
      }
    })
  })

  describe('Real-Time Progress Tracking', () => {
    it('should provide real-time progress updates during refresh', async () => {
      const { batchGetPrices, batchGetMutualFundNAVs, updatePriceCache } = await import('@/lib/price-fetcher')
      
      // Mock slow API responses to test progress tracking
      vi.mocked(batchGetPrices).mockImplementation(async (symbols) => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return symbols.map(symbol => ({ symbol, price: Math.random() * 1000 }))
      })
      
      vi.mocked(batchGetMutualFundNAVs).mockImplementation(async (symbols) => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return symbols.map(schemeCode => ({ schemeCode, nav: Math.random() * 100 }))
      })
      
      vi.mocked(updatePriceCache).mockResolvedValue()

      const requestId = await refreshService.startRefresh({ batchSize: 2 })
      
      // Check initial status
      let status = refreshService.getRefreshStatus(requestId)
      expect(status?.status).toBe('pending')
      expect(status?.progress.completed).toBe(0)
      expect(status?.progress.percentage).toBe(0)
      expect(status?.progress.total).toBe(5)

      // Advance time to start processing
      vi.advanceTimersByTime(100)
      await vi.runAllTimersAsync()

      // Check in-progress status
      status = refreshService.getRefreshStatus(requestId)
      expect(['pending', 'in-progress']).toContain(status?.status)

      // Advance time to complete processing
      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()

      // Check final status
      status = refreshService.getRefreshStatus(requestId)
      expect(status?.status).toBe('completed')
      expect(status?.progress.completed).toBe(5)
      expect(status?.progress.percentage).toBe(100)
      expect(status?.endTime).toBeDefined()
      expect(status?.results?.success).toBe(5)
    })

    it('should track progress correctly with mixed symbol types', async () => {
      const { batchGetPrices, batchGetMutualFundNAVs } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500 },
        { symbol: 'INFY', price: 1500 },
        { symbol: 'TCS', price: 3500 }
      ])
      
      vi.mocked(batchGetMutualFundNAVs).mockResolvedValue([
        { schemeCode: '120503', nav: 45.67 },
        { schemeCode: '120716', nav: 58.45 }
      ])

      const requestId = await refreshService.startRefresh()
      
      // Wait for completion
      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()

      const status = refreshService.getRefreshStatus(requestId)
      expect(status?.status).toBe('completed')
      expect(status?.progress.completed).toBe(5)
      expect(status?.results?.success).toBe(5)
      expect(status?.results?.failed).toBe(0)

      // Verify results contain both stocks and mutual funds
      const results = status?.results?.results || []
      const stockResults = results.filter(r => ['RELIANCE', 'INFY', 'TCS'].includes(r.symbol))
      const mfResults = results.filter(r => ['120503', '120716'].includes(r.symbol))
      
      expect(stockResults).toHaveLength(3)
      expect(mfResults).toHaveLength(2)
      expect(stockResults.every(r => r.success)).toBe(true)
      expect(mfResults.every(r => r.success)).toBe(true)
    })

    it('should handle progress tracking with partial failures', async () => {
      const { batchGetPrices, batchGetMutualFundNAVs } = await import('@/lib/price-fetcher')
      
      // Mock partial success
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500 },
        { symbol: 'INFY', price: null, error: 'Price not available' },
        { symbol: 'TCS', price: 3500 }
      ])
      
      vi.mocked(batchGetMutualFundNAVs).mockRejectedValue(new Error('AMFI API down'))

      const requestId = await refreshService.startRefresh()
      
      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()

      const status = refreshService.getRefreshStatus(requestId)
      expect(status?.status).toBe('completed')
      expect(status?.progress.completed).toBe(5)
      expect(status?.results?.success).toBe(2) // Only RELIANCE and TCS
      expect(status?.results?.failed).toBe(3) // INFY + 2 mutual funds
    })
  })

  describe('Enhanced Error Handling', () => {
    it('should provide user-friendly error messages', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      // Mock different types of errors
      vi.mocked(batchGetPrices).mockRejectedValue(new Error('Network timeout'))

      const requestId = await refreshService.startRefresh({ symbols: ['RELIANCE'] })
      
      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()

      const status = refreshService.getRefreshStatus(requestId)
      expect(status?.status).toBe('completed')
      expect(status?.results?.failed).toBe(1)
      
      const result = status?.results?.results[0]
      expect(result?.success).toBe(false)
      expect(result?.error).toBeDefined()
      expect(result?.userFriendlyError).toBeDefined()
      expect(result?.userFriendlyError).not.toContain('Network timeout') // Should be user-friendly
    })

    it('should handle timeout scenarios gracefully', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      // Mock very slow response
      vi.mocked(batchGetPrices).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds
        return [{ symbol: 'RELIANCE', price: 2500 }]
      })

      const requestId = await refreshService.startRefresh({ 
        symbols: ['RELIANCE'],
        timeout: 1000 // 1 second timeout
      })
      
      // Advance time past timeout
      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()

      const status = refreshService.getRefreshStatus(requestId)
      expect(status?.results?.failed).toBe(1)
      
      const result = status?.results?.results[0]
      expect(result?.error).toContain('timeout')
    })

    it('should handle API rate limit errors with retry', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      let callCount = 0
      vi.mocked(batchGetPrices).mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          const error = new Error('Rate limit exceeded')
          ;(error as any).status = 429
          throw error
        }
        return [{ symbol: 'RELIANCE', price: 2500 }]
      })

      const requestId = await refreshService.startRefresh({ symbols: ['RELIANCE'] })
      
      vi.advanceTimersByTime(5000) // Allow time for retry
      await vi.runAllTimersAsync()

      const status = refreshService.getRefreshStatus(requestId)
      expect(status?.results?.success).toBe(1)
      expect(batchGetPrices).toHaveBeenCalledTimes(2) // Original + retry
    })

    it('should provide detailed error information for debugging', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockRejectedValue(new Error('Detailed API error message'))

      const requestId = await refreshService.startRefresh({ symbols: ['RELIANCE'] })
      
      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()

      const status = refreshService.getRefreshStatus(requestId)
      const result = status?.results?.results[0]
      
      expect(result?.error).toContain('Detailed API error message')
      expect(result?.timestamp).toBeDefined()
      expect(result?.retryCount).toBeDefined()
    })
  })

  describe('Refresh Cancellation', () => {
    it('should cancel in-progress refresh operations', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      // Mock slow response
      vi.mocked(batchGetPrices).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000))
        return [{ symbol: 'RELIANCE', price: 2500 }]
      })

      const requestId = await refreshService.startRefresh({ symbols: ['RELIANCE'] })
      
      // Start processing
      vi.advanceTimersByTime(100)
      await vi.runAllTimersAsync()

      // Cancel the refresh
      const cancelled = refreshService.cancelRefresh(requestId)
      expect(cancelled).toBe(true)

      // Advance time
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      const status = refreshService.getRefreshStatus(requestId)
      expect(status?.status).toBe('cancelled')
    })

    it('should not cancel completed refresh operations', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockResolvedValue([{ symbol: 'RELIANCE', price: 2500 }])

      const requestId = await refreshService.startRefresh({ symbols: ['RELIANCE'] })
      
      // Wait for completion
      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()

      // Try to cancel completed refresh
      const cancelled = refreshService.cancelRefresh(requestId)
      expect(cancelled).toBe(false)

      const status = refreshService.getRefreshStatus(requestId)
      expect(status?.status).toBe('completed')
    })
  })

  describe('Dashboard Refresh Integration', () => {
    it('should integrate with dashboard refresh action', async () => {
      const { batchGetPrices, batchGetMutualFundNAVs } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500 },
        { symbol: 'INFY', price: 1500 }
      ])
      
      vi.mocked(batchGetMutualFundNAVs).mockResolvedValue([
        { schemeCode: '120503', nav: 45.67 }
      ])

      const result = await refreshDashboard()
      
      expect(result.success).toBe(true)
      expect(result.data?.refreshedSymbols).toBeGreaterThan(0)
      expect(result.data?.refreshTime).toBeDefined()
    })

    it('should handle dashboard refresh errors gracefully', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockRejectedValue(new Error('API unavailable'))

      const result = await refreshDashboard()
      
      // Should not fail completely, but report partial success
      expect(result.success).toBe(true) // Dashboard refresh should be resilient
      expect(result.data?.errors).toBeDefined()
      expect(result.data?.errors?.length).toBeGreaterThan(0)
    })
  })

  describe('Quick Refresh Utility', () => {
    it('should perform quick refresh for specific symbols', async () => {
      const { batchGetPrices, updatePriceCache } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500 },
        { symbol: 'INFY', price: 1500 }
      ])
      vi.mocked(updatePriceCache).mockResolvedValue()

      const result = await quickRefresh(['RELIANCE', 'INFY'])
      
      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].symbol).toBe('RELIANCE')
      expect(result.results[0].success).toBe(true)
      expect(result.results[0].price).toBe(2500)
    })

    it('should handle quick refresh timeout', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)) // 10 seconds
        return [{ symbol: 'RELIANCE', price: 2500 }]
      })

      const result = await quickRefresh(['RELIANCE'])
      
      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.results[0].error).toContain('timeout')
    })
  })

  describe('Concurrent Refresh Operations', () => {
    it('should handle multiple concurrent refresh requests', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockImplementation(async (symbols) => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return symbols.map(symbol => ({ symbol, price: Math.random() * 1000 }))
      })

      // Start multiple concurrent refreshes
      const requestIds = await Promise.all([
        refreshService.startRefresh({ symbols: ['RELIANCE'] }),
        refreshService.startRefresh({ symbols: ['INFY'] }),
        refreshService.startRefresh({ symbols: ['TCS'] })
      ])

      expect(requestIds).toHaveLength(3)
      expect(new Set(requestIds).size).toBe(3) // All should be unique

      // Wait for completion
      vi.advanceTimersByTime(2000)
      await vi.runAllTimersAsync()

      // All should complete successfully
      requestIds.forEach(requestId => {
        const status = refreshService.getRefreshStatus(requestId)
        expect(status?.status).toBe('completed')
        expect(status?.results?.success).toBe(1)
      })
    })

    it('should limit concurrent refresh operations', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return [{ symbol: 'TEST', price: 100 }]
      })

      // Try to start many concurrent refreshes
      const requestPromises = Array.from({ length: 10 }, () =>
        refreshService.startRefresh({ symbols: ['TEST'] })
      )

      const requestIds = await Promise.all(requestPromises)
      const activeRefreshes = refreshService.getActiveRefreshes()

      // Should limit concurrent operations (exact limit depends on implementation)
      expect(activeRefreshes.length).toBeLessThanOrEqual(5) // Assuming max 5 concurrent
    })
  })

  describe('Performance Monitoring', () => {
    it('should track refresh performance metrics', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500 }
      ])

      const requestId = await refreshService.startRefresh({ symbols: ['RELIANCE'] })
      
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      const status = refreshService.getRefreshStatus(requestId)
      
      expect(status?.startTime).toBeDefined()
      expect(status?.endTime).toBeDefined()
      expect(status?.duration).toBeGreaterThan(0)
      expect(status?.results?.results[0].responseTime).toBeGreaterThan(0)
    })

    it('should handle high-frequency refresh requests efficiently', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500 }
      ])

      const startTime = Date.now()
      
      // Perform multiple quick refreshes
      const results = await Promise.all(
        Array.from({ length: 5 }, () => quickRefresh(['RELIANCE']))
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(1)
        expect(result.failed).toBe(0)
      })

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000) // Less than 5 seconds

      console.log(`5 quick refreshes completed in ${duration}ms`)
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should clean up old refresh records automatically', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500 }
      ])

      // Create multiple completed refreshes
      const requestIds = []
      for (let i = 0; i < 5; i++) {
        const requestId = await refreshService.startRefresh({ symbols: ['RELIANCE'] })
        requestIds.push(requestId)
        
        vi.advanceTimersByTime(1000)
        await vi.runAllTimersAsync()
      }

      // All should be completed
      requestIds.forEach(requestId => {
        const status = refreshService.getRefreshStatus(requestId)
        expect(status?.status).toBe('completed')
      })

      // Manually trigger cleanup
      refreshService.cleanupOldRefreshes()

      // Old refreshes should be cleaned up (implementation dependent)
      const activeRefreshes = refreshService.getActiveRefreshes()
      expect(activeRefreshes.length).toBe(0) // All completed refreshes should be cleaned
    })

    it('should not leak memory with frequent refresh operations', async () => {
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500 }
      ])

      const initialMemory = process.memoryUsage().heapUsed

      // Perform many refresh operations
      for (let i = 0; i < 20; i++) {
        await quickRefresh(['RELIANCE'])
        
        // Periodic cleanup
        if (i % 5 === 0) {
          refreshService.cleanupOldRefreshes()
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // Less than 5MB
    })
  })
})