import { describe, it, expect } from 'vitest'
import { InvestmentType } from '@prisma/client'
import {
  investmentSchema,
  updateInvestmentSchema,
  validateInvestment,
  validateUpdateInvestment,
} from '../../lib/validations'

describe('Investment Validation', () => {
  describe('investmentSchema', () => {
    it('should validate a valid stock investment', () => {
      const validStock = {
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        symbol: 'AAPL',
        units: 10,
        buyPrice: 150.50,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
        notes: 'Tech stock investment',
      }

      expect(() => investmentSchema.parse(validStock)).not.toThrow()
      const result = investmentSchema.parse(validStock)
      expect(result.type).toBe(InvestmentType.STOCK)
      expect(result.name).toBe('Apple Inc.')
      expect(result.units).toBe(10)
      expect(result.buyPrice).toBe(150.50)
    })

    it('should validate a valid mutual fund investment', () => {
      const validMutualFund = {
        type: InvestmentType.MUTUAL_FUND,
        name: 'SBI Bluechip Fund',
        symbol: 'SBI001',
        units: 100,
        buyPrice: 25.75,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(validMutualFund)).not.toThrow()
      const result = investmentSchema.parse(validMutualFund)
      expect(result.type).toBe(InvestmentType.MUTUAL_FUND)
      expect(result.units).toBe(100)
      expect(result.buyPrice).toBe(25.75)
    })

    it('should validate a valid real estate investment', () => {
      const validRealEstate = {
        type: InvestmentType.REAL_ESTATE,
        name: 'Apartment in Mumbai',
        totalValue: 5000000,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
        notes: 'Investment property',
      }

      expect(() => investmentSchema.parse(validRealEstate)).not.toThrow()
      const result = investmentSchema.parse(validRealEstate)
      expect(result.type).toBe(InvestmentType.REAL_ESTATE)
      expect(result.totalValue).toBe(5000000)
    })

    it('should validate a valid gold investment', () => {
      const validGold = {
        type: InvestmentType.GOLD,
        name: 'Gold Coins',
        totalValue: 100000,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(validGold)).not.toThrow()
      const result = investmentSchema.parse(validGold)
      expect(result.type).toBe(InvestmentType.GOLD)
      expect(result.totalValue).toBe(100000)
    })

    it('should validate a valid crypto investment', () => {
      const validCrypto = {
        type: InvestmentType.CRYPTO,
        name: 'Bitcoin',
        symbol: 'BTC',
        units: 0.5,
        buyPrice: 45000,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(validCrypto)).not.toThrow()
      const result = investmentSchema.parse(validCrypto)
      expect(result.type).toBe(InvestmentType.CRYPTO)
      expect(result.units).toBe(0.5)
      expect(result.buyPrice).toBe(45000)
    })

    it('should fail validation when name is empty', () => {
      const invalidInvestment = {
        type: InvestmentType.STOCK,
        name: '',
        symbol: 'AAPL',
        units: 10,
        buyPrice: 150.50,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(invalidInvestment)).toThrow('Investment name is required')
    })

    it('should fail validation when goalId is empty', () => {
      const invalidInvestment = {
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        symbol: 'AAPL',
        units: 10,
        buyPrice: 150.50,
        buyDate: new Date('2024-01-15'),
        goalId: '',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(invalidInvestment)).toThrow('Goal is required')
    })

    it('should fail validation when accountId is empty', () => {
      const invalidInvestment = {
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        symbol: 'AAPL',
        units: 10,
        buyPrice: 150.50,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: '',
      }

      expect(() => investmentSchema.parse(invalidInvestment)).toThrow('Account is required')
    })

    it('should fail validation for stock without units and buyPrice', () => {
      const invalidStock = {
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        symbol: 'AAPL',
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(invalidStock)).toThrow('Invalid investment data for the selected type')
    })

    it('should fail validation for real estate without totalValue', () => {
      const invalidRealEstate = {
        type: InvestmentType.REAL_ESTATE,
        name: 'Apartment in Mumbai',
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(invalidRealEstate)).toThrow('Invalid investment data for the selected type')
    })

    it('should fail validation for negative units', () => {
      const invalidInvestment = {
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        symbol: 'AAPL',
        units: -10,
        buyPrice: 150.50,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(invalidInvestment)).toThrow()
    })

    it('should fail validation for negative buyPrice', () => {
      const invalidInvestment = {
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        symbol: 'AAPL',
        units: 10,
        buyPrice: -150.50,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(invalidInvestment)).toThrow()
    })

    it('should fail validation for negative totalValue', () => {
      const invalidInvestment = {
        type: InvestmentType.REAL_ESTATE,
        name: 'Apartment in Mumbai',
        totalValue: -5000000,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => investmentSchema.parse(invalidInvestment)).toThrow()
    })

    it('should convert string date to Date object', () => {
      const investment = {
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        symbol: 'AAPL',
        units: 10,
        buyPrice: 150.50,
        buyDate: '2024-01-15',
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      const result = investmentSchema.parse(investment)
      expect(result.buyDate).toBeInstanceOf(Date)
      expect(result.buyDate.getFullYear()).toBe(2024)
    })
  })

  describe('updateInvestmentSchema', () => {
    it('should validate partial update data', () => {
      const updateData = {
        name: 'Updated Apple Inc.',
        units: 15,
      }

      expect(() => updateInvestmentSchema.parse(updateData)).not.toThrow()
      const result = updateInvestmentSchema.parse(updateData)
      expect(result.name).toBe('Updated Apple Inc.')
      expect(result.units).toBe(15)
    })

    it('should allow empty update object', () => {
      const updateData = {}

      expect(() => updateInvestmentSchema.parse(updateData)).not.toThrow()
    })

    it('should fail validation for empty name in update', () => {
      const updateData = {
        name: '',
      }

      expect(() => updateInvestmentSchema.parse(updateData)).toThrow()
    })
  })

  describe('validateInvestment helper function', () => {
    it('should validate valid investment data', () => {
      const validData = {
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        symbol: 'AAPL',
        units: 10,
        buyPrice: 150.50,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => validateInvestment(validData)).not.toThrow()
      const result = validateInvestment(validData)
      expect(result.name).toBe('Apple Inc.')
    })

    it('should throw error for invalid investment data', () => {
      const invalidData = {
        type: InvestmentType.STOCK,
        name: '',
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
      }

      expect(() => validateInvestment(invalidData)).toThrow()
    })
  })

  describe('validateUpdateInvestment helper function', () => {
    it('should validate valid update data', () => {
      const validUpdateData = {
        name: 'Updated Investment',
        units: 20,
      }

      expect(() => validateUpdateInvestment(validUpdateData)).not.toThrow()
      const result = validateUpdateInvestment(validUpdateData)
      expect(result.name).toBe('Updated Investment')
      expect(result.units).toBe(20)
    })

    it('should throw error for invalid update data', () => {
      const invalidUpdateData = {
        name: '',
      }

      expect(() => validateUpdateInvestment(invalidUpdateData)).toThrow()
    })
  })
})