import { describe, it, expect, vi } from 'vitest'
import { MockApiHelpers, TestAssertions, PerformanceTestUtils } from './test-helpers'
import { TestDataFactory } from '../factories'

describe('Test Utilities', () => {
  describe('MockApiHelpers', () => {
    it('should create NSE response correctly', () => {
      const response = MockApiHelpers.createNSEResponse('RELIANCE', 2500)
      
      expect(response.info.symbol).toBe('RELIANCE')
      expect(response.info.companyName).toBe('RELIANCE Limited')
      expect(response.info.lastPrice).toBe(2500)
      expect(response.info.change).toBe(5.25)
      expect(response.info.pChange).toBe(2.15)
    })

    it('should create AMFI response correctly', () => {
      const schemes = [
        { code: '120503', name: 'SBI Bluechip Fund', nav: 75.50 },
        { code: '120504', name: 'SBI Small Cap Fund', nav: 125.25 }
      ]
      
      const response = MockApiHelpers.createAMFIResponse(schemes)
      
      expect(response).toContain('Scheme Code;ISIN Div Payout/ ISIN Growth;Scheme Name;Net Asset Value;Date')
      expect(response).toContain('120503;;SBI Bluechip Fund;75.5;01-Jan-2024')
      expect(response).toContain('120504;;SBI Small Cap Fund;125.25;01-Jan-2024')
    })

    it('should create mock fetch function', () => {
      const responses = {
        '/api/test': { json: { success: true } },
        '/api/error': { text: 'Error response' }
      }
      
      const mockFetch = MockApiHelpers.mockFetch(responses)
      
      expect(mockFetch).toBeInstanceOf(Function)
      expect(vi.isMockFunction(mockFetch)).toBe(true)
    })
  })

  describe('TestAssertions', () => {
    it('should validate investment matching', () => {
      const expected = TestDataFactory.createInvestment({
        name: 'Test Stock',
        symbol: 'TEST',
        units: 100,
        buyPrice: 50
      })
      
      const actual = {
        ...expected,
        id: 'some-id',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Should not throw
      expect(() => {
        TestAssertions.expectInvestmentToMatch(actual, expected)
      }).not.toThrow()
    })

    it('should validate goal matching', () => {
      const expected = TestDataFactory.createGoal({
        name: 'Test Goal',
        targetAmount: 100000,
        priority: 1
      })
      
      const actual = {
        ...expected,
        id: 'some-id',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      expect(() => {
        TestAssertions.expectGoalToMatch(actual, expected)
      }).not.toThrow()
    })

    it('should validate portfolio calculations structure', () => {
      const portfolio = {
        totalValue: 100000,
        totalGainLoss: 5000,
        totalGainLossPercentage: 5.0,
        investments: []
      }
      
      expect(() => {
        TestAssertions.expectPortfolioCalculations(portfolio)
      }).not.toThrow()
    })
  })

  describe('PerformanceTestUtils', () => {
    it('should measure execution time', async () => {
      const testFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'test result'
      }
      
      const { result, duration } = await PerformanceTestUtils.measureExecutionTime(testFunction)
      
      expect(result).toBe('test result')
      expect(duration).toBeGreaterThan(8) // Should be at least 10ms, allowing for some variance
      expect(duration).toBeLessThan(50) // Should not take too long
    })

    it('should validate execution time', () => {
      expect(() => {
        PerformanceTestUtils.expectExecutionTimeUnder(50, 100)
      }).not.toThrow()
      
      expect(() => {
        PerformanceTestUtils.expectExecutionTimeUnder(150, 100)
      }).toThrow()
    })

    it('should create large dataset', async () => {
      const dataset = await PerformanceTestUtils.createLargeDataset(5)
      
      expect(dataset).toHaveLength(5)
      expect(dataset[0]).toHaveProperty('name')
      expect(dataset[0]).toHaveProperty('symbol')
      expect(dataset[0]).toHaveProperty('units')
      expect(dataset[0]).toHaveProperty('buyPrice')
      
      // Verify uniqueness
      const names = dataset.map(item => item.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(5)
    })
  })
})