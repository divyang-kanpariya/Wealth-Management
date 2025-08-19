import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SIPDetailDataPreparator } from '@/lib/server/data-preparators/sip-detail'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    sIP: {
      findUnique: vi.fn(),
    },
    goal: {
      findMany: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
    },
    priceCache: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('@/lib/calculations', () => ({
  calculateSipValue: vi.fn(),
}))

vi.mock('@/lib/price-fetcher', () => ({
  batchGetPrices: vi.fn(),
}))

describe('SIPDetailDataPreparator', () => {
  let preparator: SIPDetailDataPreparator

  beforeEach(() => {
    preparator = new SIPDetailDataPreparator()
    vi.clearAllMocks()
  })

  const mockSIP = {
    id: 'test-sip-id',
    name: 'Test SIP',
    symbol: 'TEST123',
    amount: 5000,
    frequency: 'MONTHLY',
    startDate: new Date('2023-01-01'),
    endDate: null,
    status: 'ACTIVE',
    goalId: 'goal-1',
    accountId: 'account-1',
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
    goal: {
      id: 'goal-1',
      name: 'Test Goal',
      targetAmount: 100000,
      targetDate: new Date('2025-01-01'),
      priority: 'HIGH',
      description: 'Test goal description',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    account: {
      id: 'account-1',
      name: 'Test Account',
      type: 'DEMAT',
      notes: 'Test account notes',
      createdAt: new Date(),
      updatedAt: new Date(),
      investments: [],
    },
    transactions: [
      {
        id: 'txn-1',
        sipId: 'test-sip-id',
        amount: 5000,
        nav: 50,
        units: 100,
        transactionDate: new Date('2023-01-01'),
        status: 'COMPLETED',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  }

  const mockGoals = [
    {
      id: 'goal-1',
      name: 'Test Goal',
      targetAmount: 100000,
      targetDate: new Date('2025-01-01'),
      priority: 'HIGH',
      description: 'Test goal description',
      createdAt: new Date(),
      updatedAt: new Date(),
      investments: [],
    },
  ]

  const mockAccounts = [
    {
      id: 'account-1',
      name: 'Test Account',
      type: 'DEMAT',
      notes: 'Test account notes',
      createdAt: new Date(),
      updatedAt: new Date(),
      investments: [],
    },
  ]

  it('should successfully prepare SIP detail data', async () => {
    vi.mocked(prisma.sIP.findUnique).mockResolvedValue(mockSIP)
    vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals)
    vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    const { calculateSipValue } = await import('@/lib/calculations')
    vi.mocked(calculateSipValue).mockReturnValue({
      sip: mockSIP,
      totalInvested: 5000,
      totalUnits: 100,
      currentValue: 6000,
      averageNAV: 50,
      gainLoss: 1000,
      gainLossPercentage: 20,
      nextTransactionDate: new Date('2023-02-01'),
    })

    const result = await preparator.prepare('test-sip-id')

    expect(result).toBeDefined()
    expect(result.sip.id).toBe('test-sip-id')
    expect(result.sipWithValue.totalInvested).toBe(5000)
    expect(result.transactions).toHaveLength(1)
    expect(result.goals).toHaveLength(1)
    expect(result.accounts).toHaveLength(1)
  })

  it('should call notFound when SIP does not exist', async () => {
    vi.mocked(prisma.sIP.findUnique).mockResolvedValue(null)

    await expect(preparator.prepare('non-existent-id')).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFound).toHaveBeenCalled()
  })

  it('should handle missing price data gracefully', async () => {
    vi.mocked(prisma.sIP.findUnique).mockResolvedValue(mockSIP)
    vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals)
    vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    const { calculateSipValue } = await import('@/lib/calculations')
    vi.mocked(calculateSipValue).mockReturnValue({
      sip: mockSIP,
      totalInvested: 5000,
      totalUnits: 100,
      currentValue: 5000,
      averageNAV: 50,
      gainLoss: 0,
      gainLossPercentage: 0,
      nextTransactionDate: new Date('2023-02-01'),
    })

    const result = await preparator.prepare('test-sip-id')

    expect(result).toBeDefined()
    expect(result.sipWithValue.currentValue).toBe(5000)
  })

  it('should handle price fetch errors gracefully', async () => {
    vi.mocked(prisma.sIP.findUnique).mockResolvedValue(mockSIP)
    vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals)
    vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts)
    vi.mocked(prisma.priceCache.findMany).mockRejectedValue(new Error('Price fetch failed'))

    const { calculateSipValue } = await import('@/lib/calculations')
    vi.mocked(calculateSipValue).mockReturnValue({
      sip: mockSIP,
      totalInvested: 5000,
      totalUnits: 100,
      currentValue: 5000,
      averageNAV: 50,
      gainLoss: 0,
      gainLossPercentage: 0,
      nextTransactionDate: new Date('2023-02-01'),
    })

    const result = await preparator.prepare('test-sip-id')

    expect(result).toBeDefined()
    expect(result.sipWithValue.currentValue).toBe(5000)
  })

  it('should throw error for database failures', async () => {
    vi.mocked(prisma.sIP.findUnique).mockRejectedValue(new Error('Database error'))

    await expect(preparator.prepare('test-sip-id')).rejects.toThrow('Failed to prepare SIP detail data')
  })

  it('should transform SIP data correctly', async () => {
    const sipWithNulls = {
      ...mockSIP,
      endDate: null,
      goalId: null,
      notes: null,
      goal: null,
    }

    vi.mocked(prisma.sIP.findUnique).mockResolvedValue(sipWithNulls)
    vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals)
    vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    const { calculateSipValue } = await import('@/lib/calculations')
    vi.mocked(calculateSipValue).mockReturnValue({
      sip: sipWithNulls,
      totalInvested: 5000,
      totalUnits: 100,
      currentValue: 5000,
      averageNAV: 50,
      gainLoss: 0,
      gainLossPercentage: 0,
      nextTransactionDate: new Date('2023-02-01'),
    })

    const result = await preparator.prepare('test-sip-id')

    expect(result.sip.endDate).toBeUndefined()
    expect(result.sip.goalId).toBeUndefined()
    expect(result.sip.notes).toBeUndefined()
    expect(result.sip.goal).toBeUndefined()
  })

  it('should transform transaction data correctly', async () => {
    const sipWithTransactionNulls = {
      ...mockSIP,
      transactions: [
        {
          ...mockSIP.transactions[0],
          errorMessage: null,
        },
      ],
    }

    vi.mocked(prisma.sIP.findUnique).mockResolvedValue(sipWithTransactionNulls)
    vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals)
    vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    const { calculateSipValue } = await import('@/lib/calculations')
    vi.mocked(calculateSipValue).mockReturnValue({
      sip: sipWithTransactionNulls,
      totalInvested: 5000,
      totalUnits: 100,
      currentValue: 5000,
      averageNAV: 50,
      gainLoss: 0,
      gainLossPercentage: 0,
      nextTransactionDate: new Date('2023-02-01'),
    })

    const result = await preparator.prepare('test-sip-id')

    expect(result.transactions[0].errorMessage).toBeUndefined()
  })
})