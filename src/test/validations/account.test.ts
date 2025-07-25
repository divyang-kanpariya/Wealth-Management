import { describe, it, expect } from 'vitest'
import { AccountType } from '@prisma/client'
import {
  accountSchema,
  updateAccountSchema,
  validateAccount,
  validateUpdateAccount,
} from '../../lib/validations'

describe('Account Validation', () => {
  describe('accountSchema', () => {
    it('should validate a valid broker account', () => {
      const validAccount = {
        name: 'Zerodha',
        type: AccountType.BROKER,
        notes: 'Primary trading account',
      }

      expect(() => accountSchema.parse(validAccount)).not.toThrow()
      const result = accountSchema.parse(validAccount)
      expect(result.name).toBe('Zerodha')
      expect(result.type).toBe(AccountType.BROKER)
      expect(result.notes).toBe('Primary trading account')
    })

    it('should validate a valid demat account', () => {
      const validAccount = {
        name: 'HDFC Securities',
        type: AccountType.DEMAT,
        notes: 'Demat account for stock holdings',
      }

      expect(() => accountSchema.parse(validAccount)).not.toThrow()
      const result = accountSchema.parse(validAccount)
      expect(result.name).toBe('HDFC Securities')
      expect(result.type).toBe(AccountType.DEMAT)
    })

    it('should validate a valid bank account', () => {
      const validAccount = {
        name: 'ICICI Bank',
        type: AccountType.BANK,
      }

      expect(() => accountSchema.parse(validAccount)).not.toThrow()
      const result = accountSchema.parse(validAccount)
      expect(result.name).toBe('ICICI Bank')
      expect(result.type).toBe(AccountType.BANK)
      expect(result.notes).toBeUndefined()
    })

    it('should validate a valid other type account', () => {
      const validAccount = {
        name: 'Crypto Exchange',
        type: AccountType.OTHER,
        notes: 'Cryptocurrency trading platform',
      }

      expect(() => accountSchema.parse(validAccount)).not.toThrow()
      const result = accountSchema.parse(validAccount)
      expect(result.name).toBe('Crypto Exchange')
      expect(result.type).toBe(AccountType.OTHER)
    })

    it('should fail validation when name is empty', () => {
      const invalidAccount = {
        name: '',
        type: AccountType.BROKER,
      }

      expect(() => accountSchema.parse(invalidAccount)).toThrow('Account name is required')
    })

    it('should fail validation when type is invalid', () => {
      const invalidAccount = {
        name: 'Test Account',
        type: 'INVALID_TYPE' as AccountType,
      }

      expect(() => accountSchema.parse(invalidAccount)).toThrow()
    })

    it('should validate account without notes', () => {
      const validAccount = {
        name: 'SBI Bank',
        type: AccountType.BANK,
      }

      expect(() => accountSchema.parse(validAccount)).not.toThrow()
      const result = accountSchema.parse(validAccount)
      expect(result.name).toBe('SBI Bank')
      expect(result.type).toBe(AccountType.BANK)
      expect(result.notes).toBeUndefined()
    })

    it('should validate all account types', () => {
      const accountTypes = [
        AccountType.BROKER,
        AccountType.DEMAT,
        AccountType.BANK,
        AccountType.OTHER,
      ]

      accountTypes.forEach((type) => {
        const account = {
          name: `Test ${type} Account`,
          type,
        }

        expect(() => accountSchema.parse(account)).not.toThrow()
        const result = accountSchema.parse(account)
        expect(result.type).toBe(type)
      })
    })
  })

  describe('updateAccountSchema', () => {
    it('should validate partial update data', () => {
      const updateData = {
        name: 'Updated Account Name',
        notes: 'Updated notes',
      }

      expect(() => updateAccountSchema.parse(updateData)).not.toThrow()
      const result = updateAccountSchema.parse(updateData)
      expect(result.name).toBe('Updated Account Name')
      expect(result.notes).toBe('Updated notes')
    })

    it('should allow empty update object', () => {
      const updateData = {}

      expect(() => updateAccountSchema.parse(updateData)).not.toThrow()
    })

    it('should fail validation for empty name in update', () => {
      const updateData = {
        name: '',
      }

      expect(() => updateAccountSchema.parse(updateData)).toThrow()
    })

    it('should validate type update', () => {
      const updateData = {
        type: AccountType.DEMAT,
      }

      expect(() => updateAccountSchema.parse(updateData)).not.toThrow()
      const result = updateAccountSchema.parse(updateData)
      expect(result.type).toBe(AccountType.DEMAT)
    })

    it('should fail validation for invalid type in update', () => {
      const updateData = {
        type: 'INVALID_TYPE' as AccountType,
      }

      expect(() => updateAccountSchema.parse(updateData)).toThrow()
    })

    it('should validate notes update', () => {
      const updateData = {
        notes: 'New notes for the account',
      }

      expect(() => updateAccountSchema.parse(updateData)).not.toThrow()
      const result = updateAccountSchema.parse(updateData)
      expect(result.notes).toBe('New notes for the account')
    })
  })

  describe('validateAccount helper function', () => {
    it('should validate valid account data', () => {
      const validData = {
        name: 'Angel Broking',
        type: AccountType.BROKER,
        notes: 'Secondary trading account',
      }

      expect(() => validateAccount(validData)).not.toThrow()
      const result = validateAccount(validData)
      expect(result.name).toBe('Angel Broking')
      expect(result.type).toBe(AccountType.BROKER)
      expect(result.notes).toBe('Secondary trading account')
    })

    it('should throw error for invalid account data', () => {
      const invalidData = {
        name: '',
        type: AccountType.BROKER,
      }

      expect(() => validateAccount(invalidData)).toThrow()
    })
  })

  describe('validateUpdateAccount helper function', () => {
    it('should validate valid update data', () => {
      const validUpdateData = {
        name: 'Updated Account',
        type: AccountType.BANK,
        notes: 'Updated account notes',
      }

      expect(() => validateUpdateAccount(validUpdateData)).not.toThrow()
      const result = validateUpdateAccount(validUpdateData)
      expect(result.name).toBe('Updated Account')
      expect(result.type).toBe(AccountType.BANK)
      expect(result.notes).toBe('Updated account notes')
    })

    it('should throw error for invalid update data', () => {
      const invalidUpdateData = {
        name: '',
      }

      expect(() => validateUpdateAccount(invalidUpdateData)).toThrow()
    })
  })
})