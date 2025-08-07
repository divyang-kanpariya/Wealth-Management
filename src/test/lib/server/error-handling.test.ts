import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  ServerError, 
  DataPreparationError, 
  DatabaseError, 
  ExternalServiceError,
  ValidationError,
  ServerErrorLogger,
  withErrorHandling,
  withRetry,
  withGracefulDegradation
} from '@/lib/server/error-handling'

describe('Server Error Handling', () => {
  let mockConsoleError: any
  let mockConsoleLog: any

  beforeEach(() => {
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('ServerError Classes', () => {
    it('should create ServerError with correct properties', () => {
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }
      
      const error = new ServerError('Test error', 'TEST_ERROR', context, {
        isRetryable: true,
        statusCode: 503
      })

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.context).toBe(context)
      expect(error.isRetryable).toBe(true)
      expect(error.statusCode).toBe(503)
    })

    it('should create DataPreparationError with correct defaults', () => {
      const context = {
        operation: 'prepare-data',
        timestamp: new Date()
      }
      
      const error = new DataPreparationError('Data prep failed', context)

      expect(error.code).toBe('DATA_PREPARATION_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.isRetryable).toBe(false)
    })

    it('should create DatabaseError with retryable flag', () => {
      const context = {
        operation: 'db-query',
        timestamp: new Date()
      }
      
      const error = new DatabaseError('DB connection failed', context)

      expect(error.code).toBe('DATABASE_ERROR')
      expect(error.statusCode).toBe(503)
      expect(error.isRetryable).toBe(true)
    })

    it('should create ExternalServiceError with retryable flag', () => {
      const context = {
        operation: 'api-call',
        timestamp: new Date()
      }
      
      const error = new ExternalServiceError('API call failed', context)

      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR')
      expect(error.statusCode).toBe(502)
      expect(error.isRetryable).toBe(true)
    })

    it('should create ValidationError as non-retryable', () => {
      const context = {
        operation: 'validate-input',
        timestamp: new Date()
      }
      
      const error = new ValidationError('Invalid input', context)

      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.isRetryable).toBe(false)
    })
  })

  describe('ServerErrorLogger', () => {
    it('should be a singleton', () => {
      const logger1 = ServerErrorLogger.getInstance()
      const logger2 = ServerErrorLogger.getInstance()
      
      expect(logger1).toBe(logger2)
    })

    it('should log errors with context', () => {
      const logger = ServerErrorLogger.getInstance()
      const error = new Error('Test error')
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      logger.logError(error, context)

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ServerError]',
        expect.anything()
      )
      
      // Verify the logger was called
      expect(mockConsoleError).toHaveBeenCalledTimes(1)
    })

    it('should log performance issues for slow operations', () => {
      const logger = ServerErrorLogger.getInstance()
      const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      logger.logPerformanceIssue('slow-operation', 6000, 5000)

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[PERFORMANCE WARNING]',
        expect.objectContaining({
          operation: 'slow-operation',
          duration: 6000,
          threshold: 5000
        })
      )

      mockConsoleWarn.mockRestore()
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

    it('should use fallback when operation fails and error is retryable', async () => {
      const operation = vi.fn().mockRejectedValue(new DatabaseError('DB failed', {
        operation: 'db-query',
        timestamp: new Date()
      }))
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

    it('should throw error when no fallback is provided', async () => {
      const error = new DataPreparationError('Prep failed', {
        operation: 'prepare-data',
        timestamp: new Date()
      })
      const operation = vi.fn().mockRejectedValue(error)
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      await expect(withErrorHandling(operation, context)).rejects.toThrow(error)
    })
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await withRetry(operation, 3, 100)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success')

      const result = await withRetry(operation, 3, 10)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should throw last error after max retries', async () => {
      const error = new Error('All attempts failed')
      const operation = vi.fn().mockRejectedValue(error)

      await expect(withRetry(operation, 2, 10)).rejects.toThrow(error)
      expect(operation).toHaveBeenCalledTimes(2)
    })
  })

  describe('withGracefulDegradation', () => {
    it('should return primary operation result when successful', async () => {
      const primaryOperation = vi.fn().mockResolvedValue('primary-result')
      const fallbackOperation = vi.fn().mockResolvedValue('fallback-result')
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      const result = await withGracefulDegradation(
        primaryOperation,
        fallbackOperation,
        context
      )

      expect(result).toBe('primary-result')
      expect(primaryOperation).toHaveBeenCalledOnce()
      expect(fallbackOperation).not.toHaveBeenCalled()
    })

    it('should return fallback result when primary fails', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new Error('Primary failed'))
      const fallbackOperation = vi.fn().mockResolvedValue('fallback-result')
      const context = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      const result = await withGracefulDegradation(
        primaryOperation,
        fallbackOperation,
        context
      )

      expect(result).toBe('fallback-result')
      expect(primaryOperation).toHaveBeenCalledOnce()
      expect(fallbackOperation).toHaveBeenCalledOnce()
    })
  })
})