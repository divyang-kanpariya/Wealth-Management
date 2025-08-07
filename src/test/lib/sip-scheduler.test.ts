import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  startSIPScheduler,
  stopSIPScheduler,
  getSIPSchedulerStatus,
  updateSIPSchedulerConfig,
  runManualSIPProcessing,
  runManualSIPRetry,
  runManualSIPCleanup,
  initializeSIPScheduler,
  shutdownSIPScheduler
} from '@/lib/sip-scheduler'
import * as sipProcessor from '@/lib/sip-processor'

// Mock SIP processor functions
vi.mock('@/lib/sip-processor', () => ({
  processSIPBatch: vi.fn(),
  retryFailedSIPTransactions: vi.fn(),
  cleanupOldFailedTransactions: vi.fn(),
}))

// Mock timers
vi.useFakeTimers()

describe('SIP Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Stop any running schedulers before each test
    stopSIPScheduler()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    stopSIPScheduler()
    vi.clearAllTimers()
  })

  describe('startSIPScheduler', () => {
    it('should start scheduler with default configuration', () => {
      startSIPScheduler()

      const status = getSIPSchedulerStatus()
      expect(status.running).toBe(true)
      expect(status.config.enableProcessing).toBe(true)
      expect(status.config.enableRetry).toBe(true)
      expect(status.config.enableCleanup).toBe(true)
      expect(status.schedulers.processing.running).toBe(true)
      expect(status.schedulers.retry.running).toBe(true)
      expect(status.schedulers.cleanup.running).toBe(true)
    })

    it('should start scheduler with custom configuration', () => {
      const customConfig = {
        processingIntervalMs: 60000, // 1 minute
        retryIntervalMs: 120000, // 2 minutes
        cleanupIntervalMs: 300000, // 5 minutes
        enableProcessing: true,
        enableRetry: false,
        enableCleanup: true,
      }

      startSIPScheduler(customConfig)

      const status = getSIPSchedulerStatus()
      expect(status.running).toBe(true)
      expect(status.config.processingIntervalMs).toBe(60000)
      expect(status.config.retryIntervalMs).toBe(120000)
      expect(status.config.cleanupIntervalMs).toBe(300000)
      expect(status.schedulers.processing.running).toBe(true)
      expect(status.schedulers.retry.running).toBe(false)
      expect(status.schedulers.cleanup.running).toBe(true)
    })

    it('should not start disabled schedulers', () => {
      const config = {
        enableProcessing: false,
        enableRetry: false,
        enableCleanup: false,
      }

      startSIPScheduler(config)

      const status = getSIPSchedulerStatus()
      expect(status.running).toBe(false)
      expect(status.schedulers.processing.running).toBe(false)
      expect(status.schedulers.retry.running).toBe(false)
      expect(status.schedulers.cleanup.running).toBe(false)
    })
  })

  describe('stopSIPScheduler', () => {
    it('should stop all running schedulers', () => {
      startSIPScheduler()
      expect(getSIPSchedulerStatus().running).toBe(true)

      stopSIPScheduler()
      expect(getSIPSchedulerStatus().running).toBe(false)
    })

    it('should handle stopping when no schedulers are running', () => {
      expect(() => stopSIPScheduler()).not.toThrow()
      expect(getSIPSchedulerStatus().running).toBe(false)
    })
  })

  describe('updateSIPSchedulerConfig', () => {
    it('should update configuration and restart schedulers', () => {
      startSIPScheduler()
      expect(getSIPSchedulerStatus().config.processingIntervalMs).toBe(24 * 60 * 60 * 1000)

      const newConfig = {
        processingIntervalMs: 60000,
        enableRetry: false,
      }

      updateSIPSchedulerConfig(newConfig)

      const status = getSIPSchedulerStatus()
      expect(status.config.processingIntervalMs).toBe(60000)
      expect(status.schedulers.retry.running).toBe(false)
    })
  })

  describe('runManualSIPProcessing', () => {
    it('should run manual processing successfully', async () => {
      const mockResult = {
        totalProcessed: 5,
        successful: 4,
        failed: 1,
        results: [],
        processingTime: 1000,
      }

      vi.mocked(sipProcessor.processSIPBatch).mockResolvedValue(mockResult)

      const result = await runManualSIPProcessing()

      expect(result.success).toBe(true)
      expect(result.result).toEqual(mockResult)
      expect(sipProcessor.processSIPBatch).toHaveBeenCalledWith(expect.any(Date))
    })

    it('should run manual processing for specific date', async () => {
      const mockResult = {
        totalProcessed: 3,
        successful: 3,
        failed: 0,
        results: [],
        processingTime: 500,
      }

      vi.mocked(sipProcessor.processSIPBatch).mockResolvedValue(mockResult)

      const targetDate = new Date('2024-01-15')
      const result = await runManualSIPProcessing(targetDate)

      expect(result.success).toBe(true)
      expect(sipProcessor.processSIPBatch).toHaveBeenCalledWith(targetDate)
    })

    it('should handle processing errors', async () => {
      vi.mocked(sipProcessor.processSIPBatch).mockRejectedValue(
        new Error('Processing failed')
      )

      const result = await runManualSIPProcessing()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Processing failed')
    })
  })

  describe('runManualSIPRetry', () => {
    it('should run manual retry successfully', async () => {
      const mockResult = {
        totalProcessed: 2,
        successful: 1,
        failed: 1,
        results: [],
        processingTime: 800,
      }

      vi.mocked(sipProcessor.retryFailedSIPTransactions).mockResolvedValue(mockResult)

      const result = await runManualSIPRetry()

      expect(result.success).toBe(true)
      expect(result.result).toEqual(mockResult)
      expect(sipProcessor.retryFailedSIPTransactions).toHaveBeenCalled()
    })

    it('should handle retry errors', async () => {
      vi.mocked(sipProcessor.retryFailedSIPTransactions).mockRejectedValue(
        new Error('Retry failed')
      )

      const result = await runManualSIPRetry()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Retry failed')
    })
  })

  describe('runManualSIPCleanup', () => {
    it('should run manual cleanup successfully', async () => {
      vi.mocked(sipProcessor.cleanupOldFailedTransactions).mockResolvedValue(10)

      const result = await runManualSIPCleanup()

      expect(result.success).toBe(true)
      expect(result.result).toBe(10)
      expect(sipProcessor.cleanupOldFailedTransactions).toHaveBeenCalled()
    })

    it('should handle cleanup errors', async () => {
      vi.mocked(sipProcessor.cleanupOldFailedTransactions).mockRejectedValue(
        new Error('Cleanup failed')
      )

      const result = await runManualSIPCleanup()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cleanup failed')
    })
  })

  describe('scheduled functions', () => {
    it('should execute scheduled processing', async () => {
      const mockResult = {
        totalProcessed: 3,
        successful: 3,
        failed: 0,
        results: [],
        processingTime: 1200,
      }

      vi.mocked(sipProcessor.processSIPBatch).mockResolvedValue(mockResult)

      startSIPScheduler({
        processingIntervalMs: 1000,
        enableRetry: false,
        enableCleanup: false,
      })

      // Fast-forward time to trigger the scheduled function
      await vi.advanceTimersByTimeAsync(1000)

      expect(sipProcessor.processSIPBatch).toHaveBeenCalled()
    })

    it('should execute scheduled retry', async () => {
      const mockResult = {
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [],
        processingTime: 600,
      }

      vi.mocked(sipProcessor.retryFailedSIPTransactions).mockResolvedValue(mockResult)

      startSIPScheduler({
        retryIntervalMs: 1000,
        enableProcessing: false,
        enableCleanup: false,
      })

      // Fast-forward time to trigger the scheduled function
      await vi.advanceTimersByTimeAsync(1000)

      expect(sipProcessor.retryFailedSIPTransactions).toHaveBeenCalled()
    })

    it('should execute scheduled cleanup', async () => {
      vi.mocked(sipProcessor.cleanupOldFailedTransactions).mockResolvedValue(5)

      startSIPScheduler({
        cleanupIntervalMs: 1000,
        enableProcessing: false,
        enableRetry: false,
      })

      // Fast-forward time to trigger the scheduled function
      await vi.advanceTimersByTimeAsync(1000)

      expect(sipProcessor.cleanupOldFailedTransactions).toHaveBeenCalled()
    })

    it('should handle scheduled function errors gracefully', async () => {
      vi.mocked(sipProcessor.processSIPBatch).mockRejectedValue(
        new Error('Scheduled processing failed')
      )

      startSIPScheduler({
        processingIntervalMs: 1000,
        enableRetry: false,
        enableCleanup: false,
      })

      // Should not throw error
      await expect(vi.advanceTimersByTimeAsync(1000)).resolves.toBeUndefined()
    })
  })

  describe('initializeSIPScheduler', () => {
    it('should initialize scheduler with default config', () => {
      initializeSIPScheduler()

      const status = getSIPSchedulerStatus()
      expect(status.running).toBe(true)
    })

    it('should run initial processing check', async () => {
      const mockResult = {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: [],
        processingTime: 100,
      }

      vi.mocked(sipProcessor.processSIPBatch).mockResolvedValue(mockResult)

      initializeSIPScheduler()

      // Fast-forward to trigger initial processing
      await vi.advanceTimersByTimeAsync(5000)

      expect(sipProcessor.processSIPBatch).toHaveBeenCalled()
    })
  })

  describe('shutdownSIPScheduler', () => {
    it('should gracefully shutdown scheduler', () => {
      startSIPScheduler()
      expect(getSIPSchedulerStatus().running).toBe(true)

      shutdownSIPScheduler()
      expect(getSIPSchedulerStatus().running).toBe(false)
    })
  })

  describe('getSIPSchedulerStatus', () => {
    it('should return correct status when not running', () => {
      const status = getSIPSchedulerStatus()

      expect(status.running).toBe(false)
      expect(status.schedulers.processing.running).toBe(false)
      expect(status.schedulers.retry.running).toBe(false)
      expect(status.schedulers.cleanup.running).toBe(false)
    })

    it('should return correct status when running', () => {
      startSIPScheduler()
      const status = getSIPSchedulerStatus()

      expect(status.running).toBe(true)
      expect(status.schedulers.processing.running).toBe(true)
      expect(status.schedulers.retry.running).toBe(true)
      expect(status.schedulers.cleanup.running).toBe(true)
    })

    it('should return correct configuration', () => {
      const customConfig = {
        processingIntervalMs: 30000,
        retryIntervalMs: 60000,
        cleanupIntervalMs: 120000,
      }

      startSIPScheduler(customConfig)
      const status = getSIPSchedulerStatus()

      expect(status.config.processingIntervalMs).toBe(30000)
      expect(status.config.retryIntervalMs).toBe(60000)
      expect(status.config.cleanupIntervalMs).toBe(120000)
    })
  })
})