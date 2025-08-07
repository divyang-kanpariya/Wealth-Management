import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/sips/process/route'
import * as sipProcessor from '@/lib/sip-processor'
import * as sipScheduler from '@/lib/sip-scheduler'

// Mock the SIP processor and scheduler modules
vi.mock('@/lib/sip-processor', () => ({
  getSIPsDueForProcessing: vi.fn(),
  getSIPProcessingStats: vi.fn(),
  processSIPBatch: vi.fn(),
}))

vi.mock('@/lib/sip-scheduler', () => ({
  runManualSIPProcessing: vi.fn(),
  runManualSIPRetry: vi.fn(),
  getSIPSchedulerStatus: vi.fn(),
}))

// Helper function to create mock NextRequest
function createMockRequest(url: string, method: string = 'GET', body?: any): NextRequest {
  const request = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
  return request
}

describe('/api/sips/process', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return SIPs due for processing', async () => {
      const mockSIPs = [
        {
          id: 'sip-1',
          name: 'HDFC Top 100 SIP',
          symbol: '120716',
          amount: 5000,
          frequency: 'MONTHLY',
          account: { name: 'HDFC Securities' },
          goal: { name: 'Retirement Fund' },
        },
      ]

      vi.mocked(sipProcessor.getSIPsDueForProcessing).mockResolvedValue(mockSIPs as any)

      const request = createMockRequest('http://localhost:3000/api/sips/process?action=due&date=2024-01-15')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.date).toBe('2024-01-15')
      expect(data.count).toBe(1)
      expect(data.sips).toHaveLength(1)
      expect(data.sips[0].name).toBe('HDFC Top 100 SIP')
      expect(sipProcessor.getSIPsDueForProcessing).toHaveBeenCalledWith(new Date('2024-01-15'))
    })

    it('should return processing statistics', async () => {
      const mockStats = {
        totalTransactions: 100,
        successfulTransactions: 95,
        failedTransactions: 5,
        totalAmount: 500000,
        totalUnits: 5000,
        averageNAV: 100,
        uniqueSIPs: 20,
        processingSuccessRate: 95,
      }

      vi.mocked(sipProcessor.getSIPProcessingStats).mockResolvedValue(mockStats)

      const request = createMockRequest('http://localhost:3000/api/sips/process?action=stats&startDate=2024-01-01&endDate=2024-01-31')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockStats)
      expect(sipProcessor.getSIPProcessingStats).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )
    })

    it('should return scheduler status', async () => {
      const mockStatus = {
        running: true,
        config: {
          processingIntervalMs: 86400000,
          retryIntervalMs: 14400000,
          cleanupIntervalMs: 604800000,
          enableProcessing: true,
          enableRetry: true,
          enableCleanup: true,
        },
        schedulers: {
          processing: { running: true, intervalMs: 86400000 },
          retry: { running: true, intervalMs: 14400000 },
          cleanup: { running: true, intervalMs: 604800000 },
        },
      }

      vi.mocked(sipScheduler.getSIPSchedulerStatus).mockReturnValue(mockStatus)

      const request = createMockRequest('http://localhost:3000/api/sips/process?action=scheduler')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockStatus)
    })

    it('should return error for invalid action', async () => {
      const request = createMockRequest('http://localhost:3000/api/sips/process?action=invalid')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action. Use: due, stats, or scheduler')
    })

    it('should handle processing errors', async () => {
      vi.mocked(sipProcessor.getSIPsDueForProcessing).mockRejectedValue(
        new Error('Database error')
      )

      const request = createMockRequest('http://localhost:3000/api/sips/process?action=due')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve SIP processing information')
    })
  })

  describe('POST', () => {
    it('should process SIPs successfully', async () => {
      const mockResult = {
        totalProcessed: 5,
        successful: 4,
        failed: 1,
        results: [],
        processingTime: 1000,
      }

      vi.mocked(sipScheduler.runManualSIPProcessing).mockResolvedValue({
        success: true,
        result: mockResult,
      })

      const request = createMockRequest('http://localhost:3000/api/sips/process', 'POST', {
        action: 'process',
        date: '2024-01-15',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('SIP processing completed successfully')
      expect(data.result).toEqual(mockResult)
      expect(sipScheduler.runManualSIPProcessing).toHaveBeenCalledWith(new Date('2024-01-15'))
    })

    it('should retry failed transactions successfully', async () => {
      const mockResult = {
        totalProcessed: 3,
        successful: 2,
        failed: 1,
        results: [],
        processingTime: 800,
      }

      vi.mocked(sipScheduler.runManualSIPRetry).mockResolvedValue({
        success: true,
        result: mockResult,
      })

      const request = createMockRequest('http://localhost:3000/api/sips/process', 'POST', {
        action: 'retry',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('SIP retry completed successfully')
      expect(data.result).toEqual(mockResult)
    })

    it('should process SIPs in batch mode', async () => {
      const mockResult = {
        totalProcessed: 10,
        successful: 9,
        failed: 1,
        results: [],
        processingTime: 2000,
      }

      vi.mocked(sipProcessor.processSIPBatch).mockResolvedValue(mockResult)

      const request = createMockRequest('http://localhost:3000/api/sips/process', 'POST', {
        action: 'batch',
        date: '2024-01-15',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('SIP batch processing completed')
      expect(data.result).toEqual(mockResult)
      expect(sipProcessor.processSIPBatch).toHaveBeenCalledWith(new Date('2024-01-15'))
    })

    it('should handle processing failures', async () => {
      vi.mocked(sipScheduler.runManualSIPProcessing).mockResolvedValue({
        success: false,
        error: 'Processing failed',
      })

      const request = createMockRequest('http://localhost:3000/api/sips/process', 'POST', {
        action: 'process',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Processing failed')
    })

    it('should handle retry failures', async () => {
      vi.mocked(sipScheduler.runManualSIPRetry).mockResolvedValue({
        success: false,
        error: 'Retry failed',
      })

      const request = createMockRequest('http://localhost:3000/api/sips/process', 'POST', {
        action: 'retry',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Retry failed')
    })

    it('should return error for invalid action', async () => {
      const request = createMockRequest('http://localhost:3000/api/sips/process', 'POST', {
        action: 'invalid',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action. Use: process, retry, or batch')
    })

    it('should handle request parsing errors', async () => {
      const request = createMockRequest('http://localhost:3000/api/sips/process', 'POST')
      // Mock JSON parsing to fail
      vi.spyOn(request, 'json').mockRejectedValue(new Error('Invalid JSON'))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to process SIP request')
    })

    it('should use current date when no date provided', async () => {
      const mockResult = {
        totalProcessed: 2,
        successful: 2,
        failed: 0,
        results: [],
        processingTime: 500,
      }

      vi.mocked(sipScheduler.runManualSIPProcessing).mockResolvedValue({
        success: true,
        result: mockResult,
      })

      const request = createMockRequest('http://localhost:3000/api/sips/process', 'POST', {
        action: 'process',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(sipScheduler.runManualSIPProcessing).toHaveBeenCalledWith(expect.any(Date))
    })
  })
})