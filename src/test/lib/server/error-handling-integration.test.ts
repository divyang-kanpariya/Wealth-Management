import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  ServerErrorLogger,
  withErrorHandling,
  withGracefulDegradation,
  DataPreparationError,
  DatabaseError,
  ExternalServiceError
} from '@/lib/server/error-handling'
import { errorMonitor } from '@/lib/server/error-monitoring'
import { createDataPreparatorErrorHandler } from '@/lib/server/data-preparators/error-handling'

describe('Error Handling Integration', () => {
  let logger: ServerErrorLogger
  let consoleErrorSpy: any
  let consoleWarnSpy: any

  beforeEach(() => {
    logger = ServerErrorLogger.getInstance()
    logger.clearBuffer()
    errorMonitor.reset()
    
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('ServerErrorLogger', () => {
    it('should log errors with enhanced context', () => {
      const error = new Error('Test error')
      const context = {
        operation: 'test-operation',
        timestamp: new Date(),
        metadata: { test: true }
      }

      logger.logError(error, context)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ServerError]',
        expect.objectContaining({
          message: 'Test error',
          environment: 'test',
          nodeVersion: process.version,
          platform: process.platform
        })
      )
    })

    it('should track error statistics', () => {
      const error1 = new DataPreparationError('Error 1', {
        operation: 'test-op-1',
        timestamp: new Date()
      })
      const error2 = new DatabaseError('Error 2', {
        operation: 'test-op-2',
        timestamp: new Date()
      })

      logger.logError(error1)
      logger.logError(error2)

      const stats = logger.getErrorStats()
      expect(stats.totalErrors).toBe(2)
      expect(stats.errorsByType['DATA_PREPARATION_ERROR']).toBe(1)
      expect(stats.errorsByType['DATABASE_ERROR']).toBe(1)
    })

    it('should log performance issues', () => {
      logger.logPerformanceIssue('slow-operation', 6000, 5000)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[PERFORMANCE WARNING]',
        expect.objectContaining({
          operation: 'slow-operation',
          duration: 6000,
          threshold: 5000,
          severity: 'MEDIUM'
        })
      )
    })
  })

  describe('withErrorHandling', () => {
    it('should execute operation successfully', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      const result = await withErrorHandling(operation, context)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledOnce()
    })

    it('should use fallback on error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Primary failed'))
      const fallback = vi.fn().mockResolvedValue('fallback-result')
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      const result = await withErrorHandling(operation, context, fallback)

      expect(result).toBe('fallback-result')
      expect(operation).toHaveBeenCalledOnce()
      expect(fallback).toHaveBeenCalledOnce()
    })

    it('should classify errors correctly', async () => {
      const databaseError = new Error('ECONNREFUSED database connection')
      const operation = vi.fn().mockRejectedValue(databaseError)
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      await expect(withErrorHandling(operation, context)).rejects.toThrow(DatabaseError)
    })
  })

  describe('Error Monitor Integration', () => {
    it('should track response times', async () => {
      const operation = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('result'), 100))
      )
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      await withErrorHandling(operation, context)

      const metrics = errorMonitor.getErrorMetrics()
      expect(metrics.averageResponseTime).toBeGreaterThan(0)
    })

    it('should perform health checks', async () => {
      const healthCheck = await errorMonitor.performHealthCheck()

      expect(healthCheck).toHaveProperty('status')
      expect(healthCheck).toHaveProperty('timestamp')
      expect(healthCheck).toHaveProperty('checks')
      expect(healthCheck.checks).toHaveProperty('database')
      expect(healthCheck.checks).toHaveProperty('priceServices')
      expect(healthCheck.checks).toHaveProperty('calculations')
      expect(healthCheck.checks).toHaveProperty('cache')
    })

    it('should generate system alerts', () => {
      // Simulate high error rate
      for (let i = 0; i < 10; i++) {
        logger.logError(new Error(`Error ${i}`), {
          operation: 'test-operation',
          timestamp: new Date()
        })
      }

      const alerts = errorMonitor.getSystemAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts.some(alert => alert.level === 'critical')).toBe(true)
    })
  })

  describe('DataPreparatorErrorHandler', () => {
    it('should handle successful operations', async () => {
      const errorHandler = createDataPreparatorErrorHandler('TestPreparator')
      const operation = vi.fn().mockResolvedValue({ data: 'test' })
      const fallback = vi.fn().mockResolvedValue({ data: 'fallback' })

      const result = await errorHandler.executeWithFallback(
        operation,
        fallback,
        'testOperation'
      )

      expect(result.data).toEqual({ data: 'test' })
      expect(result.hasErrors).toBe(false)
      expect(result.degradedData).toBe(false)
    })

    it('should use fallback on primary failure', async () => {
      const errorHandler = createDataPreparatorErrorHandler('TestPreparator')
      const operation = vi.fn().mockRejectedValue(new Error('Primary failed'))
      const fallback = vi.fn().mockResolvedValue({ data: 'fallback' })

      const result = await errorHandler.executeWithFallback(
        operation,
        fallback,
        'testOperation'
      )

      expect(result.data).toEqual({ data: 'fallback' })
      expect(result.hasErrors).toBe(true)
      expect(result.degradedData).toBe(true)
      expect(result.errorMessages).toContain('Primary failed')
    })

    it('should handle parallel operations with partial failures', async () => {
      const errorHandler = createDataPreparatorErrorHandler('TestPreparator')
      const operations = {
        operation1: vi.fn().mockResolvedValue('success1'),
        operation2: vi.fn().mockRejectedValue(new Error('Failed')),
        operation3: vi.fn().mockResolvedValue('success3')
      }
      const fallbacks = {
        operation2: vi.fn().mockResolvedValue('fallback2')
      }

      const result = await errorHandler.executeParallel(
        operations,
        'parallelTest',
        fallbacks
      )

      expect(result.data.operation1).toBe('success1')
      expect(result.data.operation2).toBe('fallback2')
      expect(result.data.operation3).toBe('success3')
      expect(result.hasErrors).toBe(true)
      expect(result.degradedData).toBe(true)
    })

    it('should handle safe calculations', async () => {
      const errorHandler = createDataPreparatorErrorHandler('TestPreparator')
      const calculation = vi.fn().mockImplementation(() => {
        throw new Error('Calculation failed')
      })
      const fallback = vi.fn().mockReturnValue(42)

      const result = await errorHandler.safeCalculation(
        calculation,
        'testCalculation',
        fallback
      )

      expect(result).toBe(42)
      expect(calculation).toHaveBeenCalledOnce()
      expect(fallback).toHaveBeenCalledOnce()
    })
  })

  describe('Graceful Degradation', () => {
    it('should return primary result when successful', async () => {
      const primary = vi.fn().mockResolvedValue('primary-result')
      const fallback = vi.fn().mockResolvedValue('fallback-result')
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      const result = await withGracefulDegradation(primary, fallback, context)

      expect(result).toBe('primary-result')
      expect(primary).toHaveBeenCalledOnce()
      expect(fallback).not.toHaveBeenCalled()
    })

    it('should return fallback result on primary failure', async () => {
      const primary = vi.fn().mockRejectedValue(new Error('Primary failed'))
      const fallback = vi.fn().mockResolvedValue('fallback-result')
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      const result = await withGracefulDegradation(primary, fallback, context)

      expect(result).toBe('fallback-result')
      expect(primary).toHaveBeenCalledOnce()
      expect(fallback).toHaveBeenCalledOnce()
    })
  })
})