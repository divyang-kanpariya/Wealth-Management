import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoalsDataPreparator } from '@/lib/server/data-preparators/goals'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      findMany: vi.fn()
    },
    investment: {
      findMany: vi.fn()
    },
    priceCache: {
      findMany: vi.fn()
    }
  }
}))

// Mock calculations
vi.mock('@/lib/calculations', () => ({
  calculateInvestmentsWithPrices: vi.fn().mockReturnValue([]),
  calculateGoalProgress: vi.fn().mockReturnValue({
    id: 'goal1',
    name: 'Test Goal',
    targetAmount: 100000,
    currentValue: 50000,
    progress: 50,
    remainingAmount: 50000,
    targetDate: new Date('2024-12-31')
  })
}))

// Mock Next.js cache
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn)
}))

describe('GoalsDataPreparator', () => {
  let preparator: GoalsDataPreparator

  beforeEach(() => {
    preparator = new GoalsDataPreparator()
    vi.clearAllMocks()
  })

  it('should prepare goals data successfully', async () => {
    // Mock data
    const mockGoals = [
      {
        id: 'goal1',
        name: 'Test Goal',
        targetAmount: 100000,
        targetDate: new Date('2024-12-31'),
        priority: 1,
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: []
      }
    ]

    const mockInvestments = []
    const mockPriceCache = []

    // Setup mocks
    vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals)
    vi.mocked(prisma.investment.findMany).mockResolvedValue(mockInvestments)
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue(mockPriceCache)

    const result = await preparator.prepare()

    expect(result).toBeDefined()
    expect(result.goals).toHaveLength(1)
    expect(result.goalProgress).toHaveLength(1)
    expect(result.totalGoals).toBe(1)
    expect(result.totalTargetAmount).toBe(100000)
    expect(result.timestamp).toBeInstanceOf(Date)
  })

  it('should handle errors gracefully and return fallback data', async () => {
    // Mock database error
    vi.mocked(prisma.goal.findMany).mockRejectedValue(new Error('Database error'))

    const result = await preparator.prepare()

    expect(result).toBeDefined()
    expect(result.goals).toHaveLength(0)
    expect(result.goalProgress).toHaveLength(0)
    expect(result.totalGoals).toBe(0)
    expect(result.totalTargetAmount).toBe(0)
    expect(result.totalCurrentValue).toBe(0)
    expect(result.totalProgress).toBe(0)
  })

  it('should calculate summary statistics correctly', async () => {
    const mockGoals = [
      {
        id: 'goal1',
        name: 'Goal 1',
        targetAmount: 100000,
        targetDate: new Date('2024-12-31'),
        priority: 1,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: []
      },
      {
        id: 'goal2',
        name: 'Goal 2',
        targetAmount: 200000,
        targetDate: new Date('2025-12-31'),
        priority: 2,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: []
      }
    ]

    vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals)
    vi.mocked(prisma.investment.findMany).mockResolvedValue([])
    vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

    const result = await preparator.prepare()

    expect(result.totalGoals).toBe(2)
    expect(result.totalTargetAmount).toBe(300000)
    expect(result.totalCurrentValue).toBe(100000) // 2 goals * 50000 each from mock
    expect(result.totalProgress).toBe(33.33333333333333) // 100000 / 300000 * 100
  })
})