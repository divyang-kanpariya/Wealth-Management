import { describe, it, expect, vi } from 'vitest'
import {
  filterInvestments,
  sortInvestments,
  exportToCSV,
  exportToJSON,
  generateExportFilename,
  downloadFile
} from '@/lib/portfolio-utils'
import { InvestmentWithCurrentValue, InvestmentFilters, InvestmentSortOptions } from '@/types'

// Mock data
const mockInvestmentsWithValues: InvestmentWithCurrentValue[] = [
  {
    investment: {
      id: '1',
      type: 'STOCK',
      name: 'Apple Inc',
      symbol: 'AAPL',
      units: 10,
      buyPrice: 150,
      totalValue: undefined,
      buyDate: new Date('2023-01-15'),
      goalId: 'goal1',
      accountId: 'account1',
      notes: 'Tech stock investment',
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2023-01-15'),
      goal: { id: 'goal1', name: 'Retirement', targetAmount: 100000, targetDate: new Date('2030-01-01'), createdAt: new Date(), updatedAt: new Date() },
      account: { id: 'account1', name: 'Zerodha', type: 'BROKER', createdAt: new Date(), updatedAt: new Date() }
    },
    currentPrice: 180,
    currentValue: 1800,
    gainLoss: 300,
    gainLossPercentage: 20
  },
  {
    investment: {
      id: '2',
      type: 'MUTUAL_FUND',
      name: 'SBI Bluechip Fund',
      symbol: 'SBI001',
      units: 100,
      buyPrice: 50,
      totalValue: undefined,
      buyDate: new Date('2023-02-10'),
      goalId: 'goal2',
      accountId: 'account2',
      notes: 'Diversified equity fund',
      createdAt: new Date('2023-02-10'),
      updatedAt: new Date('2023-02-10'),
      goal: { id: 'goal2', name: 'House', targetAmount: 500000, targetDate: new Date('2025-01-01'), createdAt: new Date(), updatedAt: new Date() },
      account: { id: 'account2', name: 'HDFC Bank', type: 'BANK', createdAt: new Date(), updatedAt: new Date() }
    },
    currentPrice: 45,
    currentValue: 4500,
    gainLoss: -500,
    gainLossPercentage: -10
  },
  {
    investment: {
      id: '3',
      type: 'GOLD',
      name: 'Gold Coins',
      symbol: undefined,
      units: undefined,
      buyPrice: undefined,
      totalValue: 50000,
      buyDate: new Date('2023-03-20'),
      goalId: 'goal1',
      accountId: 'account1',
      notes: 'Physical gold',
      createdAt: new Date('2023-03-20'),
      updatedAt: new Date('2023-03-20'),
      goal: { id: 'goal1', name: 'Retirement', targetAmount: 100000, targetDate: new Date('2030-01-01'), createdAt: new Date(), updatedAt: new Date() },
      account: { id: 'account1', name: 'Zerodha', type: 'BROKER', createdAt: new Date(), updatedAt: new Date() }
    },
    currentPrice: undefined,
    currentValue: 50000,
    gainLoss: 0,
    gainLossPercentage: 0
  }
]

