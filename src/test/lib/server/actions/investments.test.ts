import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInvestmentFromData, updateInvestmentFromData, deleteInvestment } from '@/lib/server/actions/investments'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  }
}))

// Mock cache invalidation
vi.mock('@/lib/server/cache-invalidation', () => ({
  CacheInvalidation: {
    invalidateInvestments: vi.fn()
  }
}))

describe('Investment Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createInvestmentFromData', () => {
    it('should create an investment successfully', async () => {
      const mockInvestment = {
        id: '1',
        name: 'Test Investment',
        type: 'STOCK',
        symbol: 'TEST',
        units: 10,
        buyPrice: 100,
        buyDate: new Date(),
        accountId: 'account-1',
        goal: null,
        account: { id: 'account-1', name: 'Test Account' }
      }

      vi.mocked(prisma.investment.create).mockResolvedValue(mockInvestment as any)

      const result = await createInvestmentFromData({
        name: 'Test Investment',
        type: 'STOCK',
        symbol: 'TEST',
        units: 10,
        buyPrice: 100,
        buyDate: new Date(),
        accountId: 'account-1'
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockInvestment)
      expect(prisma.investment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Investment',
          type: 'STOCK',
          symbol: 'TEST',
          units: 10,
          buyPrice: 100,
          accountId: 'account-1'
        }),
        include: {
          goal: true,
          account: true,
        }
      })
    })

    it('should handle validation errors', async () => {
      const result = await createInvestmentFromData({
        // Missing required fields
        name: '',
        type: 'INVALID_TYPE'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.investment.create).mockRejectedValue(new Error('Database error'))

      const result = await createInvestmentFromData({
        name: 'Test Investment',
        type: 'STOCK',
        buyDate: new Date(),
        accountId: 'account-1'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('updateInvestmentFromData', () => {
    it('should update an investment successfully', async () => {
      const mockUpdatedInvestment = {
        id: '1',
        name: 'Updated Investment',
        type: 'STOCK',
        symbol: 'TEST',
        units: 20,
        buyPrice: 150,
        buyDate: new Date(),
        accountId: 'account-1',
        goal: null,
        account: { id: 'account-1', name: 'Test Account' }
      }

      vi.mocked(prisma.investment.update).mockResolvedValue(mockUpdatedInvestment as any)

      const result = await updateInvestmentFromData('1', {
        name: 'Updated Investment',
        units: 20,
        buyPrice: 150
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUpdatedInvestment)
      expect(prisma.investment.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          name: 'Updated Investment',
          units: 20,
          buyPrice: 150
        }),
        include: {
          goal: true,
          account: true,
        }
      })
    })
  })

  describe('deleteInvestment', () => {
    it('should delete an investment successfully', async () => {
      vi.mocked(prisma.investment.delete).mockResolvedValue({} as any)

      const result = await deleteInvestment('1')

      expect(result.success).toBe(true)
      expect(prisma.investment.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      })
    })

    it('should handle deletion errors', async () => {
      vi.mocked(prisma.investment.delete).mockRejectedValue(new Error('Not found'))

      const result = await deleteInvestment('1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not found')
    })
  })
})