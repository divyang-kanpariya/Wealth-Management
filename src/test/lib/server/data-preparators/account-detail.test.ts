import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AccountDetailDataPreparator } from '@/lib/server/data-preparators/account-detail'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

// Mock Next.js functions
vi.mock('next/navigation', () => ({
  notFound: vi.fn()
}))

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn)
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: vi.fn()
    }
  }
}))

describe('AccountDetailDataPreparator', () => {
  let preparator: AccountDetailDataPreparator

  beforeEach(() => {
    preparator = new AccountDetailDataPreparator()
    vi.clearAllMocks()
  })

  describe('prepare', () => {
    it('should prepare account detail data successfully', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Test Account',
        type: 'BROKER',
        notes: 'Test notes',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        investments: [
          {
            id: 'investment-1',
            type: 'STOCK',
            name: 'Test Stock',
            symbol: 'TEST',
            units: 100,
            buyPrice: 50,
            buyDate: new Date('2024-01-01'),
            accountId: 'account-1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            goal: {
              id: 'goal-1',
              name: 'Test Goal',
              targetAmount: 100000,
              targetDate: new Date('2025-01-01'),
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01')
            },
            account: {
              id: 'account-1',
              name: 'Test Account',
              type: 'BROKER',
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01')
            }
          }
        ]
      }

      vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccount)

      const result = await preparator.prepare('account-1')

      expect(result).toMatchObject({
        timestamp: expect.any(Date),
        account: {
          id: 'account-1',
          name: 'Test Account',
          type: 'BROKER',
          notes: 'Test notes',
          totalValue: 5000, // 100 units * 50 price
          investmentCount: 1,
          investments: expect.arrayContaining([
            expect.objectContaining({
              id: 'investment-1',
              name: 'Test Stock',
              type: 'STOCK'
            })
          ])
        }
      })

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        include: {
          investments: {
            include: {
              goal: true,
              account: true,
            },
            orderBy: {
              buyDate: 'desc'
            }
          },
        },
      })
    })

    it('should handle account not found', async () => {
      vi.mocked(prisma.account.findUnique).mockResolvedValue(null)

      await expect(preparator.prepare('non-existent')).rejects.toThrow()
      expect(notFound).toHaveBeenCalled()
    })

    it('should calculate totals for value-based investments', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Test Account',
        type: 'BANK',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        investments: [
          {
            id: 'investment-1',
            type: 'REAL_ESTATE',
            name: 'Test Property',
            totalValue: 1000000,
            buyDate: new Date('2024-01-01'),
            accountId: 'account-1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
          }
        ]
      }

      vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccount)

      const result = await preparator.prepare('account-1')

      expect(result.account.totalValue).toBe(1000000)
      expect(result.account.investmentCount).toBe(1)
    })

    it('should handle mixed investment types', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Test Account',
        type: 'DEMAT',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        investments: [
          {
            id: 'investment-1',
            type: 'STOCK',
            name: 'Test Stock',
            units: 100,
            buyPrice: 50,
            buyDate: new Date('2024-01-01'),
            accountId: 'account-1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
          },
          {
            id: 'investment-2',
            type: 'GOLD',
            name: 'Gold Investment',
            totalValue: 50000,
            buyDate: new Date('2024-01-01'),
            accountId: 'account-1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
          }
        ]
      }

      vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccount)

      const result = await preparator.prepare('account-1')

      expect(result.account.totalValue).toBe(55000) // 5000 + 50000
      expect(result.account.investmentCount).toBe(2)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.account.findUnique).mockRejectedValue(new Error('Database error'))

      await expect(preparator.prepare('account-1')).rejects.toThrow('Failed to prepare account detail data')
    })

    it('should transform optional fields correctly', async () => {
      const mockAccount = {
        id: 'account-1',
        name: 'Test Account',
        type: 'BROKER',
        notes: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        investments: [
          {
            id: 'investment-1',
            type: 'STOCK',
            name: 'Test Stock',
            symbol: null,
            units: null,
            buyPrice: null,
            totalValue: 5000,
            buyDate: new Date('2024-01-01'),
            accountId: 'account-1',
            goalId: null,
            notes: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            goal: null,
            account: null
          }
        ]
      }

      vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccount)

      const result = await preparator.prepare('account-1')

      expect(result.account.notes).toBeUndefined()
      expect(result.account.investments[0].symbol).toBeUndefined()
      expect(result.account.investments[0].units).toBeUndefined()
      expect(result.account.investments[0].buyPrice).toBeUndefined()
      expect(result.account.investments[0].goalId).toBeUndefined()
      expect(result.account.investments[0].notes).toBeUndefined()
      expect(result.account.investments[0].goal).toBeUndefined()
    })
  })
})