describe('filterInvestments', () => {
  it('should return all investments when no filters are applied', () => {
    const filters: InvestmentFilters = {}
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(3)
  })

  it('should filter by search term in name', () => {
    const filters: InvestmentFilters = { search: 'apple' }
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(1)
    expect(result[0].investment.name).toBe('Apple Inc')
  })

  it('should filter by search term in symbol', () => {
    const filters: InvestmentFilters = { search: 'SBI001' }
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(1)
    expect(result[0].investment.symbol).toBe('SBI001')
  })

  it('should filter by search term in notes', () => {
    const filters: InvestmentFilters = { search: 'physical' }
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(1)
    expect(result[0].investment.notes).toBe('Physical gold')
  })

  it('should filter by investment type', () => {
    const filters: InvestmentFilters = { type: 'STOCK' }
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(1)
    expect(result[0].investment.type).toBe('STOCK')
  })

  it('should filter by goal ID', () => {
    const filters: InvestmentFilters = { goalId: 'goal1' }
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(2)
    expect(result.every(inv => inv.investment.goalId === 'goal1')).toBe(true)
  })

  it('should filter by account ID', () => {
    const filters: InvestmentFilters = { accountId: 'account2' }
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(1)
    expect(result[0].investment.accountId).toBe('account2')
  })

  it('should filter by date range', () => {
    const filters: InvestmentFilters = {
      dateRange: {
        start: new Date('2023-02-01'),
        end: new Date('2023-02-28')
      }
    }
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(1)
    expect(result[0].investment.name).toBe('SBI Bluechip Fund')
  })

  it('should filter by value range', () => {
    const filters: InvestmentFilters = {
      valueRange: {
        min: 2000,
        max: 10000
      }
    }
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(1)
    expect(result[0].investment.name).toBe('SBI Bluechip Fund')
  })

  it('should apply multiple filters', () => {
    const filters: InvestmentFilters = {
      type: 'STOCK',
      search: 'apple',
      goalId: 'goal1'
    }
    const result = filterInvestments(mockInvestmentsWithValues, filters)
    expect(result).toHaveLength(1)
    expect(result[0].investment.name).toBe('Apple Inc')
  })
})

describe('sortInvestments', () => {
  it('should sort by name ascending', () => {
    const sortOptions: InvestmentSortOptions = { field: 'name', direction: 'asc' }
    const result = sortInvestments(mockInvestmentsWithValues, sortOptions)
    expect(result[0].investment.name).toBe('Apple Inc')
    expect(result[1].investment.name).toBe('Gold Coins')
    expect(result[2].investment.name).toBe('SBI Bluechip Fund')
  })

  it('should sort by name descending', () => {
    const sortOptions: InvestmentSortOptions = { field: 'name', direction: 'desc' }
    const result = sortInvestments(mockInvestmentsWithValues, sortOptions)
    expect(result[0].investment.name).toBe('SBI Bluechip Fund')
    expect(result[1].investment.name).toBe('Gold Coins')
    expect(result[2].investment.name).toBe('Apple Inc')
  })

  it('should sort by current value descending', () => {
    const sortOptions: InvestmentSortOptions = { field: 'currentValue', direction: 'desc' }
    const result = sortInvestments(mockInvestmentsWithValues, sortOptions)
    expect(result[0].currentValue).toBe(50000)
    expect(result[1].currentValue).toBe(4500)
    expect(result[2].currentValue).toBe(1800)
  })

  it('should sort by gain/loss ascending', () => {
    const sortOptions: InvestmentSortOptions = { field: 'gainLoss', direction: 'asc' }
    const result = sortInvestments(mockInvestmentsWithValues, sortOptions)
    expect(result[0].gainLoss).toBe(-500)
    expect(result[1].gainLoss).toBe(0)
    expect(result[2].gainLoss).toBe(300)
  })

  it('should sort by gain/loss percentage descending', () => {
    const sortOptions: InvestmentSortOptions = { field: 'gainLossPercentage', direction: 'desc' }
    const result = sortInvestments(mockInvestmentsWithValues, sortOptions)
    expect(result[0].gainLossPercentage).toBe(20)
    expect(result[1].gainLossPercentage).toBe(0)
    expect(result[2].gainLossPercentage).toBe(-10)
  })

  it('should sort by buy date ascending', () => {
    const sortOptions: InvestmentSortOptions = { field: 'buyDate', direction: 'asc' }
    const result = sortInvestments(mockInvestmentsWithValues, sortOptions)
    expect(result[0].investment.buyDate).toEqual(new Date('2023-01-15'))
    expect(result[1].investment.buyDate).toEqual(new Date('2023-02-10'))
    expect(result[2].investment.buyDate).toEqual(new Date('2023-03-20'))
  })

  it('should sort by type ascending', () => {
    const sortOptions: InvestmentSortOptions = { field: 'type', direction: 'asc' }
    const result = sortInvestments(mockInvestmentsWithValues, sortOptions)
    expect(result[0].investment.type).toBe('GOLD')
    expect(result[1].investment.type).toBe('MUTUAL_FUND')
    expect(result[2].investment.type).toBe('STOCK')
  })
})

