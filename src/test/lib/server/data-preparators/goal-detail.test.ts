import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoalDetailDataPreparator } from '@/lib/server/data-preparators/goal-detail'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      findUnique: vi.fn(),
    },
    priceCache: {
      findMany: vi.fn(),
    },
  },
}))

// Mock calculations
vi.mock('@/lib/calculations', () => ({
  calculateInvestmentsWithPrices: vi.fn(),
  calculateGoalProgress: vi.fn(),
}))

// Mock price fetcher
vi.mock('@/lib/price-fetcher', () => ({
  batchGetPrices: vi.fn(),
}))

// Mock Next.js cache
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn),
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('Not found')
  }),
}))

describe('GoalDetailDataPreparator', () => {
  let preparator: GoalDetailDataPreparator

  beforeEach(() => {
    preparator = new GoalDetailDataPreparator()
    vi.clearAllMocks()
  })

  it('should prepare goal detail data successfully', async () => {
    const mockGoal = {
      id: 'goal-1',
      name: 'Test Goal',
      targetAmount: 100000,
      targetDate: new Date('2025-12-31'),
      priority: 1,
      description: 'Test description',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      investments: [
        {
          id: 'inv-1',
          type: 'STOCK',
          name: 'Test Stock',
          symbol: 'TEST',
          units: 100,
          buyPrice: 50,
          buyDate: new Date('2024-01-01'),
          goalId: 'goal-1',
          accountId: 'acc-1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          account: {
            id: 'acc-1',
            name: 'Test Account',
            type: 'DEMAT',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        },
      ],
    }

    const mockInvestmentsWithValues = [
      {
        investment: mockGoal.investments[0],
        currentPrice: 60,
        currentValue: 6000,
        gainLoss: 1000,
        gainLossPercentage: 20,
      },
    ]

    const mockGoalProgress = {
      id: 'goal-1',
      name: 'Test Goal',
      targetAmount: 100000,
      currentValue: 6000,
      progress: 6,
      remainingAmount: 94000,
      targetDate: new Date('2025-12-31'),
    }

    // Mock Prisma responses
    vi.mocked(prisma.goal.findUnique).mockResolvedValue(mockGoal)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    // Mock calculations
    const { calculateInvestmentsWithPrices, calculateGoalProgress } = await import('@/lib/calculations')
    vi.mocked(calculateInvestmentsWithPrices).mockReturnValue(mockInvestmentsWithValues)
    vi.mocked(calculateGoalProgress).mockReturnValue(mockGoalProgress)

    const result = await preparator.prepare('goal-1')

    expect(result).toMatchObject({
      goal: expect.objectContaining({
        id: 'goal-1',
        name: 'Test Goal',
        targetAmount: 100000,
      }),
      goalProgress: mockGoalProgress,
      investmentsWithValues: mockInvestmentsWithValues,
      projections: expect.objectContaining({
        monthsToTarget: expect.any(Number),
        requiredMonthlyInvestment: expect.any(Number),
        projectedCompletionDate: expect.any(Date),
      }),
    })

    expect(prisma.goal.findUnique).toHaveBeenCalledWith({
      where: { id: 'goal-1' },
      include: {
        investments: {
          include: {
            account: true,
          },
        },
      },
    })
  })

  it('should throw not found error when goal does not exist', async () => {
    vi.mocked(prisma.goal.findUnique).mockResolvedValue(null)

    await expect(preparator.prepare('non-existent-goal')).rejects.toThrow('Not found')
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(prisma.goal.findUnique).mockRejectedValue(new Error('Database error'))

    await expect(preparator.prepare('goal-1')).rejects.toThrow('Failed to prepare goal detail data')
  })

  it('should calculate projections correctly', async () => {
    const mockGoal = {
      id: 'goal-1',
      name: 'Test Goal',
      targetAmount: 100000,
      targetDate: new Date('2025-12-31'),
      priority: 1,
      description: 'Test description',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      investments: [],
    }

    const mockGoalProgress = {
      id: 'goal-1',
      name: 'Test Goal',
      targetAmount: 100000,
      currentValue: 25000,
      progress: 25,
      remainingAmount: 75000,
      targetDate: new Date('2025-12-31'),
    }

    vi.mocked(prisma.goal.findUnique).mockResolvedValue(mockGoal)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    const { calculateInvestmentsWithPrices, calculateGoalProgress } = await import('@/lib/calculations')
    vi.mocked(calculateInvestmentsWithPrices).mockReturnValue([])
    vi.mocked(calculateGoalProgress).mockReturnValue(mockGoalProgress)

    const result = await preparator.prepare('goal-1')

    expect(result.projections).toMatchObject({
      monthsToTarget: expect.any(Number),
      requiredMonthlyInvestment: expect.any(Number),
      projectedCompletionDate: expect.any(Date),
    })

    // Should calculate required monthly investment based on remaining amount and time
    expect(result.projections.requiredMonthlyInvestment).toBeGreaterThan(0)
  })

  it('should handle goals with no investments', async () => {
    const mockGoal = {
      id: 'goal-1',
      name: 'Test Goal',
      targetAmount: 100000,
      targetDate: new Date('2025-12-31'),
      priority: 1,
      description: 'Test description',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      investments: [],
    }

    const mockGoalProgress = {
      id: 'goal-1',
      name: 'Test Goal',
      targetAmount: 100000,
      currentValue: 0,
      progress: 0,
      remainingAmount: 100000,
      targetDate: new Date('2025-12-31'),
    }

    vi.mocked(prisma.goal.findUnique).mockResolvedValue(mockGoal)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    const { calculateInvestmentsWithPrices, calculateGoalProgress } = await import('@/lib/calculations')
    vi.mocked(calculateInvestmentsWithPrices).mockReturnValue([])
    vi.mocked(calculateGoalProgress).mockReturnValue(mockGoalProgress)

    const result = await preparator.prepare('goal-1')

    expect(result.goal.investments).toEqual([])
    expect(result.investmentsWithValues).toEqual([])
    expect(result.goalProgress.currentValue).toBe(0)
  })
})