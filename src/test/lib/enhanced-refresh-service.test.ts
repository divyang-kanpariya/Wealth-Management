/**
 * Tests for Enhanced Refresh Service
 * 
 * This test suite verifies the enhanced refresh functionality including:
 * - Real-time progress tracking
 * - Better error handling and fallbacks
 * - Immediate API calls with database updates
 * - Detailed refresh status and results
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RealTimeRefreshService } from '@/lib/server/refresh-service'

// Mock the price-fetcher module
vi.mock('@/lib/price-fetcher', () => ({
  batchGetPrices: vi.fn(),
  updatePriceCache: vi.fn(),
  getAllTrackedSymbols: vi.fn()
}))

describe('RealTimeRefreshService', () => {
  let service: RealTimeRefreshService
  
  beforeEach(() => {
    service = RealTimeRefreshService.getInstance()
    vi.clearAllMocks()
    // Clear all active refreshes before each test
    service.cleanupOldRefreshes()
    // Force clear all refreshes by accessing private property
    ;(service as any).activeRefreshes.clear()
  })

  afterEach(() => {
    // Clean up any active refreshes
    service.cleanupOldRefreshes()
    ;(service as any).activeRefreshes.clear()
  })

  describe('startRefresh', () => {
    it('should start a refresh operation and return request ID', async () => {
      const { batchGetPrices, getAllTrackedSymbols } = await import('@/lib/price-fetcher')
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE', 'INFY'])
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500, error: undefined },
        { symbol: 'INFY', price: 1500, error: undefined }
      ])

      const requestId = await service.startRefresh()
      
      expect(requestId).toBeDefined()
      expect(requestId).toMatch(/^refresh_\d+_[a-z0-9]+$/)
      
      const status = service.getRefreshStatus(requestId)
      expect(status).toBeDefined()
      expect(['pending', 'in-progress']).toContain(status?.status)
      expect(status?.progress.total).toBe(2)
    })

    it('should handle symbols filtering correctly', async () => {
      const { getAllTrackedSymbols } = await import('@/lib/price-fetcher')
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE', 'INFY', '123456'])

      const requestId = await service.startRefresh({
        includeStocks: true,
        includeMutualFunds: false
      })
      
      const status = service.getRefreshStatus(requestId)
      expect(status?.progress.total).toBe(2) // Only stocks, no mutual funds
    })

    it('should use provided symbols when specified', async () => {
      const symbols = ['RELIANCE', 'INFY']
      const requestId = await service.startRefresh({ symbols })
      
      const status = service.getRefreshStatus(requestId)
      expect(status?.progress.total).toBe(2)
    })
  })

  describe('getRefreshStatus', () => {
    it('should return null for non-existent request ID', () => {
      const status = service.getRefreshStatus('non-existent-id')
      expect(status).toBeNull()
    })

    it('should return status for valid request ID', async () => {
      const { getAllTrackedSymbols } = await import('@/lib/price-fetcher')
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE'])

      const requestId = await service.startRefresh()
      const status = service.getRefreshStatus(requestId)
      
      expect(status).toBeDefined()
      expect(status?.requestId).toBe(requestId)
      expect(['pending', 'in-progress']).toContain(status?.status)
    })
  })

  describe('cancelRefresh', () => {
    it('should cancel an in-progress refresh', async () => {
      const { getAllTrackedSymbols, batchGetPrices } = await import('@/lib/price-fetcher')
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE'])
      vi.mocked(batchGetPrices).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return [{ symbol: 'RELIANCE', price: 2500, error: undefined }]
      })

      const requestId = await service.startRefresh()
      
      // Wait for it to be in progress
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const cancelled = service.cancelRefresh(requestId)
      expect(cancelled).toBe(true)
      
      // Wait a bit more for the status to update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const status = service.getRefreshStatus(requestId)
      expect(status?.status).toBe('cancelled')
    })

    it('should return false for non-existent request ID', () => {
      const cancelled = service.cancelRefresh('non-existent-id')
      expect(cancelled).toBe(false)
    })
  })

  describe('getActiveRefreshes', () => {
    it('should return only active refreshes', async () => {
      const { getAllTrackedSymbols } = await import('@/lib/price-fetcher')
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE'])

      const requestId1 = await service.startRefresh()
      const requestId2 = await service.startRefresh()
      
      const activeRefreshes = service.getActiveRefreshes()
      expect(activeRefreshes).toHaveLength(2)
      expect(activeRefreshes.map(r => r.requestId)).toContain(requestId1)
      expect(activeRefreshes.map(r => r.requestId)).toContain(requestId2)
    })

    it('should not return completed refreshes', async () => {
      const { getAllTrackedSymbols, batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE'])
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500, error: undefined }
      ])

      const requestId = await service.startRefresh()
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const activeRefreshes = service.getActiveRefreshes()
      expect(activeRefreshes).toHaveLength(0)
    })
  })

  describe('progress tracking', () => {
    it('should track progress correctly during refresh', async () => {
      const { getAllTrackedSymbols, batchGetPrices, updatePriceCache } = await import('@/lib/price-fetcher')
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE', 'INFY'])
      vi.mocked(batchGetPrices).mockImplementation(async (symbols) => {
        // Simulate slow API call
        await new Promise(resolve => setTimeout(resolve, 500))
        return symbols.map(symbol => ({ symbol, price: 2500, error: undefined }))
      })
      vi.mocked(updatePriceCache).mockResolvedValue()

      const requestId = await service.startRefresh({ batchSize: 1 })
      
      // Check initial status
      let status = service.getRefreshStatus(requestId)
      expect(status?.progress.completed).toBe(0)
      expect(status?.progress.percentage).toBe(0)
      
      // Wait for some progress
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      status = service.getRefreshStatus(requestId)
      expect(status?.progress.completed).toBeGreaterThan(0)
      expect(status?.progress.percentage).toBeGreaterThan(0)
    })

    it('should handle batch processing correctly', async () => {
      const { getAllTrackedSymbols, batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE', 'INFY', '123456', '789012'])
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500, error: undefined },
        { symbol: 'INFY', price: 1500, error: undefined },
        { symbol: '123456', price: 100, error: undefined },
        { symbol: '789012', price: 200, error: undefined }
      ])

      const requestId = await service.startRefresh({ batchSize: 2 })
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const status = service.getRefreshStatus(requestId)
      expect(status?.status).toBe('completed')
      expect(status?.results?.success).toBe(4)
      expect(status?.results?.failed).toBe(0)
    })
  })

  describe('error handling', () => {
    it('should handle API failures gracefully', async () => {
      const { getAllTrackedSymbols, batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE'])
      vi.mocked(batchGetPrices).mockRejectedValue(new Error('API failure'))

      const requestId = await service.startRefresh()
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const status = service.getRefreshStatus(requestId)
      expect(status?.status).toBe('completed') // Should complete even with errors
      expect(status?.results?.failed).toBe(1)
      expect(status?.results?.success).toBe(0)
    })

    it('should handle timeout correctly', async () => {
      const { getAllTrackedSymbols, batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE'])
      vi.mocked(batchGetPrices).mockImplementation(async () => {
        // Simulate timeout
        await new Promise(resolve => setTimeout(resolve, 35000))
        return [{ symbol: 'RELIANCE', price: 2500, error: undefined }]
      })

      const requestId = await service.startRefresh({ timeout: 1000 })
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const status = service.getRefreshStatus(requestId)
      expect(status?.results?.failed).toBe(1)
    })

    it('should handle cache update failures', async () => {
      const { getAllTrackedSymbols, batchGetPrices, updatePriceCache } = await import('@/lib/price-fetcher')
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE'])
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500, error: undefined }
      ])
      vi.mocked(updatePriceCache).mockRejectedValue(new Error('Cache update failed'))

      const requestId = await service.startRefresh()
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const status = service.getRefreshStatus(requestId)
      // Should still count as success since we got the price, just failed to cache
      expect(status?.results?.success).toBe(1)
      expect(status?.results?.failed).toBe(0)
      expect(status?.results?.results[0].error).toContain('Cache update failed')
    })
  })

  describe('cleanup', () => {
    it('should clean up old completed refreshes', async () => {
      const { getAllTrackedSymbols, batchGetPrices } = await import('@/lib/price-fetcher')
      
      vi.mocked(getAllTrackedSymbols).mockResolvedValue(['RELIANCE'])
      vi.mocked(batchGetPrices).mockResolvedValue([
        { symbol: 'RELIANCE', price: 2500, error: undefined }
      ])

      const requestId = await service.startRefresh()
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Manually set old timestamp
      const status = service.getRefreshStatus(requestId)
      if (status) {
        status.endTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
      
      service.cleanupOldRefreshes()
      
      const statusAfterCleanup = service.getRefreshStatus(requestId)
      expect(statusAfterCleanup).toBeNull()
    })
  })
})

describe('quickRefresh utility function', () => {
  it('should perform quick refresh and return results', async () => {
    const { quickRefresh } = await import('@/lib/server/refresh-service')
    const { batchGetPrices, updatePriceCache } = await import('@/lib/price-fetcher')
    
    vi.mocked(batchGetPrices).mockResolvedValue([
      { symbol: 'RELIANCE', price: 2500, error: undefined }
    ])
    vi.mocked(updatePriceCache).mockResolvedValue()

    const result = await quickRefresh(['RELIANCE'])
    
    expect(result.success).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.results).toHaveLength(1)
    expect(result.results[0].symbol).toBe('RELIANCE')
    expect(result.results[0].success).toBe(true)
  })

  it('should handle quick refresh timeout', async () => {
    const { quickRefresh } = await import('@/lib/server/refresh-service')
    const { batchGetPrices } = await import('@/lib/price-fetcher')
    
    vi.mocked(batchGetPrices).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds
      return [{ symbol: 'RELIANCE', price: 2500, error: undefined }]
    })

    // Mock the quickRefresh to have a shorter timeout for testing
    const service = (await import('@/lib/server/refresh-service')).RealTimeRefreshService.getInstance()
    const originalStartRefresh = service.startRefresh.bind(service)
    
    vi.spyOn(service, 'startRefresh').mockImplementation(async (options) => {
      return originalStartRefresh({ ...options, timeout: 500 }) // 500ms timeout
    })

    const result = await quickRefresh(['RELIANCE'])
    
    // Should complete with failures due to timeout
    expect(result.success).toBe(0)
    expect(result.failed).toBe(1)
    expect(result.results[0].error).toContain('timeout')
  }, 5000) // 5 second test timeout
})