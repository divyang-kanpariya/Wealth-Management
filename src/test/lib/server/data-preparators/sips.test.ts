import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SIPsDataPreparator } from '@/lib/server/data-preparators/sips'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    sIP: {
      findMany: vi.fn()
    },
    goal: {
      findMany: vi.fn()
    },
    account: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('@/lib/calculations', () => ({
  calculateSipValue: vi.fn(),
  calculateSipSummary: vi.fn()
}))

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn)
}))

describe('SIPsDataPreparator', () => {
  let preparator: SIPsDataPreparator

  beforeEach(() => {
    preparator = new SIPsDataPreparator()
    vi.clearAllMocks()
  })

  it('should prepare SIPs data successfully', async () => {
    const { prisma } = await import('@/lib/prisma')
    const { calculateSipValue, calculateSipSummary } = await import('@/lib/calculations')

    // Mock data
    const mockSips = [
      {
        id: '1',
        name: 'Test SIP',
        symbol: 'TEST',
        amount: 5000,
        frequency: 'MONTHLY',
        startDate: new Date(),
        status: 'ACTIVE',
        accountId: 'acc1',
        createdAt: new Date(),
        updatedAt: new Date(),
        goal: null,
        account: { id: 'acc1', name: 'Test Account', type: 'DEMAT' },
        transactions: []
      }
    ]

    const mockGoals = [
      {
        id: 'goal1',
        name: 'Test Goal',
        targetAmount: 100000,
        targetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: []
      }
    ]

    const mockAccounts = [
      {
        id: 'acc1',
        name: 'Test Account',
        type: 'DEMAT',
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: []
      }
    ]

    const mockSipWithValue = {
      sip: mockSips[0],
      totalInvested: 5000,
      totalUnits: 50,
      currentValue: 5500,
      averageNAV: 100,
      gainLoss: 500,
      gainLossPercentage: 10
    }

    const mockSummary = {
      totalSIPs: 1,
      activeSIPs: 1,
      totalMonthlyAmount: 5000,
      totalInvested: 5000,
      totalCurrentValue: 5500,
      totalGainLoss: 500,
      totalGainLossPercentage: 10
    }

    // Setup mocks
    vi.mocked(prisma.sIP.findMany).mockResolvedValue(mockSips)
    vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals)
    vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts)
    vi.mocked(calculateSipValue).mockReturnValue(mockSipWithValue)
    vi.mocked(calculateSipSummary).mockReturnValue(mockSummary)

    const result = await preparator.prepare()

    expect(result.sips).toHaveLength(1)
    expect(result.sipsWithValues).toHaveLength(1)
    expect(result.goals).toHaveLength(1)
    expect(result.accounts).toHaveLength(1)
    expect(result.summary.totalSIPs).toBe(1)
    expect(result.timestamp).toBeInstanceOf(Date)
  })

  it('should handle errors gracefully and return fallback data', async () => {
    const { prisma } = await import('@/lib/prisma')

    // Mock database error
    vi.mocked(prisma.sIP.findMany).mockRejectedValue(new Error('Database error'))

    const result = await preparator.prepare()

    expect(result.sips).toEqual([])
    expect(result.sipsWithValues).toEqual([])
    expect(result.goals).toEqual([])
    expect(result.accounts).toEqual([])
    expect(result.summary.totalSIPs).toBe(0)
  })
})