describe('exportToCSV', () => {
  it('should export basic investment data to CSV', () => {
    const options = { format: 'csv' as const, includeCurrentPrices: false }
    const result = exportToCSV(mockInvestmentsWithValues, options)
    
    const lines = result.split('\n')
    expect(lines[0]).toContain('Name,Type,Symbol,Units,Buy Price,Total Value,Buy Date,Goal,Account,Notes')
    expect(lines[1]).toContain('"Apple Inc",STOCK,AAPL,10,150,,15/1/2023,"Retirement","Zerodha","Tech stock investment"')
    expect(lines).toHaveLength(4) // Header + 3 data rows
  })

  it('should export investment data with current prices to CSV', () => {
    const options = { format: 'csv' as const, includeCurrentPrices: true }
    const result = exportToCSV(mockInvestmentsWithValues, options)
    
    const lines = result.split('\n')
    expect(lines[0]).toContain('Current Price,Current Value,Gain/Loss,Gain/Loss %')
    expect(lines[1]).toContain('180,1800,300,20.00%')
    expect(lines[2]).toContain('45,4500,-500,-10.00%')
  })
})

describe('exportToJSON', () => {
  it('should export basic investment data to JSON', () => {
    const options = { format: 'json' as const, includeCurrentPrices: false }
    const result = exportToJSON(mockInvestmentsWithValues, options)
    
    const data = JSON.parse(result)
    expect(data.totalInvestments).toBe(3)
    expect(data.investments).toHaveLength(3)
    expect(data.investments[0]).toHaveProperty('name', 'Apple Inc')
    expect(data.investments[0]).not.toHaveProperty('currentPrice')
  })

  it('should export investment data with current prices to JSON', () => {
    const options = { format: 'json' as const, includeCurrentPrices: true }
    const result = exportToJSON(mockInvestmentsWithValues, options)
    
    const data = JSON.parse(result)
    expect(data.investments[0]).toHaveProperty('currentPrice', 180)
    expect(data.investments[0]).toHaveProperty('currentValue', 1800)
    expect(data.investments[0]).toHaveProperty('gainLoss', 300)
    expect(data.investments[0]).toHaveProperty('gainLossPercentage', 20)
  })
})

describe('generateExportFilename', () => {
  it('should generate CSV filename with current date', () => {
    const filename = generateExportFilename('csv')
    expect(filename).toMatch(/^portfolio-export-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('should generate JSON filename with current date', () => {
    const filename = generateExportFilename('json')
    expect(filename).toMatch(/^portfolio-export-\d{4}-\d{2}-\d{2}\.json$/)
  })
})

describe('downloadFile', () => {
  // Mock DOM APIs
  const mockCreateElement = vi.fn()
  const mockAppendChild = vi.fn()
  const mockRemoveChild = vi.fn()
  const mockClick = vi.fn()
  const mockCreateObjectURL = vi.fn()
  const mockRevokeObjectURL = vi.fn()

  beforeEach(() => {
    const mockLink = {
      href: '',
      download: '',
      click: mockClick
    }

    mockCreateElement.mockReturnValue(mockLink)
    
    Object.defineProperty(global, 'document', {
      value: {
        createElement: mockCreateElement,
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild
        }
      },
      writable: true
    })

    Object.defineProperty(global, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL
      },
      writable: true
    })

    Object.defineProperty(global, 'Blob', {
      value: class MockBlob {
        constructor(content: any[], options: any) {
          // Mock blob implementation
        }
      },
      writable: true
    })

    mockCreateObjectURL.mockReturnValue('blob:mock-url')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create and trigger download', () => {
    const content = 'test content'
    const filename = 'test.csv'
    const mimeType = 'text/csv'

    downloadFile(content, filename, mimeType)

    expect(mockCreateElement).toHaveBeenCalledWith('a')
    expect(mockAppendChild).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRemoveChild).toHaveBeenCalled()
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})