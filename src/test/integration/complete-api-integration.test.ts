import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { TestDbUtils, TestDataFactory } from '../utils/test-helpers'
import { ApiTestHelpers, mockExternalApis } from '../utils/api-test-helpers'

// Import API handlers
import investmentsHandler from '@/pages/api/investments'
import investmentByIdHandler from '@/pages/api/investments/[id]'
import goalsHandler from '@/pages/api/goals'
import goalByIdHandler from '@/pages/api/goals/[id]'
import accountsHandler from '@/pages/api/accounts'
import accountByIdHandler from '@/pages/api/accounts/[id]'
import dashboardHandler from '@/pages/api/dashboard/summary'
import stockPricesHandler from '@/pages/api/prices/stocks'
import mutualFundPricesHandler from '@/pages/api/prices/mutual-funds'

const mockFetch = vi.fn()
global.fetch = mockFetch

const prisma = new PrismaClient()
const testDb = new TestDbUtils(prisma)

describe('Complete API Integration Tests', () => {
  beforeEach(async () => {
    await testDb.cleanup()
    mockFetch.mockClear()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  describe('Investment API Integration', () => {
    it('should handle complete investment CRUD operations', async () => {
      // Setup prerequisites
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      const investmentData = TestDataFactory.createInvestment({
        goalId: goal.id,
        accountId: account.id
      })

      // CREATE - POST /api/investments
      const createResponse = await ApiTestHelpers.callApiHandler(
        investmentsHandler,
        'POST',
        investmentData
      )

      ApiTestHelpers.expectApiSuccess(createResponse, 201)
      expect(createResponse.data).toHaveProperty('id')
      expect(createResponse.data.name).toBe(investmentData.name)

      const investmentId = createResponse.data.id

      // READ - GET /api/investments
      const listResponse = await ApiTestHelpers.callApiHandler(
        investmentsHandler,
        'GET'
      )

      ApiTestHelpers.expectApiSuccess(listResponse)
      expect(listResponse.data).toHaveLength(1)
      expect(listResponse.data[0].id).toBe(investmentId)

      // READ - GET /api/investments/[id]
      const getResponse = await ApiTestHelpers.callApiHandler(
        investmentByIdHandler,
        'GET',
        null,
        { id: investmentId }
      )

      ApiTestHelpers.expectApiSuccess(getResponse)
      expect(getResponse.data.id).toBe(investmentId)
      expect(getResponse.data.name).toBe(investmentData.name)

      // UPDATE - PUT /api/investments/[id]
      const updateData = { name: 'Updated Investment Name', units: 200 }
      const updateResponse = await ApiTestHelpers.callApiHandler(
        investmentByIdHandler,
        'PUT',
        updateData,
        { id: investmentId }
      )

      ApiTestHelpers.expectApiSuccess(updateResponse)
      expect(updateResponse.data.name).toBe(updateData.name)
      expect(updateResponse.data.units).toBe(updateData.units)

      // DELETE - DELETE /api/investments/[id]
      const deleteResponse = await ApiTestHelpers.callApiHandler(
        investmentByIdHandler,
        'DELETE',
        null,
        { id: investmentId }
      )

      ApiTestHelpers.expectApiSuccess(deleteResponse, 204)

      // Verify deletion
      const verifyResponse = await ApiTestHelpers.callApiHandler(
        investmentByIdHandler,
        'GET',
        null,
        { id: investmentId }
      )

      ApiTestHelpers.expectApiError(verifyResponse, 404)
    })

    it('should validate investment data properly', async () => {
      // Test missing required fields
      const invalidData = { name: 'Test' } // Missing required fields

      const response = await ApiTestHelpers.callApiHandler(
        investmentsHandler,
        'POST',
        invalidData
      )

      ApiTestHelpers.expectValidationError(response)
      expect(response.data.details).toContainEqual(
        expect.objectContaining({ path: ['type'] })
      )
      expect(response.data.details).toContainEqual(
        expect.objectContaining({ path: ['goalId'] })
      )

      // Test invalid data types
      const invalidTypeData = {
        type: 'STOCK',
        name: 'Test Stock',
        units: 'invalid', // Should be number
        buyPrice: -10, // Should be positive
        goalId: 'valid-goal-id',
        accountId: 'valid-account-id',
        buyDate: 'invalid-date'
      }

      const typeResponse = await ApiTestHelpers.callApiHandler(
        investmentsHandler,
        'POST',
        invalidTypeData
      )

      ApiTestHelpers.expectValidationError(typeResponse)
    })

    it('should handle investment type-specific validation', async () => {
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      // Test stock investment without required fields
      const stockWithoutSymbol = {
        type: 'STOCK',
        name: 'Test Stock',
        units: 100,
        buyPrice: 50,
        // Missing symbol
        goalId: goal.id,
        accountId: account.id,
        buyDate: new Date().toISOString()
      }

      const stockResponse = await ApiTestHelpers.callApiHandler(
        investmentsHandler,
        'POST',
        stockWithoutSymbol
      )

      // Should succeed as symbol is optional in our schema
      ApiTestHelpers.expectApiSuccess(stockResponse, 201)

      // Test real estate investment with units (should ignore units)
      const realEstateData = {
        type: 'REAL_ESTATE',
        name: 'Test Property',
        totalValue: 1000000,
        units: 100, // Should be ignored for real estate
        goalId: goal.id,
        accountId: account.id,
        buyDate: new Date().toISOString()
      }

      const realEstateResponse = await ApiTestHelpers.callApiHandler(
        investmentsHandler,
        'POST',
        realEstateData
      )

      ApiTestHelpers.expectApiSuccess(realEstateResponse, 201)
      expect(realEstateResponse.data.totalValue).toBe(1000000)
    })
  })

  describe('Goal API Integration', () => {
    it('should handle goal CRUD with investment relationships', async () => {
      // Create goal
      const goalData = TestDataFactory.createGoal()
      const createResponse = await ApiTestHelpers.callApiHandler(
        goalsHandler,
        'POST',
        goalData
      )

      ApiTestHelpers.expectApiSuccess(createResponse, 201)
      const goalId = createResponse.data.id

      // Create account for investment
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      // Create investment linked to goal
      const investmentData = TestDataFactory.createInvestment({
        goalId,
        accountId: account.id
      })

      await ApiTestHelpers.callApiHandler(
        investmentsHandler,
        'POST',
        investmentData
      )

      // Get goal with investments
      const getResponse = await ApiTestHelpers.callApiHandler(
        goalByIdHandler,
        'GET',
        null,
        { id: goalId, include: 'investments' }
      )

      ApiTestHelpers.expectApiSuccess(getResponse)
      expect(getResponse.data.investments).toHaveLength(1)
      expect(getResponse.data.investments[0].goalId).toBe(goalId)

      // Try to delete goal with investments (should fail or handle gracefully)
      const deleteResponse = await ApiTestHelpers.callApiHandler(
        goalByIdHandler,
        'DELETE',
        null,
        { id: goalId }
      )

      // Depending on implementation, this might fail or cascade delete
      if (deleteResponse.status === 400) {
        expect(deleteResponse.data.error).toContain('linked investments')
      } else {
        ApiTestHelpers.expectApiSuccess(deleteResponse, 204)
      }
    })

    it('should calculate goal progress correctly', async () => {
      const goalData = TestDataFactory.createGoal({
        targetAmount: 100000
      })

      const createResponse = await ApiTestHelpers.callApiHandler(
        goalsHandler,
        'POST',
        goalData
      )

      const goalId = createResponse.data.id
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      // Create investments totaling 30,000
      const investment1 = TestDataFactory.createInvestment({
        goalId,
        accountId: account.id,
        units: 100,
        buyPrice: 200 // 20,000 total
      })

      const investment2 = TestDataFactory.createInvestment({
        goalId,
        accountId: account.id,
        totalValue: 10000
      })

      await ApiTestHelpers.callApiHandler(investmentsHandler, 'POST', investment1)
      await ApiTestHelpers.callApiHandler(investmentsHandler, 'POST', investment2)

      // Mock current prices for calculation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('TESTSTOCK', 250))
      })

      // Get goal with progress calculation
      const progressResponse = await ApiTestHelpers.callApiHandler(
        goalByIdHandler,
        'GET',
        null,
        { id: goalId, includeProgress: 'true' }
      )

      ApiTestHelpers.expectApiSuccess(progressResponse)
      expect(progressResponse.data.currentValue).toBe(35000) // 100*250 + 10000
      expect(progressResponse.data.progressPercentage).toBe(35) // 35000/100000 * 100
      expect(progressResponse.data.remainingAmount).toBe(65000)
    })
  })

  describe('Account API Integration', () => {
    it('should handle account operations with investment totals', async () => {
      // Create account
      const accountData = TestDataFactory.createAccount()
      const createResponse = await ApiTestHelpers.callApiHandler(
        accountsHandler,
        'POST',
        accountData
      )

      ApiTestHelpers.expectApiSuccess(createResponse, 201)
      const accountId = createResponse.data.id

      // Create goal for investments
      const goal = await testDb.createGoal(TestDataFactory.createGoal())

      // Create multiple investments in this account
      const investments = [
        TestDataFactory.createInvestment({
          goalId: goal.id,
          accountId,
          units: 100,
          buyPrice: 50 // 5,000
        }),
        TestDataFactory.createInvestment({
          goalId: goal.id,
          accountId,
          totalValue: 15000
        })
      ]

      for (const investment of investments) {
        await ApiTestHelpers.callApiHandler(investmentsHandler, 'POST', investment)
      }

      // Get account with investment totals
      const getResponse = await ApiTestHelpers.callApiHandler(
        accountByIdHandler,
        'GET',
        null,
        { id: accountId, includeTotals: 'true' }
      )

      ApiTestHelpers.expectApiSuccess(getResponse)
      expect(getResponse.data.totalInvestmentValue).toBe(20000)
      expect(getResponse.data.investmentCount).toBe(2)

      // Try to delete account with investments
      const deleteResponse = await ApiTestHelpers.callApiHandler(
        accountByIdHandler,
        'DELETE',
        null,
        { id: accountId }
      )

      // Should prevent deletion or handle gracefully
      if (deleteResponse.status === 400) {
        expect(deleteResponse.data.error).toContain('linked investments')
      }
    })
  })

  describe('Price API Integration', () => {
    it('should fetch and cache stock prices correctly', async () => {
      // Mock NSE API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2500))
      })

      const response = await ApiTestHelpers.callApiHandler(
        stockPricesHandler,
        'GET',
        null,
        { symbol: 'RELIANCE' }
      )

      ApiTestHelpers.expectApiSuccess(response)
      expect(response.data.symbol).toBe('RELIANCE')
      expect(response.data.price).toBe(2500)
      expect(response.data.source).toBe('NSE')

      // Verify price is cached in database
      const cachedPrice = await prisma.priceCache.findUnique({
        where: { symbol: 'RELIANCE' }
      })

      expect(cachedPrice).toBeTruthy()
      expect(cachedPrice!.price).toBe(2500)
      expect(cachedPrice!.source).toBe('NSE')

      // Second request should use cache (no API call)
      mockFetch.mockClear()

      const cachedResponse = await ApiTestHelpers.callApiHandler(
        stockPricesHandler,
        'GET',
        null,
        { symbol: 'RELIANCE' }
      )

      ApiTestHelpers.expectApiSuccess(cachedResponse)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fetch and parse mutual fund NAV correctly', async () => {
      const amfiResponse = mockExternalApis.amfi.success([
        { code: '120503', name: 'SBI Bluechip Fund', nav: 75.50 },
        { code: '120504', name: 'SBI Small Cap Fund', nav: 125.25 }
      ])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(amfiResponse)
      })

      const response = await ApiTestHelpers.callApiHandler(
        mutualFundPricesHandler,
        'GET',
        null,
        { code: '120503' }
      )

      ApiTestHelpers.expectApiSuccess(response)
      expect(response.data.code).toBe('120503')
      expect(response.data.name).toBe('SBI Bluechip Fund')
      expect(response.data.nav).toBe(75.50)
      expect(response.data.source).toBe('AMFI')

      // Verify caching
      const cachedPrice = await prisma.priceCache.findUnique({
        where: { symbol: '120503' }
      })

      expect(cachedPrice).toBeTruthy()
      expect(cachedPrice!.price).toBe(75.50)
    })

    it('should handle price API failures gracefully', async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const response = await ApiTestHelpers.callApiHandler(
        stockPricesHandler,
        'GET',
        null,
        { symbol: 'INVALID' }
      )

      ApiTestHelpers.expectApiError(response, 500)
      expect(response.data.error).toContain('Failed to fetch price')

      // Should try to return cached price if available
      await testDb.createPriceCache('INVALID', 100, 'NSE')

      const cachedResponse = await ApiTestHelpers.callApiHandler(
        stockPricesHandler,
        'GET',
        null,
        { symbol: 'INVALID' }
      )

      ApiTestHelpers.expectApiSuccess(cachedResponse)
      expect(cachedResponse.data.price).toBe(100)
      expect(cachedResponse.data.cached).toBe(true)
    })
  })

  describe('Dashboard API Integration', () => {
    it('should provide comprehensive portfolio summary', async () => {
      // Setup complete portfolio
      const { goals, accounts, investments } = await testDb.seedTestData()

      // Mock price responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2600))
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockExternalApis.amfi.success([
            { code: '120503', name: 'SBI Bluechip Fund', nav: 80 }
          ]))
        })

      const response = await ApiTestHelpers.callApiHandler(
        dashboardHandler,
        'GET'
      )

      ApiTestHelpers.expectApiSuccess(response)

      // Verify portfolio summary structure
      expect(response.data).toHaveProperty('totalValue')
      expect(response.data).toHaveProperty('totalGainLoss')
      expect(response.data).toHaveProperty('totalGainLossPercentage')
      expect(response.data).toHaveProperty('assetAllocation')
      expect(response.data).toHaveProperty('accountDistribution')
      expect(response.data).toHaveProperty('goalProgress')
      expect(response.data).toHaveProperty('topPerformers')

      // Verify asset allocation
      expect(response.data.assetAllocation).toBeInstanceOf(Array)
      expect(response.data.assetAllocation[0]).toHaveProperty('type')
      expect(response.data.assetAllocation[0]).toHaveProperty('value')
      expect(response.data.assetAllocation[0]).toHaveProperty('percentage')

      // Verify goal progress
      expect(response.data.goalProgress).toBeInstanceOf(Array)
      expect(response.data.goalProgress[0]).toHaveProperty('goalId')
      expect(response.data.goalProgress[0]).toHaveProperty('currentValue')
      expect(response.data.goalProgress[0]).toHaveProperty('progressPercentage')

      // Verify top performers
      expect(response.data.topPerformers).toHaveProperty('gainers')
      expect(response.data.topPerformers).toHaveProperty('losers')
    })

    it('should handle empty portfolio gracefully', async () => {
      const response = await ApiTestHelpers.callApiHandler(
        dashboardHandler,
        'GET'
      )

      ApiTestHelpers.expectApiSuccess(response)
      expect(response.data.totalValue).toBe(0)
      expect(response.data.assetAllocation).toHaveLength(0)
      expect(response.data.goalProgress).toHaveLength(0)
    })
  })

  describe('Cross-API Integration Scenarios', () => {
    it('should maintain data consistency across related operations', async () => {
      // Create goal
      const goalResponse = await ApiTestHelpers.callApiHandler(
        goalsHandler,
        'POST',
        TestDataFactory.createGoal({ targetAmount: 100000 })
      )
      const goalId = goalResponse.data.id

      // Create account
      const accountResponse = await ApiTestHelpers.callApiHandler(
        accountsHandler,
        'POST',
        TestDataFactory.createAccount()
      )
      const accountId = accountResponse.data.id

      // Create investment
      const investmentResponse = await ApiTestHelpers.callApiHandler(
        investmentsHandler,
        'POST',
        TestDataFactory.createInvestment({
          goalId,
          accountId,
          units: 100,
          buyPrice: 500 // 50,000 total
        })
      )
      const investmentId = investmentResponse.data.id

      // Mock price for calculations
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('TESTSTOCK', 600))
      })

      // Get dashboard summary
      const dashboardResponse = await ApiTestHelpers.callApiHandler(
        dashboardHandler,
        'GET'
      )

      // Verify consistency
      expect(dashboardResponse.data.totalValue).toBe(60000) // 100 * 600
      expect(dashboardResponse.data.goalProgress[0].currentValue).toBe(60000)
      expect(dashboardResponse.data.goalProgress[0].progressPercentage).toBe(60)

      // Update investment
      await ApiTestHelpers.callApiHandler(
        investmentByIdHandler,
        'PUT',
        { units: 200 },
        { id: investmentId }
      )

      // Get updated dashboard
      const updatedDashboardResponse = await ApiTestHelpers.callApiHandler(
        dashboardHandler,
        'GET'
      )

      // Verify updated consistency
      expect(updatedDashboardResponse.data.totalValue).toBe(120000) // 200 * 600
      expect(updatedDashboardResponse.data.goalProgress[0].progressPercentage).toBe(120)

      // Delete investment
      await ApiTestHelpers.callApiHandler(
        investmentByIdHandler,
        'DELETE',
        null,
        { id: investmentId }
      )

      // Verify dashboard reflects deletion
      const finalDashboardResponse = await ApiTestHelpers.callApiHandler(
        dashboardHandler,
        'GET'
      )

      expect(finalDashboardResponse.data.totalValue).toBe(0)
      expect(finalDashboardResponse.data.goalProgress[0].currentValue).toBe(0)
    })
  })
})