import { describe, it, expect } from 'vitest'
import {
  calculateInflationAdjustedValue,
  calculatePresentValue,
  calculateRealValue,
  calculateInflationImpact,
  calculateGoalProgressWithInflation
} from '@/lib/calculations'
import { Goal } from '@/types'

describe('Inflation Calculations', () => {
  describe('calculateInflationAdjustedValue', () => {
    it('should calculate future value with inflation correctly', () => {
      const presentValue = 100000
      const inflationRate = 6
      const years = 5
      
      const futureValue = calculateInflationAdjustedValue(presentValue, inflationRate, years)
      
      // 100000 * (1.06)^5 = 133,822.56
      expect(futureValue).toBeCloseTo(133822.56, 2)
    })

    it('should handle zero inflation rate', () => {
      const presentValue = 100000
      const inflationRate = 0
      const years = 5
      
      const futureValue = calculateInflationAdjustedValue(presentValue, inflationRate, years)
      
      expect(futureValue).toBe(presentValue)
    })

    it('should handle zero years', () => {
      const presentValue = 100000
      const inflationRate = 6
      const years = 0
      
      const futureValue = calculateInflationAdjustedValue(presentValue, inflationRate, years)
      
      expect(futureValue).toBe(presentValue)
    })
  })

  describe('calculatePresentValue', () => {
    it('should calculate present value from future value correctly', () => {
      const futureValue = 133822.56
      const inflationRate = 6
      const years = 5
      
      const presentValue = calculatePresentValue(futureValue, inflationRate, years)
      
      // 133822.56 / (1.06)^5 = 100000
      expect(presentValue).toBeCloseTo(100000, 2)
    })

    it('should be inverse of calculateInflationAdjustedValue', () => {
      const originalValue = 100000
      const inflationRate = 6
      const years = 5
      
      const futureValue = calculateInflationAdjustedValue(originalValue, inflationRate, years)
      const backToPresentValue = calculatePresentValue(futureValue, inflationRate, years)
      
      expect(backToPresentValue).toBeCloseTo(originalValue, 2)
    })
  })

  describe('calculateRealValue', () => {
    it('should calculate real purchasing power correctly', () => {
      const futureAmount = 133822.56
      const inflationRate = 6
      const years = 5
      
      const realValue = calculateRealValue(futureAmount, inflationRate, years)
      
      expect(realValue).toBeCloseTo(100000, 2)
    })
  })

  describe('calculateInflationImpact', () => {
    it('should calculate comprehensive inflation impact', () => {
      const amount = 100000
      const inflationRate = 6
      const years = 5
      
      const impact = calculateInflationImpact(amount, inflationRate, years)
      
      expect(impact.presentValue).toBe(amount)
      expect(impact.futureValue).toBeCloseTo(133822.56, 2)
      expect(impact.realValue).toBeCloseTo(100000, 2)
      expect(impact.inflationLoss).toBeCloseTo(33822.56, 2)
      expect(impact.inflationLossPercentage).toBeCloseTo(25.27, 2)
    })
  })

  describe('calculateGoalProgressWithInflation', () => {
    it('should calculate goal progress with inflation adjustment', () => {
      const goal: Goal = {
        id: '1',
        name: 'Test Goal',
        targetAmount: 1000000,
        targetDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years from now
        priority: 1,
        description: 'Test goal',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const investmentsWithValues = [
        {
          investment: {
            id: '1',
            name: 'Test Investment',
            symbol: 'TEST',
            type: 'STOCK' as const,
            units: 100,
            buyPrice: 1000,
            buyDate: new Date(),
            goalId: '1',
            accountId: '1',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          currentPrice: 1200,
          currentValue: 120000,
          gainLoss: 20000,
          gainLossPercentage: 20
        }
      ]

      const inflationRate = 6
      
      const progress = calculateGoalProgressWithInflation(goal, investmentsWithValues, inflationRate)
      
      expect(progress.id).toBe(goal.id)
      expect(progress.currentValue).toBe(120000)
      expect(progress.inflationAdjustedTarget).toBeGreaterThan(goal.targetAmount)
      expect(progress.realProgress).toBeLessThan(progress.progress)
      expect(progress.yearsToTarget).toBeCloseTo(5, 1)
    })

    it('should handle goals with no investments', () => {
      const goal: Goal = {
        id: '1',
        name: 'Test Goal',
        targetAmount: 1000000,
        targetDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
        priority: 1,
        description: 'Test goal',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const progress = calculateGoalProgressWithInflation(goal, [], 6)
      
      expect(progress.currentValue).toBe(0)
      expect(progress.progress).toBe(0)
      expect(progress.realProgress).toBe(0)
      expect(progress.inflationAdjustedTarget).toBeGreaterThan(goal.targetAmount)
    })
  })

  describe('Edge Cases', () => {
    it('should handle negative inflation rates', () => {
      const presentValue = 100000
      const inflationRate = -2 // Deflation
      const years = 5
      
      const futureValue = calculateInflationAdjustedValue(presentValue, inflationRate, years)
      
      // With deflation, future value should be less than present value
      expect(futureValue).toBeLessThan(presentValue)
      expect(futureValue).toBeCloseTo(90392.08, 2)
    })

    it('should handle very high inflation rates', () => {
      const presentValue = 100000
      const inflationRate = 20
      const years = 5
      
      const futureValue = calculateInflationAdjustedValue(presentValue, inflationRate, years)
      
      expect(futureValue).toBeCloseTo(248832, 0)
    })

    it('should handle fractional years', () => {
      const presentValue = 100000
      const inflationRate = 6
      const years = 2.5
      
      const futureValue = calculateInflationAdjustedValue(presentValue, inflationRate, years)
      
      expect(futureValue).toBeCloseTo(115681.70, 2)
    })
  })
})