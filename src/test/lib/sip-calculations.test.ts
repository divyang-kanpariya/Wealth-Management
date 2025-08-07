import { describe, it, expect } from 'vitest'
import {
  calculateSipValue,
  calculateNextSipDate,
  calculateSipSummary,
  getSipsDueForProcessing,
  calculateSipTransactionUnits,
  validateSipData
} from '@/lib/calculations'
import { SIP, SIPTransaction, SIPWithCurrentValue } from '@/types'

// Mock SIP data
const mockSip: SIP = {
  id: 'sip1',
  name: 'HDFC Top 100 SIP',
  symbol: '120716',
  amount: 5000,
  frequency: 'MONTHLY',
  startDate: new Date('2024-01-01'),
  endDate: null,
  status: 'ACTIVE',
  goalId: 'goal1',
  accountId: 'account1',
  notes: 'Monthly SIP',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockTransactions: SIPTransaction[] = [
  {
    id: 'txn1',
    sipId: 'sip1',
    amount: 5000,
    nav: 100,
    units: 50,
    transactionDate: new Date('2024-01-01'),
    status: 'COMPLETED',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'txn2',
    sipId: 'sip1',
    amount: 5000,
    nav: 110,
    units: 45.45,
    transactionDate: new Date('2024-02-01'),
    status: 'COMPLETED',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

describe('calculateSipValue', () => {
  it('should calculate SIP value correctly with current price', () => {
    const result = calculateSipValue(mockSip, mockTransactions, 120)
    
    expect(result.totalInvested).toBe(10000)
    expect(result.totalUnits).toBeCloseTo(95.45, 2)
    expect(result.currentValue).toBeCloseTo(11454, 0)
    expect(result.averageNAV).toBeCloseTo(104.77, 1)
    expect(result.gainLoss).toBeCloseTo(1454, 0)
    expect(result.gainLossPercentage).toBeCloseTo(14.54, 2)
  })

  it('should calculate SIP value without current price', () => {
    const result = calculateSipValue(mockSip, mockTransactions)
    
    expect(result.totalInvested).toBe(10000)
    expect(result.totalUnits).toBeCloseTo(95.45, 2)
    expect(result.currentValue).toBe(10000) // Should equal invested amount
    expect(result.gainLoss).toBe(0)
    expect(result.gainLossPercentage).toBe(0)
  })

  it('should handle empty transactions', () => {
    const result = calculateSipValue(mockSip, [])
    
    expect(result.totalInvested).toBe(0)
    expect(result.totalUnits).toBe(0)
    expect(result.currentValue).toBe(0)
    expect(result.averageNAV).toBe(0)
    expect(result.gainLoss).toBe(0)
    expect(result.gainLossPercentage).toBe(0)
  })
})

describe('calculateNextSipDate', () => {
  it('should calculate next monthly SIP date', () => {
    const nextDate = calculateNextSipDate(mockSip, mockTransactions)
    
    expect(nextDate).toEqual(new Date('2024-03-01'))
  })

  it('should calculate next quarterly SIP date', () => {
    const quarterlySip = { ...mockSip, frequency: 'QUARTERLY' as const }
    const nextDate = calculateNextSipDate(quarterlySip, mockTransactions)
    
    expect(nextDate).toEqual(new Date('2024-05-01'))
  })

  it('should calculate next yearly SIP date', () => {
    const yearlySip = { ...mockSip, frequency: 'YEARLY' as const }
    const nextDate = calculateNextSipDate(yearlySip, mockTransactions)
    
    expect(nextDate).toEqual(new Date('2025-02-01'))
  })

  it('should return start date for SIP with no transactions', () => {
    const nextDate = calculateNextSipDate(mockSip, [])
    
    expect(nextDate).toEqual(mockSip.startDate)
  })

  it('should return undefined for inactive SIP', () => {
    const inactiveSip = { ...mockSip, status: 'PAUSED' as const }
    const nextDate = calculateNextSipDate(inactiveSip, mockTransactions)
    
    expect(nextDate).toBeUndefined()
  })

  it('should return undefined if next date exceeds end date', () => {
    const sipWithEndDate = { ...mockSip, endDate: new Date('2024-02-15') }
    const nextDate = calculateNextSipDate(sipWithEndDate, mockTransactions)
    
    expect(nextDate).toBeUndefined()
  })
})

describe('calculateSipSummary', () => {
  it('should calculate SIP summary correctly', () => {
    const sipsWithValues: SIPWithCurrentValue[] = [
      {
        sip: mockSip,
        totalInvested: 10000,
        totalUnits: 95.45,
        currentValue: 11454,
        averageNAV: 104.76,
        gainLoss: 1454,
        gainLossPercentage: 14.54
      },
      {
        sip: { ...mockSip, id: 'sip2', status: 'PAUSED' },
        totalInvested: 5000,
        totalUnits: 50,
        currentValue: 5500,
        averageNAV: 100,
        gainLoss: 500,
        gainLossPercentage: 10
      }
    ]

    const summary = calculateSipSummary(sipsWithValues)
    
    expect(summary.totalSIPs).toBe(2)
    expect(summary.activeSIPs).toBe(1)
    expect(summary.totalMonthlyAmount).toBe(5000) // Only active SIPs
    expect(summary.totalInvested).toBe(15000)
    expect(summary.totalCurrentValue).toBe(16954)
    expect(summary.totalGainLoss).toBe(1954)
    expect(summary.totalGainLossPercentage).toBeCloseTo(13.03, 2)
  })

  it('should handle quarterly and yearly SIPs in monthly calculation', () => {
    const sipsWithValues: SIPWithCurrentValue[] = [
      {
        sip: { ...mockSip, frequency: 'QUARTERLY', amount: 15000 },
        totalInvested: 15000,
        totalUnits: 150,
        currentValue: 18000,
        averageNAV: 100,
        gainLoss: 3000,
        gainLossPercentage: 20
      },
      {
        sip: { ...mockSip, id: 'sip2', frequency: 'YEARLY', amount: 60000 },
        totalInvested: 60000,
        totalUnits: 600,
        currentValue: 72000,
        averageNAV: 100,
        gainLoss: 12000,
        gainLossPercentage: 20
      }
    ]

    const summary = calculateSipSummary(sipsWithValues)
    
    // Quarterly: 15000/3 = 5000, Yearly: 60000/12 = 5000
    expect(summary.totalMonthlyAmount).toBe(10000)
  })
})

describe('getSipsDueForProcessing', () => {
  it('should identify SIPs due for processing', () => {
    const sips = [mockSip]
    const targetDate = new Date('2024-03-01')
    
    const sipsDue = getSipsDueForProcessing(sips, mockTransactions, targetDate)
    
    expect(sipsDue).toHaveLength(1)
    expect(sipsDue[0].id).toBe('sip1')
  })

  it('should not include inactive SIPs', () => {
    const inactiveSip = { ...mockSip, status: 'PAUSED' as const }
    const sips = [inactiveSip]
    const targetDate = new Date('2024-03-01')
    
    const sipsDue = getSipsDueForProcessing(sips, mockTransactions, targetDate)
    
    expect(sipsDue).toHaveLength(0)
  })

  it('should not include SIPs not yet due', () => {
    const sips = [mockSip]
    const targetDate = new Date('2024-02-15') // Before next due date
    
    const sipsDue = getSipsDueForProcessing(sips, mockTransactions, targetDate)
    
    expect(sipsDue).toHaveLength(0)
  })
})

describe('calculateSipTransactionUnits', () => {
  it('should calculate units correctly', () => {
    const units = calculateSipTransactionUnits(5000, 100)
    
    expect(units).toBe(50)
  })

  it('should handle decimal NAV', () => {
    const units = calculateSipTransactionUnits(5000, 110.25)
    
    expect(units).toBeCloseTo(45.35, 2)
  })

  it('should throw error for zero NAV', () => {
    expect(() => calculateSipTransactionUnits(5000, 0)).toThrow('NAV must be greater than 0')
  })

  it('should throw error for negative NAV', () => {
    expect(() => calculateSipTransactionUnits(5000, -100)).toThrow('NAV must be greater than 0')
  })
})

describe('validateSipData', () => {
  it('should validate correct SIP data', () => {
    const result = validateSipData(mockSip)
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should identify missing name', () => {
    const invalidSip = { ...mockSip, name: '' }
    const result = validateSipData(invalidSip)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('SIP name is required')
  })

  it('should identify missing symbol', () => {
    const invalidSip = { ...mockSip, symbol: '' }
    const result = validateSipData(invalidSip)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Symbol is required')
  })

  it('should identify invalid amount', () => {
    const invalidSip = { ...mockSip, amount: 0 }
    const result = validateSipData(invalidSip)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Amount must be greater than 0')
  })

  it('should identify invalid date range', () => {
    const invalidSip = { 
      ...mockSip, 
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-01-01') // End before start
    }
    const result = validateSipData(invalidSip)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('End date must be after start date')
  })

  it('should identify missing account', () => {
    const invalidSip = { ...mockSip, accountId: '' }
    const result = validateSipData(invalidSip)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Account is required')
  })
})