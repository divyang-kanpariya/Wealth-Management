import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  PricingError,
  APIRateLimitError,
  APITimeoutError,
  DataNotFoundError,
  StaleDataError,
  rateLimiter,
  executeWithRetry,
  executeWithTimeout,
  StaleDataFallbackHandler,
  UserFriendlyErrorHandler,
  fetchPriceWithEnhancedErrorHandling,
  batchFetchWithErrorHandling,
  checkPricingServiceHealth,
  ERROR_HANDLING_CONFIG
} from '@/lib/pricing-error-handler'
import { PrismaClient } from '@prisma/client'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    priceCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn()
    },
    priceHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn()
    }
  }))
}))

// Mock fetch globally
global.fetch = vi.fn()

const mockPrisma = new PrismaClient() as any

describe('Enhanced Pricing Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Error Classes', () => {
    it('should create PricingError with correct properties', () => {
      const originalError = new Error('Network error')
      const error = new PricingError('Price fetch failed', 'FETCH_FAILED', 'RELIANCE', originalError, true)

      expect(error.name).toBe('PricingError')
      expect(error.message).toBe('Price fetch failed')
      expect(error.code).toBe('FETCH_FAILED')
      expect(error.symbol).toBe('RELIANCE')
      expect(error.originalError).toBe(originalError)
      expect(error.retryable).toBe(true)
    })

    it('should create APIRateLimitError with reset time', () => {
      const resetTime = new Date()
      const error = new APIRateLimitError('Rate limit exceeded', resetTime, 'RELIANCE')

      expect(error.name).toBe('APIRateLimitError')
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(error.resetTime).toBe(resetTime)
      expect(error.retryable).toBe(true)
    })

    it('should create APITimeoutError', () => {
      const error = new APITimeoutError('Request timed out', 'RELIANCE')

      expect(error.name).toBe('APITimeoutError')
      expect(error.code).toBe('API_TIMEOUT')
      expect(error.retryable).toBe(true)
    })

    it('should create DataNotFoundError as non-retryable', () => {
      const error = new DataNotFoundError('Symbol not found', 'INVALID')

      expect(error.name).toBe('DataNotFoundError')
      expect(error.code).toBe('DATA_NOT_FOUND')
      expect(error.retryable).toBe(false)
    })

    it('should create StaleDataError with age', () => {
      const error = new StaleDataError('Using stale data', 'RELIANCE', 3600000)

      expect(error.name).toBe('StaleDataError')
      expect(error.code).toBe('STALE_DATA')
      expect(error.age).toBe(3600000)
      expect(error.retryable).toBe(false)
    })
  })

  describe('Rate Limiter', () => {
    it('should allow requests within rate limits', async () => {
      await expect(rateLimiter.checkRateLimit('GOOGLE_SCRIPT')).resolves.not.toThrow()
    })

    it('should throw rate limit error when burst limit exceeded', async () => {
      const limits = ERROR_HANDLING_CONFIG.rateLimits.GOOGLE_SCRIPT

      // Exhaust burst limit
      for (let i = 0; i < limits.burstLimit; i++) {
        await rateLimiter.checkRateLimit('GOOGLE_SCRIPT')
      }

      await expect(rateLimiter.checkRateLimit('GOOGLE_SCRIPT'))
        .rejects.toThrow(APIRateLimitError)
    })

    it('should provide rate limit status', () => {
      const status = rateLimiter.getRateLimitStatus('GOOGLE_SCRIPT')

      expect(status).toHaveProperty('minute')
      expect(status).toHaveProperty('hour')
      expect(status).toHaveProperty('burst')
      expect(status.minute.remaining).toBeGreaterThanOrEqual(0)
      expect(status.hour.remaining).toBeGreaterThanOrEqual(0)
      expect(status.burst.remaining).toBeGreaterThanOrEqual(0)
    })

    it('should reset counters after time window', async () => {
      const limits = ERROR_HANDLING_CONFIG.rateLimits.GOOGLE_SCRIPT

      // Exhaust burst limit
      for (let i = 0; i < limits.burstLimit; i++) {
        await rateLimiter.checkRateLimit('GOOGLE_SCRIPT')
      }

      // Should throw rate limit error
      await expect(rateLimiter.checkRateLimit('GOOGLE_SCRIPT'))
        .rejects.toThrow(APIRateLimitError)

      // Fast forward time to reset burst window
      vi.advanceTimersByTime(11000) // 11 seconds

      // Should allow requests again
      await expect(rateLimiter.checkRateLimit('GOOGLE_SCRIPT')).resolves.not.toThrow()
    })
  })

  describe('Retry Mechanism', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await executeWithRetry(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      const result = await executeWithRetry(operation, { maxRetries: 3 })

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'))

      await expect(executeWithRetry(operation, { maxRetries: 2 }))
        .rejects.toThrow(PricingError)

      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(
        new DataNotFoundError('Symbol not found', 'INVALID')
      )

      await expect(executeWithRetry(operation))
        .rejects.toThrow(DataNotFoundError)

      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should use exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success')

      const promise = executeWithRetry(operation, { 
        maxRetries: 3, 
        baseDelay: 1000,
        multiplier: 2
      })

      // First retry after 1000ms
      vi.advanceTimersByTime(1000)
      await Promise.resolve()

      // Second retry after 2000ms
      vi.advanceTimersByTime(2000)
      await Promise.resolve()

      const result = await promise
      expect(result).toBe('success')
    })
  })

  describe('Timeout Mechanism', () => {
    it('should complete operation within timeout', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await executeWithTimeout(operation, 5000)

      expect(result).toBe('success')
    })

    it('should throw timeout error when operation takes too long', async () => {
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      )

      const promise = executeWithTimeout(operation, 5000)

      vi.advanceTimersByTime(5000)

      await expect(promise).rejects.toThrow(APITimeoutError)
    })
  })

  describe('Stale Data Fallback Handler', () => {
    it('should return cached price with age information', async () => {
      const mockCachedData = {
        symbol: 'RELIANCE',
        price: 2500,
        source: 'GOOGLE_SCRIPT',
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }

      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(mockCachedData)

      const result = await StaleDataFallbackHandler.getCachedPriceWithAge('RELIANCE')

      expect(result).toEqual({
        price: 2500,
        source: 'GOOGLE_SCRIPT',
        age: expect.any(Number),
        isFresh: true,
        isStale: false,
        isExpired: false
      })
    })

    it('should identify stale data correctly', async () => {
      const mockCachedData = {
        symbol: 'RELIANCE',
        price: 2500,
        source: 'GOOGLE_SCRIPT',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      }

      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(mockCachedData)

      const result = await StaleDataFallbackHandler.getCachedPriceWithAge('RELIANCE')

      expect(result?.isFresh).toBe(false)
      expect(result?.isStale).toBe(true)
      expect(result?.isExpired).toBe(false)
    })

    it('should identify expired data correctly', async () => {
      const mockCachedData = {
        symbol: 'RELIANCE',
        price: 2500,
        source: 'GOOGLE_SCRIPT',
        lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      }

      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(mockCachedData)

      const result = await StaleDataFallbackHandler.getCachedPriceWithAge('RELIANCE')

      expect(result?.isFresh).toBe(false)
      expect(result?.isStale).toBe(false)
      expect(result?.isExpired).toBe(true)
    })

    it('should calculate historical average price', async () => {
      const mockHistoricalData = [
        { price: 2500 },
        { price: 2600 },
        { price: 2400 },
        { price: 2550 }
      ]

      vi.mocked(mockPrisma.priceHistory.findMany).mockResolvedValue(mockHistoricalData)

      const result = await StaleDataFallbackHandler.getHistoricalAveragePrice('RELIANCE')

      expect(result).toBe(2512.5) // Average of the prices
    })

    it('should provide comprehensive fallback with fresh data', async () => {
      const mockCachedData = {
        symbol: 'RELIANCE',
        price: 2500,
        source: 'GOOGLE_SCRIPT',
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }

      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(mockCachedData)

      const result = await StaleDataFallbackHandler.getPriceWithFallback('RELIANCE')

      expect(result).toEqual({
        price: 2500,
        source: 'GOOGLE_SCRIPT',
        fallbackLevel: 'none',
        confidence: 'high',
        age: expect.any(Number),
        warnings: []
      })
    })

    it('should use historical average when no cache available', async () => {
      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(null)
      vi.mocked(mockPrisma.priceHistory.findMany).mockResolvedValue([
        { price: 2500 },
        { price: 2600 }
      ])

      const result = await StaleDataFallbackHandler.getPriceWithFallback('RELIANCE')

      expect(result).toEqual({
        price: 2550, // Average
        source: 'HISTORICAL_AVERAGE',
        fallbackLevel: 'historical',
        confidence: 'low',
        warnings: ['Using historical average price (external APIs unavailable)']
      })
    })
  })

  describe('User Friendly Error Handler', () => {
    it('should generate user-friendly message for rate limit error', () => {
      const error = new APIRateLimitError('Rate limit exceeded')
      const result = UserFriendlyErrorHandler.getErrorMessage(error, 'RELIANCE')

      expect(result.userMessage).toContain('temporarily busy')
      expect(result.severity).toBe('low')
      expect(result.actionable).toBe(true)
      expect(result.suggestedActions).toContain('Wait a few minutes and try again')
    })

    it('should generate user-friendly message for timeout error', () => {
      const error = new APITimeoutError('Request timed out')
      const result = UserFriendlyErrorHandler.getErrorMessage(error, 'RELIANCE')

      expect(result.userMessage).toContain('taking longer than usual')
      expect(result.severity).toBe('medium')
      expect(result.suggestedActions).toContain('Check your internet connection')
    })

    it('should generate user-friendly message for data not found error', () => {
      const error = new DataNotFoundError('Symbol not found', 'INVALID')
      const result = UserFriendlyErrorHandler.getErrorMessage(error, 'INVALID')

      expect(result.userMessage).toContain('not available for INVALID')
      expect(result.severity).toBe('high')
      expect(result.actionable).toBe(false)
      expect(result.suggestedActions).toContain('Verify the symbol is correct')
    })

    it('should format error for UI correctly', () => {
      const error = new StaleDataError('Using stale data')
      const result = UserFriendlyErrorHandler.formatErrorForUI(error, 'RELIANCE')

      expect(result.title).toBe('Using Cached Data')
      expect(result.type).toBe('info')
      expect(result.actions).toBeInstanceOf(Array)
    })
  })

  describe('Enhanced Price Fetching', () => {
    it('should fetch price with enhanced error handling', async () => {
      const mockFetchFunction = vi.fn().mockResolvedValue(2500)

      const result = await fetchPriceWithEnhancedErrorHandling(
        'RELIANCE',
        mockFetchFunction,
        'GOOGLE_SCRIPT'
      )

      expect(result.price).toBe(2500)
      expect(result.source).toBe('GOOGLE_SCRIPT')
      expect(result.cached).toBe(false)
      expect(result.fallbackUsed).toBe(false)
      expect(result.confidence).toBe('high')
    })

    it('should use cached data when available and not forcing refresh', async () => {
      const mockCachedData = {
        symbol: 'RELIANCE',
        price: 2500,
        source: 'GOOGLE_SCRIPT',
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }

      vi.mocked(mockPrisma.priceCache.findUnique).mockResolvedValue(mockCachedData)

      const mockFetchFunction = vi.fn()

      const result = await fetchPriceWithEnhancedErrorHandling(
        'RELIANCE',
        mockFetchFunction,
        'GOOGLE_SCRIPT',
        false // Don't force refresh
      )

      expect(result.cached).toBe(true)
      expect(result.fallbackUsed).toBe(false)
      expect(mockFetchFunction).not.toHaveBeenCalled()
    })

    it('should handle rate limit errors gracefully', async () => {
      const mockFetchFunction = vi.fn().mockRejectedValue(
        new APIRateLimitError('Rate limit exceeded')
      )

      await expect(fetchPriceWithEnhancedErrorHandling(
        'RELIANCE',
        mockFetchFunction,
        'GOOGLE_SCRIPT'
      )).rejects.toThrow(APIRateLimitError)
    })
  })

  describe('Batch Error Handling', () => {
    it('should handle batch operations with mixed success/failure', async () => {
      const symbols = ['RELIANCE', 'INFY', 'INVALID']
      const fetchFunction = vi.fn()
        .mockResolvedValueOnce(2500) // RELIANCE success
        .mockResolvedValueOnce(1500) // INFY success
        .mockRejectedValueOnce(new DataNotFoundError('Not found', 'INVALID')) // INVALID failure

      const result = await batchFetchWithErrorHandling(
        symbols,
        fetchFunction,
        { continueOnError: true }
      )

      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.summary.successRate).toBe(66.66666666666666)
    })

    it('should stop on first error when continueOnError is false', async () => {
      const symbols = ['RELIANCE', 'INVALID', 'INFY']
      const fetchFunction = vi.fn()
        .mockResolvedValueOnce(2500) // RELIANCE success
        .mockRejectedValueOnce(new Error('Network error')) // INVALID failure

      await expect(batchFetchWithErrorHandling(
        symbols,
        fetchFunction,
        { continueOnError: false }
      )).rejects.toThrow()

      expect(fetchFunction).toHaveBeenCalledTimes(2) // Should stop after failure
    })
  })

  describe('Service Health Check', () => {
    it('should report healthy status when all services are up', async () => {
      // Mock successful responses
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true } as Response) // Google Script
        .mockResolvedValueOnce({ ok: true } as Response) // AMFI

      vi.mocked(mockPrisma.priceCache.count).mockResolvedValue(100)

      const result = await checkPricingServiceHealth()

      expect(result.status).toBe('healthy')
      expect(result.services.googleScript.status).toBe('up')
      expect(result.services.amfi.status).toBe('up')
      expect(result.services.database.status).toBe('up')
    })

    it('should report degraded status when some services are down', async () => {
      // Mock mixed responses
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true } as Response) // Google Script up
        .mockRejectedValueOnce(new Error('Network error')) // AMFI down

      vi.mocked(mockPrisma.priceCache.count).mockResolvedValue(100)

      const result = await checkPricingServiceHealth()

      expect(result.status).toBe('degraded')
      expect(result.services.googleScript.status).toBe('up')
      expect(result.services.amfi.status).toBe('down')
      expect(result.services.database.status).toBe('up')
    })

    it('should report unhealthy status when all services are down', async () => {
      // Mock all failures
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network error')) // Google Script down
        .mockRejectedValueOnce(new Error('Network error')) // AMFI down

      vi.mocked(mockPrisma.priceCache.count).mockRejectedValue(new Error('DB error'))

      const result = await checkPricingServiceHealth()

      expect(result.status).toBe('unhealthy')
      expect(result.services.googleScript.status).toBe('down')
      expect(result.services.amfi.status).toBe('down')
      expect(result.services.database.status).toBe('down')
    })

    it('should include rate limit information in health check', async () => {
      // Mock successful responses
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce({ ok: true } as Response)

      vi.mocked(mockPrisma.priceCache.count).mockResolvedValue(100)

      const result = await checkPricingServiceHealth()

      expect(result.rateLimits).toHaveProperty('googleScript')
      expect(result.rateLimits).toHaveProperty('amfi')
      expect(result.rateLimits.googleScript).toHaveProperty('minute')
      expect(result.rateLimits.googleScript).toHaveProperty('hour')
      expect(result.rateLimits.googleScript).toHaveProperty('burst')
    })
  })
})