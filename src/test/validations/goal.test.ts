import { describe, it, expect } from 'vitest'
import {
  goalSchema,
  updateGoalSchema,
  validateGoal,
  validateUpdateGoal,
} from '../../lib/validations'

describe('Goal Validation', () => {
  describe('goalSchema', () => {
    it('should validate a valid goal', () => {
      const validGoal = {
        name: 'Emergency Fund',
        targetAmount: 500000,
        targetDate: new Date('2025-12-31'),
        priority: 1,
        description: 'Build emergency fund for 6 months expenses',
      }

      expect(() => goalSchema.parse(validGoal)).not.toThrow()
      const result = goalSchema.parse(validGoal)
      expect(result.name).toBe('Emergency Fund')
      expect(result.targetAmount).toBe(500000)
      expect(result.priority).toBe(1)
      expect(result.description).toBe('Build emergency fund for 6 months expenses')
    })

    it('should validate a goal without optional fields', () => {
      const validGoal = {
        name: 'House Purchase',
        targetAmount: 2000000,
        targetDate: new Date('2026-06-30'),
      }

      expect(() => goalSchema.parse(validGoal)).not.toThrow()
      const result = goalSchema.parse(validGoal)
      expect(result.name).toBe('House Purchase')
      expect(result.targetAmount).toBe(2000000)
      expect(result.priority).toBe(1) // Default value
      expect(result.description).toBeUndefined()
    })

    it('should fail validation when name is empty', () => {
      const invalidGoal = {
        name: '',
        targetAmount: 500000,
        targetDate: new Date('2025-12-31'),
      }

      expect(() => goalSchema.parse(invalidGoal)).toThrow('Goal name is required')
    })

    it('should fail validation when targetAmount is zero', () => {
      const invalidGoal = {
        name: 'Emergency Fund',
        targetAmount: 0,
        targetDate: new Date('2025-12-31'),
      }

      expect(() => goalSchema.parse(invalidGoal)).toThrow('Target amount must be positive')
    })

    it('should fail validation when targetAmount is negative', () => {
      const invalidGoal = {
        name: 'Emergency Fund',
        targetAmount: -500000,
        targetDate: new Date('2025-12-31'),
      }

      expect(() => goalSchema.parse(invalidGoal)).toThrow('Target amount must be positive')
    })

    it('should fail validation when priority is less than 1', () => {
      const invalidGoal = {
        name: 'Emergency Fund',
        targetAmount: 500000,
        targetDate: new Date('2025-12-31'),
        priority: 0,
      }

      expect(() => goalSchema.parse(invalidGoal)).toThrow()
    })

    it('should fail validation when priority is greater than 5', () => {
      const invalidGoal = {
        name: 'Emergency Fund',
        targetAmount: 500000,
        targetDate: new Date('2025-12-31'),
        priority: 6,
      }

      expect(() => goalSchema.parse(invalidGoal)).toThrow()
    })

    it('should fail validation when priority is not an integer', () => {
      const invalidGoal = {
        name: 'Emergency Fund',
        targetAmount: 500000,
        targetDate: new Date('2025-12-31'),
        priority: 2.5,
      }

      expect(() => goalSchema.parse(invalidGoal)).toThrow()
    })

    it('should convert string date to Date object', () => {
      const goal = {
        name: 'Emergency Fund',
        targetAmount: 500000,
        targetDate: '2025-12-31',
      }

      const result = goalSchema.parse(goal)
      expect(result.targetDate).toBeInstanceOf(Date)
      expect(result.targetDate.getFullYear()).toBe(2025)
    })

    it('should validate all priority values from 1 to 5', () => {
      for (let priority = 1; priority <= 5; priority++) {
        const goal = {
          name: 'Test Goal',
          targetAmount: 100000,
          targetDate: new Date('2025-12-31'),
          priority,
        }

        expect(() => goalSchema.parse(goal)).not.toThrow()
        const result = goalSchema.parse(goal)
        expect(result.priority).toBe(priority)
      }
    })
  })

  describe('updateGoalSchema', () => {
    it('should validate partial update data', () => {
      const updateData = {
        name: 'Updated Emergency Fund',
        targetAmount: 600000,
      }

      expect(() => updateGoalSchema.parse(updateData)).not.toThrow()
      const result = updateGoalSchema.parse(updateData)
      expect(result.name).toBe('Updated Emergency Fund')
      expect(result.targetAmount).toBe(600000)
    })

    it('should allow empty update object', () => {
      const updateData = {}

      expect(() => updateGoalSchema.parse(updateData)).not.toThrow()
    })

    it('should fail validation for empty name in update', () => {
      const updateData = {
        name: '',
      }

      expect(() => updateGoalSchema.parse(updateData)).toThrow()
    })

    it('should fail validation for negative targetAmount in update', () => {
      const updateData = {
        targetAmount: -100000,
      }

      expect(() => updateGoalSchema.parse(updateData)).toThrow()
    })

    it('should fail validation for invalid priority in update', () => {
      const updateData = {
        priority: 10,
      }

      expect(() => updateGoalSchema.parse(updateData)).toThrow()
    })

    it('should validate date string conversion in update', () => {
      const updateData = {
        targetDate: '2026-01-01',
      }

      const result = updateGoalSchema.parse(updateData)
      expect(result.targetDate).toBeInstanceOf(Date)
      expect(result.targetDate?.getFullYear()).toBe(2026)
    })
  })

  describe('validateGoal helper function', () => {
    it('should validate valid goal data', () => {
      const validData = {
        name: 'Retirement Fund',
        targetAmount: 10000000,
        targetDate: new Date('2040-12-31'),
        priority: 2,
        description: 'Long-term retirement planning',
      }

      expect(() => validateGoal(validData)).not.toThrow()
      const result = validateGoal(validData)
      expect(result.name).toBe('Retirement Fund')
      expect(result.targetAmount).toBe(10000000)
      expect(result.priority).toBe(2)
    })

    it('should throw error for invalid goal data', () => {
      const invalidData = {
        name: '',
        targetAmount: 500000,
        targetDate: new Date('2025-12-31'),
      }

      expect(() => validateGoal(invalidData)).toThrow()
    })
  })

  describe('validateUpdateGoal helper function', () => {
    it('should validate valid update data', () => {
      const validUpdateData = {
        name: 'Updated Goal',
        targetAmount: 750000,
        priority: 3,
      }

      expect(() => validateUpdateGoal(validUpdateData)).not.toThrow()
      const result = validateUpdateGoal(validUpdateData)
      expect(result.name).toBe('Updated Goal')
      expect(result.targetAmount).toBe(750000)
      expect(result.priority).toBe(3)
    })

    it('should throw error for invalid update data', () => {
      const invalidUpdateData = {
        name: '',
      }

      expect(() => validateUpdateGoal(invalidUpdateData)).toThrow()
    })
  })
})