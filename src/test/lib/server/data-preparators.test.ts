/**
 * Tests for server-side data preparation infrastructure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  BaseDataPreparator,
  DataProcessingUtils,
  ErrorHandler,
  DataPreparationError,
  PriceDataError,
  DatabaseError,
  CalculationError,
  withErrorHandling,
  isSuccessfulResult,
  extractDataOrThrow,
  extractDataOrFallback
} from '@/lib/server/data-preparators'
import type { 
  PageDataBase, 
  DataPreparationResult,
  DashboardPageData 
} from '@/lib/server/data-preparators'
import { Investment, InvestmentWithCurrentValue } from '@/types'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      findMany: vi.fn()
    },
    goal: {
      findMany: vi.fn()
    },
    sIP: {
      findMany: vi.fn()
    },
    account: {
      findMany: vi.fn()
    },
    priceCache: {
      findMany: vi.fn()
    }
  }
}))

// Mock price fetcher
vi.mock('@/lib/price-fetcher', () => ({
  batchGetPrices: vi.fn()
}))

// Test implementation of BaseDataPreparator
class TestDataPreparator extends BaseDataPreparator<DashboardPageData> {
  async prepare(): Promise<DataPreparationResult<DashboardPageData>> {
    return this.executeWithFallback(
      () => this.preparePrimary(),
      () => this.prepareFallback(),
      'TestDataPreparator'
    )
  }

  private async preparePrimary(): Promise<DashboardPageData> {
    return {
      timestamp: new Date(),
      portfolioSummary: {
        totalValue: 100000,
        totalInvested: 90000,
        totalGainLoss: 10000,
        totalGainLossPercentage: 11.11,
        assetAllocation: {},
        accountDistribution: {}
      },
      sipSummary: {
        totalSIPs: 5,
        activeSIPs: 3,
        totalMonthlyAmount: 15000,
        totalInvested: 180000,
        totalCurrentValue: 200000,
        totalGainLoss: 20000,
        totalGainLossPercentage: 11.11
      },
      goalProgress: [],
      topPerformers: {
        topGainers: [],
        topLosers: [],
        topPercentageGainers: [],
        topPercentageLosers: []
      },
      investmentsWithValues: [],
      sipsWithValues: [],
      totalInvestments: 10,
      totalSIPs: 5,
      totalGoals: 3
    }
  }

  protected async prepareFallback(): Promise<DashboardPageData> {
    return {
      timestamp: new Date(),
      portfolioSummary: {
        totalValue: 0,
        totalInvested: 0,
        totalGainLoss: 0,
        totalGainLossPercentage: 0,
        assetAllocation: {},
        accountDistribution: {}
      },
      sipSummary: {
        totalSIPs: 0,
        activeSIPs: 0,
        totalMonthlyAmount: 0,
        totalInvested: 0,
        totalCurrentValue: 0,
        totalGainLoss: 0,
        totalGainLossPercentage: 0
      },
      goalProgress: [],
      topPerformers: {
        topGainers: [],
        topLosers: [],
        topPercentageGainers: [],
        topPercentageLosers: []
      },
      investmentsWithValues: [],
      sipsWithValues: [],
      totalInvestments: 0,
      totalSIPs: 0,
      totalGoals: 0
    }
  }
}

describe('BaseDataPreparator', () => {
  let preparator: TestDataPreparator
  
  beforeEach(() => {
    preparator = new TestDataPreparator()
    vi.clearAllMocks()
  })

  it('should successfully prepare data', async () => {
    const result = await preparator.prepare()
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.fallbackUsed).toBe(false)
    expect(result.data?.portfolioSummary.totalValue).toBe(100000)
  })

  it('should transform investment data correctly', () => {
    const mockInvestment = {
      id: '1',
      name: 'Test Investment',
      symbol: 'TEST',
      units: 100,
      buyPrice: 50,
      quantity: null,
      totalValue: null,
      type: 'STOCK',
      buyDate: new Date(),
      goalId: null,
      accountId: 'acc1',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      goal: null,
      account: {
        id: 'acc1',
        name: 'Test Account',
        type: 'DEMAT',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }

    const transformed = preparator['transformInvestment'](mockInvestment)
    
    expect(transformed.symbol).toBe('TEST')
    expect(transformed.units).toBe(100)
    expect(transformed.buyPrice).toBe(50)
    expect(transformed.quantity).toBeUndefined()
    expect(transformed.totalValue).toBeUndefined()
    expect(transformed.goalId).toBeUndefined()
    expect(transformed.notes).toBeUndefined()
    expect(transformed.account?.notes).toBeUndefined()
  })

  it('should create cache keys correctly', () => {
    const cacheKey1 = preparator['createCacheKey']('test')
    const cacheKey2 = preparator['createCacheKey']('test', { param: 'value' })
    
    expect(cacheKey1).toMatch(/^test_\d+_/)
    expect(cacheKey2).toMatch(/^test_\d+_/)
    expect(cacheKey1).not.toBe(cacheKey2)
  })
})

describe('DataProcessingUtils', () => {
  const mockInvestments: Investment[] = [
    {
      id: '1',
      name: 'Stock A',
      symbol: 'STOCKA',
      type: 'STOCK',
      units: 100,
      buyPrice: 50,
      buyDate: new Date(),
      accountId: 'acc1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Real Estate',
      type: 'REAL_ESTATE',
      totalValue: 1000000,
      buyDate: new Date(),
      accountId: 'acc2',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  it('should process investments with prices correctly', () => {
    const priceData = new Map([['STOCKA', 60]])
    
    const result = DataProcessingUtils.processInvestments(mockInvestments, priceData)
    
    expect(result).toHaveLength(2)
    expect(result[0].currentValue).toBe(6000) // 100 * 60
    expect(result[0].gainLoss).toBe(1000) // 6000 - 5000
    expect(result[1].currentValue).toBe(1000000) // Total value investment
  })

  it('should filter investments correctly', () => {
    const investmentsWithValues: InvestmentWithCurrentValue[] = mockInvestments.map(inv => ({
      investment: inv,
      currentValue: inv.totalValue || (inv.units! * inv.buyPrice!),
      gainLoss: 0,
      gainLossPercentage: 0
    }))

    const filtered = DataProcessingUtils.filterInvestments(investmentsWithValues, {
      search: 'Stock',
      type: 'STOCK'
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0].investment.name).toBe('Stock A')
  })

  it('should sort investments correctly', () => {
    const investmentsWithValues: InvestmentWithCurrentValue[] = [
      {
        investment: mockInvestments[0],
        currentValue: 5000,
        gainLoss: 0,
        gainLossPercentage: 0
      },
      {
        investment: mockInvestments[1],
        currentValue: 1000000,
        gainLoss: 0,
        gainLossPercentage: 0
      }
    ]

    const sorted = DataProcessingUtils.sortInvestments(investmentsWithValues, 'currentValue', 'desc')

    expect(sorted[0].currentValue).toBe(1000000)
    expect(sorted[1].currentValue).toBe(5000)
  })

  it('should paginate items correctly', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
    
    const result = DataProcessingUtils.paginateItems(items, 2, 10)
    
    expect(result.items).toHaveLength(10)
    expect(result.items[0].id).toBe(11)
    expect(result.totalCount).toBe(25)
    expect(result.totalPages).toBe(3)
    expect(result.hasNext).toBe(true)
    expect(result.hasPrev).toBe(true)
  })

  it('should calculate investments summary correctly', () => {
    const investmentsWithValues: InvestmentWithCurrentValue[] = [
      {
        investment: { ...mockInvestments[0], units: 100, buyPrice: 50 },
        currentValue: 6000,
        gainLoss: 1000,
        gainLossPercentage: 20
      },
      {
        investment: { ...mockInvestments[1], totalValue: 100000 },
        currentValue: 100000,
        gainLoss: 0,
        gainLossPercentage: 0
      }
    ]

    const summary = DataProcessingUtils.calculateInvestmentsSummary(investmentsWithValues)

    expect(summary.totalValue).toBe(106000)
    expect(summary.totalInvested).toBe(105000)
    expect(summary.totalGainLoss).toBe(1000)
    expect(summary.totalGainLossPercentage).toBeCloseTo(0.95, 2)
  })

  it('should format currency correctly', () => {
    expect(DataProcessingUtils.formatCurrency(100000)).toBe('₹1,00,000')
    expect(DataProcessingUtils.formatCurrency(1234.56)).toBe('₹1,235')
  })

  it('should format percentage correctly', () => {
    expect(DataProcessingUtils.formatPercentage(12.34)).toBe('+12.34%')
    expect(DataProcessingUtils.formatPercentage(-5.67)).toBe('-5.67%')
  })
})

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should execute with fallback on primary failure', async () => {
    const primaryFn = vi.fn().mockRejectedValue(new Error('Primary failed'))
    const fallbackFn = vi.fn().mockResolvedValue('fallback data')

    const result = await ErrorHandler.executeWithFallback(
      primaryFn,
      fallbackFn,
      'test-operation'
    )

    expect(result.success).toBe(true)
    expect(result.data).toBe('fallback data')
    expect(result.fallbackUsed).toBe(true)
    expect(result.error).toContain('test-operation failed')
  })

  it('should return error when both primary and fallback fail', async () => {
    const primaryFn = vi.fn().mockRejectedValue(new Error('Primary failed'))
    const fallbackFn = vi.fn().mockRejectedValue(new Error('Fallback failed'))

    const result = await ErrorHandler.executeWithFallback(
      primaryFn,
      fallbackFn,
      'test-operation'
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Both test-operation and fallback failed')
  })

  it('should execute with graceful degradation', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Operation failed'))
    const defaultValue = 'default'

    const result = await ErrorHandler.executeWithGracefulDegradation(
      operation,
      defaultValue,
      'test-operation'
    )

    expect(result.success).toBe(true)
    expect(result.data).toBe('default')
    expect(result.fallbackUsed).toBe(true)
  })

  it('should validate with fallback', () => {
    const validator = (data: number) => data > 0
    
    const validResult = ErrorHandler.validateWithFallback(5, validator, 1, 'positive-number')
    expect(validResult.success).toBe(true)
    expect(validResult.data).toBe(5)
    expect(validResult.fallbackUsed).toBe(false)

    const invalidResult = ErrorHandler.validateWithFallback(-5, validator, 1, 'positive-number')
    expect(invalidResult.success).toBe(true)
    expect(invalidResult.data).toBe(1)
    expect(invalidResult.fallbackUsed).toBe(true)
  })

  it('should sanitize error messages', () => {
    const error = 'Database connection failed at /home/user/app/db.js with password=secret123'
    const sanitized = ErrorHandler.sanitizeErrorForClient(error)
    
    expect(sanitized).not.toContain('/home/user/app/db.js')
    expect(sanitized).not.toContain('secret123')
    expect(sanitized).toContain('[PATH]')
    expect(sanitized).toContain('password=[REDACTED]')
  })
})

describe('Error Classes', () => {
  it('should create DataPreparationError correctly', () => {
    const error = new DataPreparationError('Test error', 'test-operation')
    
    expect(error.name).toBe('DataPreparationError')
    expect(error.message).toBe('Test error')
    expect(error.operation).toBe('test-operation')
  })

  it('should create PriceDataError correctly', () => {
    const originalError = new Error('Network error')
    const error = new PriceDataError('Price fetch failed', originalError)
    
    expect(error.name).toBe('PriceDataError')
    expect(error.operation).toBe('price-fetching')
    expect(error.originalError).toBe(originalError)
  })

  it('should create DatabaseError correctly', () => {
    const error = new DatabaseError('Query failed')
    
    expect(error.name).toBe('DatabaseError')
    expect(error.operation).toBe('database-query')
  })

  it('should create CalculationError correctly', () => {
    const error = new CalculationError('Math error')
    
    expect(error.name).toBe('CalculationError')
    expect(error.operation).toBe('calculation')
  })
})

describe('Utility Functions', () => {
  it('should check successful results correctly', () => {
    const successResult = { success: true, data: 'test', fallbackUsed: false }
    const failureResult = { success: false, error: 'failed', fallbackUsed: false }

    expect(isSuccessfulResult(successResult)).toBe(true)
    expect(isSuccessfulResult(failureResult)).toBe(false)
  })

  it('should extract data or throw', () => {
    const successResult = { success: true, data: 'test', fallbackUsed: false }
    const failureResult = { success: false, error: 'failed', fallbackUsed: false }

    expect(extractDataOrThrow(successResult)).toBe('test')
    expect(() => extractDataOrThrow(failureResult)).toThrow(DataPreparationError)
  })

  it('should extract data or return fallback', () => {
    const successResult = { success: true, data: 'test', fallbackUsed: false }
    const failureResult = { success: false, error: 'failed', fallbackUsed: false }

    expect(extractDataOrFallback(successResult, 'fallback')).toBe('test')
    expect(extractDataOrFallback(failureResult, 'fallback')).toBe('fallback')
  })
})

// Note: Decorator tests are commented out due to TypeScript/Vitest compatibility issues
// The decorator functionality is available but requires proper TypeScript configuration
// for experimental decorators in the test environment