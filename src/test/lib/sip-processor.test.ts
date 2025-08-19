import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  processSIPTransaction,
  processSIPTransactionWithRetry,
  getSIPsDueForProcessing,
  processSIPBatch,
  calculateSIPAverageNAV,
  getSIPTransactionAuditTrail,
  getSIPProcessingStats,
  retryFailedSIPTransactions,
  cleanupOldFailedTransactions
} from '@/lib/sip-processor'
import { SIP } from '@/types'
import * as priceFetcher from '@/lib/price-fetcher'

// Mock Prisma client
const mockPrisma = {
  sIP: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  sIPTransaction: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    delete: vi.fn(),
  },
} as any

// Mock price fetcher
vi.mock('@/lib/price-fetcher', () => ({
  getPriceWithFallback: vi.fn(),
}))

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock SIP data
const mockSIP: SIP = {
  id: 'sip-1',
  name: 'HDFC Top 100 SIP',
  symbol: '120716',
  amount: 5000,
  frequency: 'MONTHLY',
  startDate: new Date('2024-01-01'),
  status: 'ACTIVE',
  accountId: 'account-1',
  goalId: 'goal-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  account: {
    id: 'account-1',
    name: 'HDFC Securities',
    type: 'DEMAT',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  goal: {
    id: 'goal-1',
    name: 'Retirement Fund',
    targetAmount: 1000000,
    targetDate: new Date('2030-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

const mockTransaction = {
  id: 'txn-1',
  sipId: 'sip-1',
  amount: 5000,
  nav: 100,
  units: 50,
  transactionDate: new Date(),
  status: 'COMPLETED',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('SIP Transaction Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('processSIPTransaction', () => {
    it('should successfully process a SIP transaction', async () => {
      // Mock price fetching
      vi.mocked(priceFetcher.getPriceWithFallback).mockResolvedValue({
        price: 100,
        source: 'GOOGLE_SCRIPT',
        cached: false,
        fallbackUsed: false,
      })

      // Mock transaction creation
      mockPrisma.sIPTransaction.create.mockResolvedValue(mockTransaction)

      const result = await processSIPTransaction(mockSIP)

      expect(result.success).toBe(true)
      expect(result.sipId).toBe('sip-1')
      expect(result.amount).toBe(5000)
      expect(result.nav).toBe(100)
      expect(result.units).toBe(50)
      expect(result.transactionId).toBe('txn-1')

      expect(priceFetcher.getPriceWithFallback).toHaveBeenCalledWith('120716', false)
      expect(mockPrisma.sIPTransaction.create).toHaveBeenCalledWith({
        data: {
          sipId: 'sip-1',
          amount: 5000,
          nav: 100,
          units: 50,
          transactionDate: expect.any(Date),
          status: 'COMPLETED',
        },
      })
    })

    it('should handle inactive SIP', async () => {
      const inactiveSIP = { ...mockSIP, status: 'PAUSED' as const }

      const result = await processSIPTransaction(inactiveSIP)

      expect(result.success).toBe(false)
      expect(result.error).toContain('SIP is not active')
      expect(mockPrisma.sIPTransaction.create).toHaveBeenCalledWith({
        data: {
          sipId: 'sip-1',
          amount: 5000,
          nav: 0,
          units: 0,
          transactionDate: expect.any(Date),
          status: 'FAILED',
          errorMessage: 'SIP is not active. Current status: PAUSED',
        },
      })
    })

    it('should handle SIP that has reached end date', async () => {
      const endedSIP = { ...mockSIP, endDate: new Date('2023-12-31') }
      mockPrisma.sIP.update.mockResolvedValue({ ...endedSIP, status: 'COMPLETED' })

      const result = await processSIPTransaction(endedSIP, new Date('2024-01-15'))

      expect(result.success).toBe(false)
      expect(result.error).toContain('SIP has reached its end date')
      expect(mockPrisma.sIP.update).toHaveBeenCalledWith({
        where: { id: 'sip-1' },
        data: { status: 'COMPLETED' },
      })
    })

    it('should handle price fetching failure', async () => {
      vi.mocked(priceFetcher.getPriceWithFallback).mockRejectedValue(
        new Error('Price fetch failed')
      )

      const result = await processSIPTransaction(mockSIP)

      expect(result.success).toBe(false)
      expect(result.error).toBe('NAV fetch failed')
      expect(mockPrisma.sIPTransaction.create).toHaveBeenCalledWith({
        data: {
          sipId: 'sip-1',
          amount: 5000,
          nav: 0,
          units: 0,
          transactionDate: expect.any(Date),
          status: 'FAILED',
          errorMessage: 'NAV fetch failed',
        },
      })
    })

    it('should handle invalid price values', async () => {
      vi.mocked(priceFetcher.getPriceWithFallback).mockResolvedValue({
        price: 0,
        source: 'GOOGLE_SCRIPT',
        cached: false,
        fallbackUsed: false,
      })

      const result = await processSIPTransaction(mockSIP)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid NAV received: 0')
    })
  })

  describe('processSIPTransactionWithRetry', () => {
    it('should succeed on first attempt', async () => {
      vi.mocked(priceFetcher.getPriceWithFallback).mockResolvedValue({
        price: 100,
        source: 'GOOGLE_SCRIPT',
        cached: false,
        fallbackUsed: false,
      })
      mockPrisma.sIPTransaction.create.mockResolvedValue(mockTransaction)

      const result = await processSIPTransactionWithRetry(mockSIP)

      expect(result.success).toBe(true)
      expect(result.retryCount).toBe(0)
    })

    it('should retry on failure and eventually succeed', async () => {
      vi.mocked(priceFetcher.getPriceWithFallback)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          price: 100,
          source: 'GOOGLE_SCRIPT',
          cached: false,
          fallbackUsed: false,
        })

      mockPrisma.sIPTransaction.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(mockTransaction)

      const result = await processSIPTransactionWithRetry(mockSIP)

      expect(result.success).toBe(true)
      expect(result.retryCount).toBe(2)
    })

    it('should fail after maximum retries', async () => {
      vi.mocked(priceFetcher.getPriceWithFallback).mockRejectedValue(
        new Error('Persistent error')
      )

      const result = await processSIPTransactionWithRetry(mockSIP)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Persistent error')
      expect(result.retryCount).toBe(2) // Last retry attempt
    })
  })

  describe('getSIPsDueForProcessing', () => {
    it('should return SIPs due for processing', async () => {
      const mockSIPs = [
        {
          ...mockSIP,
          transactions: [],
          account: mockSIP.account!,
          goal: mockSIP.goal!,
        },
      ]

      mockPrisma.sIP.findMany.mockResolvedValue(mockSIPs)

      const result = await getSIPsDueForProcessing(new Date('2024-02-01'))

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('sip-1')
      expect(mockPrisma.sIP.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        include: {
          transactions: { orderBy: { transactionDate: 'desc' } },
          account: true,
          goal: true,
        },
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.sIP.findMany.mockRejectedValue(new Error('Database error'))

      await expect(getSIPsDueForProcessing()).rejects.toThrow(
        'Failed to retrieve SIPs due for processing'
      )
    })
  })

  describe('processSIPBatch', () => {
    it('should process multiple SIPs in batch', async () => {
      const mockSIPs = [mockSIP, { ...mockSIP, id: 'sip-2', name: 'SIP 2' }]

      mockPrisma.sIP.findMany.mockResolvedValue(
        mockSIPs.map(sip => ({
          ...sip,
          transactions: [],
          account: mockSIP.account!,
          goal: mockSIP.goal!,
        }))
      )

      vi.mocked(priceFetcher.getPriceWithFallback).mockResolvedValue({
        price: 100,
        source: 'GOOGLE_SCRIPT',
        cached: false,
        fallbackUsed: false,
      })

      mockPrisma.sIPTransaction.create.mockResolvedValue(mockTransaction)

      const result = await processSIPBatch(new Date('2024-02-01'), 1)

      expect(result.totalProcessed).toBe(2)
      expect(result.successful).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
    })

    it('should handle empty SIP list', async () => {
      mockPrisma.sIP.findMany.mockResolvedValue([])

      const result = await processSIPBatch()

      expect(result.totalProcessed).toBe(0)
      expect(result.successful).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(0)
    })
  })

  describe('calculateSIPAverageNAV', () => {
    it('should calculate average NAV correctly', async () => {
      const mockTransactions = [
        { ...mockTransaction, amount: 5000, nav: 100, units: 50 },
        { ...mockTransaction, id: 'txn-2', amount: 5000, nav: 120, units: 41.67 },
      ]

      mockPrisma.sIPTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await calculateSIPAverageNAV('sip-1')

      expect(result.totalInvested).toBe(10000)
      expect(result.totalUnits).toBeCloseTo(91.67, 2)
      expect(result.averageNAV).toBeCloseTo(109.09, 2)
      expect(result.transactionCount).toBe(2)
    })

    it('should handle SIP with no transactions', async () => {
      mockPrisma.sIPTransaction.findMany.mockResolvedValue([])

      const result = await calculateSIPAverageNAV('sip-1')

      expect(result.totalInvested).toBe(0)
      expect(result.totalUnits).toBe(0)
      expect(result.averageNAV).toBe(0)
      expect(result.transactionCount).toBe(0)
    })
  })

  describe('getSIPTransactionAuditTrail', () => {
    it('should return transaction audit trail', async () => {
      const mockTransactions = [
        {
          ...mockTransaction,
          sip: { name: 'HDFC Top 100 SIP' },
        },
      ]

      mockPrisma.sIPTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await getSIPTransactionAuditTrail('sip-1')

      expect(result).toHaveLength(1)
      expect(result[0].sipName).toBe('HDFC Top 100 SIP')
      expect(result[0].amount).toBe(5000)
    })
  })

  describe('getSIPProcessingStats', () => {
    it('should return processing statistics', async () => {
      const mockTransactions = [
        { ...mockTransaction, status: 'COMPLETED', amount: 5000, units: 50, sipId: 'sip-1' },
        { ...mockTransaction, id: 'txn-2', status: 'FAILED', amount: 5000, units: 0, sipId: 'sip-1' },
        { ...mockTransaction, id: 'txn-3', status: 'COMPLETED', amount: 3000, units: 30, sipId: 'sip-2' },
      ]

      mockPrisma.sIPTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await getSIPProcessingStats()

      expect(result.totalTransactions).toBe(3)
      expect(result.successfulTransactions).toBe(2)
      expect(result.failedTransactions).toBe(1)
      expect(result.totalAmount).toBe(8000)
      expect(result.totalUnits).toBe(80)
      expect(result.uniqueSIPs).toBe(2)
      expect(result.processingSuccessRate).toBeCloseTo(66.67, 2)
    })
  })

  describe('retryFailedSIPTransactions', () => {
    it('should retry failed transactions successfully', async () => {
      const failedTransaction = {
        ...mockTransaction,
        id: 'failed-txn-1',
        status: 'FAILED',
        sip: {
          ...mockSIP,
          account: mockSIP.account!,
          goal: mockSIP.goal!,
        },
      }

      mockPrisma.sIPTransaction.findMany.mockResolvedValue([failedTransaction])
      
      vi.mocked(priceFetcher.getPriceWithFallback).mockResolvedValue({
        price: 100,
        source: 'GOOGLE_SCRIPT',
        cached: false,
        fallbackUsed: false,
      })

      mockPrisma.sIPTransaction.create.mockResolvedValue(mockTransaction)
      mockPrisma.sIPTransaction.delete.mockResolvedValue(failedTransaction)

      const result = await retryFailedSIPTransactions()

      expect(result.totalProcessed).toBe(1)
      expect(result.successful).toBe(1)
      expect(result.failed).toBe(0)
      expect(mockPrisma.sIPTransaction.delete).toHaveBeenCalledWith({
        where: { id: 'failed-txn-1' },
      })
    })
  })

  describe('cleanupOldFailedTransactions', () => {
    it('should clean up old failed transactions', async () => {
      mockPrisma.sIPTransaction.deleteMany.mockResolvedValue({ count: 5 })

      const result = await cleanupOldFailedTransactions()

      expect(result).toBe(5)
      expect(mockPrisma.sIPTransaction.deleteMany).toHaveBeenCalledWith({
        where: {
          status: 'FAILED',
          createdAt: {
            lt: expect.any(Date),
          },
        },
      })
    })
  })
})