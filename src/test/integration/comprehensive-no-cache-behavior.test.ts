/**
 * Comprehensive No-Cache Behavior Integration Tests
 * 
 * This test suite verifies that user data changes are immediately visible
 * across all components and pages without any caching delays.
 * 
 * Requirements tested:
 * - 1.1: User data changes reflected immediately after CRUD operations
 * - 2.1: Pricing data served from database cache only
 * - 3.1: Manual refresh functionality works correctly
 * - 4.1: System maintains data consistency and performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createInvestment, updateInvestment, deleteInvestment } from '@/lib/server/actions/investments'
import { createGoal, updateGoal, deleteGoal } from '@/lib/server/actions/goals'
import { createAccount, updateAccount, deleteAccount } from '@/lib/server/actions/accounts'
import { createSip, updateSip, deleteSip } from '@/lib/server/actions/sips'
import { DashboardDataPreparator } from '@/lib/server/data-preparators/dashboard'
import { InvestmentsDataPreparator } from '@/lib/server/data-preparators/investments'
import { GoalsDataPreparator } from '@/lib/server/data-preparators/goals'
import { AccountsDataPreparator } from '@/lib/server/data-preparators/accounts'
import { SIPsDataPreparator } from '@/lib/server/data-preparators/sips'
import { refreshDashboard } from '@/app/actions/dashboard'

describe('Comprehensive No-Cache Behavior Integration Tests', () => {
  let testAccount: any
  let testGoal: any
  let testInvestment: any
  let testSip: any

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.investment.deleteMany({
      where: { name: { contains: 'TEST_NO_CACHE' } }
    })
    await prisma.sIP.deleteMany({
      where: { name: { contains: 'TEST_NO_CACHE' } }
    })
    await prisma.goal.deleteMany({
      where: { name: { contains: 'TEST_NO_CACHE' } }
    })
    await prisma.account.deleteMany({
      where: { name: { contains: 'TEST_NO_CACHE' } }
    })

    // Create test account
    const accountFormData = new FormData()
    accountFormData.append('name', 'TEST_NO_CACHE_ACCOUNT')
    accountFormData.append('type', 'BROKER')
    
    const accountResult = await createAccount(accountFormData)
    expect(accountResult.success).toBe(true)
    testAccount = accountResult.data

    // Create test goal
    const goalFormData = new FormData()
    goalFormData.append('name', 'TEST_NO_CACHE_GOAL')
    goalFormData.append('targetAmount', '100000')
    goalFormData.append('targetDate', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString())
    
    const goalResult = await createGoal(goalFormData)
    expect(goalResult.success).toBe(true)
    testGoal = goalResult.data
  })

  afterEach(async () => {
    // Clean up test data
    if (testSip) {
      await deleteSip(testSip.id).catch(() => {})
    }
    if (testInvestment) {
      await deleteInvestment(testInvestment.id).catch(() => {})
    }
    if (testGoal) {
      await deleteGoal(testGoal.id).catch(() => {})
    }
    if (testAccount) {
      await deleteAccount(testAccount.id).catch(() => {})
    }
  })

  describe('Cross-Component Data Consistency', () => {
    it('should reflect investment changes across all data preparators immediately', async () => {
      // Create investment
      const investmentFormData = new FormData()
      investmentFormData.append('type', 'STOCK')
      investmentFormData.append('name', 'TEST_NO_CACHE_CROSS_COMPONENT')
      investmentFormData.append('symbol', 'TEST')
      investmentFormData.append('units', '100')
      investmentFormData.append('buyPrice', '50')
      investmentFormData.append('buyDate', new Date().toISOString())
      investmentFormData.append('accountId', testAccount.id)
      investmentFormData.append('goalId', testGoal.id)

      const createResult = await createInvestment(investmentFormData)
      expect(createResult.success).toBe(true)
      testInvestment = createResult.data

      // Check all data preparators immediately
      const [dashboardData, investmentsData, goalsData, accountsData] = await Promise.all([
        new DashboardDataPreparator().prepare(),
        new InvestmentsDataPreparator().prepare(),
        new GoalsDataPreparator().prepare(),
        new AccountsDataPreparator().prepare()
      ])

      // Verify investment is visible in investments page
      const foundInInvestments = investmentsData.investments.find(inv => inv.id === testInvestment.id)
      expect(foundInInvestments).toBeDefined()
      expect(foundInInvestments?.name).toBe('TEST_NO_CACHE_CROSS_COMPONENT')

      // Verify investment is visible in dashboard
      const foundInDashboard = dashboardData.investmentsWithValues.find(inv => inv.id === testInvestment.id)
      expect(foundInDashboard).toBeDefined()
      expect(foundInDashboard?.name).toBe('TEST_NO_CACHE_CROSS_COMPONENT')

      // Verify goal progress is updated
      const goalProgress = dashboardData.goalProgress.find(gp => gp.goalId === testGoal.id)
      expect(goalProgress).toBeDefined()
      expect(goalProgress?.currentValue).toBeGreaterThan(0)

      // Verify goal shows the investment
      const goalWithInvestments = goalsData.goals.find(g => g.id === testGoal.id)
      expect(goalWithInvestments?.investments).toBeDefined()
      expect(goalWithInvestments?.investments.length).toBeGreaterThan(0)

      // Verify account shows the investment
      const accountWithInvestments = accountsData.accounts.find(a => a.id === testAccount.id)
      expect(accountWithInvestments?.investments).toBeDefined()
      expect(accountWithInvestments?.investments.length).toBeGreaterThan(0)
    })

    it('should reflect SIP changes across all components immediately', async () => {
      // Create SIP
      const sipFormData = new FormData()
      sipFormData.append('name', 'TEST_NO_CACHE_SIP_CROSS')
      sipFormData.append('symbol', '120503')
      sipFormData.append('amount', '5000')
      sipFormData.append('frequency', 'MONTHLY')
      sipFormData.append('startDate', new Date().toISOString())
      sipFormData.append('accountId', testAccount.id)
      sipFormData.append('goalId', testGoal.id)

      const createResult = await createSip(sipFormData)
      expect(createResult.success).toBe(true)
      testSip = createResult.data

      // Check all data preparators immediately
      const [dashboardData, sipsData, goalsData, accountsData] = await Promise.all([
        new DashboardDataPreparator().prepare(),
        new SIPsDataPreparator().prepare(),
        new GoalsDataPreparator().prepare(),
        new AccountsDataPreparator().prepare()
      ])

      // Verify SIP is visible in SIPs page
      const foundInSips = sipsData.sips.find(sip => sip.id === testSip.id)
      expect(foundInSips).toBeDefined()
      expect(foundInSips?.name).toBe('TEST_NO_CACHE_SIP_CROSS')

      // Verify SIP is visible in dashboard
      const foundInDashboard = dashboardData.activeSIPs.find(sip => sip.id === testSip.id)
      expect(foundInDashboard).toBeDefined()
      expect(foundInDashboard?.name).toBe('TEST_NO_CACHE_SIP_CROSS')

      // Verify goal shows the SIP
      const goalWithSips = goalsData.goals.find(g => g.id === testGoal.id)
      expect(goalWithSips?.sips).toBeDefined()
      expect(goalWithSips?.sips.length).toBeGreaterThan(0)

      // Verify account shows the SIP
      const accountWithSips = accountsData.accounts.find(a => a.id === testAccount.id)
      expect(accountWithSips?.sips).toBeDefined()
      expect(accountWithSips?.sips.length).toBeGreaterThan(0)
    })
  })

  describe('Rapid CRUD Operations', () => {
    it('should handle rapid sequential operations without cache interference', async () => {
      const operations = []
      const startTime = Date.now()

      // Perform rapid CRUD operations
      for (let i = 0; i < 5; i++) {
        // Create
        const investmentFormData = new FormData()
        investmentFormData.append('type', 'STOCK')
        investmentFormData.append('name', `TEST_NO_CACHE_RAPID_${i}`)
        investmentFormData.append('symbol', 'TEST')
        investmentFormData.append('units', '100')
        investmentFormData.append('buyPrice', '50')
        investmentFormData.append('buyDate', new Date().toISOString())
        investmentFormData.append('accountId', testAccount.id)

        const createResult = await createInvestment(investmentFormData)
        expect(createResult.success).toBe(true)
        operations.push(createResult.data)

        // Immediately verify it's visible
        const preparator = new InvestmentsDataPreparator()
        const pageData = await preparator.prepare()
        const found = pageData.investments.find(inv => inv.id === createResult.data.id)
        expect(found).toBeDefined()
        expect(found?.name).toBe(`TEST_NO_CACHE_RAPID_${i}`)

        // Update
        const updateFormData = new FormData()
        updateFormData.append('name', `TEST_NO_CACHE_RAPID_UPDATED_${i}`)
        updateFormData.append('units', '200')

        const updateResult = await updateInvestment(createResult.data.id, updateFormData)
        expect(updateResult.success).toBe(true)

        // Immediately verify update is visible
        const updatedPageData = await preparator.prepare()
        const foundUpdated = updatedPageData.investments.find(inv => inv.id === createResult.data.id)
        expect(foundUpdated?.name).toBe(`TEST_NO_CACHE_RAPID_UPDATED_${i}`)
        expect(foundUpdated?.units).toBe(200)
      }

      const endTime = Date.now()
      console.log(`Rapid CRUD operations completed in ${endTime - startTime}ms`)

      // Clean up
      for (const investment of operations) {
        await deleteInvestment(investment.id)
        
        // Immediately verify deletion
        const preparator = new InvestmentsDataPreparator()
        const pageData = await preparator.prepare()
        const found = pageData.investments.find(inv => inv.id === investment.id)
        expect(found).toBeUndefined()
      }

      // Verify all operations completed in reasonable time (should be fast without cache delays)
      expect(endTime - startTime).toBeLessThan(10000) // Less than 10 seconds
    })

    it('should handle concurrent operations without data corruption', async () => {
      // Create multiple investments concurrently
      const concurrentOperations = Array.from({ length: 3 }, async (_, i) => {
        const investmentFormData = new FormData()
        investmentFormData.append('type', 'STOCK')
        investmentFormData.append('name', `TEST_NO_CACHE_CONCURRENT_${i}`)
        investmentFormData.append('symbol', 'TEST')
        investmentFormData.append('units', '100')
        investmentFormData.append('buyPrice', '50')
        investmentFormData.append('buyDate', new Date().toISOString())
        investmentFormData.append('accountId', testAccount.id)

        return createInvestment(investmentFormData)
      })

      const results = await Promise.all(concurrentOperations)
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Immediately verify all are visible
      const preparator = new InvestmentsDataPreparator()
      const pageData = await preparator.prepare()

      results.forEach((result, i) => {
        const found = pageData.investments.find(inv => inv.id === result.data.id)
        expect(found).toBeDefined()
        expect(found?.name).toBe(`TEST_NO_CACHE_CONCURRENT_${i}`)
      })

      // Clean up
      for (const result of results) {
        await deleteInvestment(result.data.id)
      }
    })
  })

  describe('Dashboard Refresh Integration', () => {
    it('should refresh dashboard data without affecting user data visibility', async () => {
      // Create investment
      const investmentFormData = new FormData()
      investmentFormData.append('type', 'STOCK')
      investmentFormData.append('name', 'TEST_NO_CACHE_DASHBOARD_REFRESH')
      investmentFormData.append('symbol', 'RELIANCE')
      investmentFormData.append('units', '100')
      investmentFormData.append('buyPrice', '2000')
      investmentFormData.append('buyDate', new Date().toISOString())
      investmentFormData.append('accountId', testAccount.id)
      investmentFormData.append('goalId', testGoal.id)

      const createResult = await createInvestment(investmentFormData)
      expect(createResult.success).toBe(true)
      testInvestment = createResult.data

      // Get initial dashboard data
      const initialDashboard = await new DashboardDataPreparator().prepare()
      const initialInvestment = initialDashboard.investmentsWithValues.find(inv => inv.id === testInvestment.id)
      expect(initialInvestment).toBeDefined()

      // Trigger dashboard refresh (this should refresh prices but preserve user data)
      const refreshResult = await refreshDashboard()
      expect(refreshResult.success).toBe(true)

      // Immediately get dashboard data after refresh
      const refreshedDashboard = await new DashboardDataPreparator().prepare()
      const refreshedInvestment = refreshedDashboard.investmentsWithValues.find(inv => inv.id === testInvestment.id)
      
      // User data should still be immediately visible
      expect(refreshedInvestment).toBeDefined()
      expect(refreshedInvestment?.name).toBe('TEST_NO_CACHE_DASHBOARD_REFRESH')
      expect(refreshedInvestment?.units).toBe(100)
      expect(refreshedInvestment?.buyPrice).toBe(2000)

      // Update the investment during refresh
      const updateFormData = new FormData()
      updateFormData.append('name', 'TEST_NO_CACHE_DASHBOARD_REFRESH_UPDATED')
      updateFormData.append('units', '150')

      const updateResult = await updateInvestment(testInvestment.id, updateFormData)
      expect(updateResult.success).toBe(true)

      // Immediately verify update is visible even after refresh
      const finalDashboard = await new DashboardDataPreparator().prepare()
      const finalInvestment = finalDashboard.investmentsWithValues.find(inv => inv.id === testInvestment.id)
      
      expect(finalInvestment).toBeDefined()
      expect(finalInvestment?.name).toBe('TEST_NO_CACHE_DASHBOARD_REFRESH_UPDATED')
      expect(finalInvestment?.units).toBe(150)
    })
  })

  describe('Data Consistency Across Page Navigation', () => {
    it('should maintain consistent data when navigating between pages', async () => {
      // Create investment with goal allocation
      const investmentFormData = new FormData()
      investmentFormData.append('type', 'STOCK')
      investmentFormData.append('name', 'TEST_NO_CACHE_NAVIGATION')
      investmentFormData.append('symbol', 'TEST')
      investmentFormData.append('units', '100')
      investmentFormData.append('buyPrice', '50')
      investmentFormData.append('buyDate', new Date().toISOString())
      investmentFormData.append('accountId', testAccount.id)
      investmentFormData.append('goalId', testGoal.id)

      const createResult = await createInvestment(investmentFormData)
      expect(createResult.success).toBe(true)
      testInvestment = createResult.data

      // Simulate navigation: Dashboard -> Investments -> Goals -> Accounts -> Dashboard
      const dashboardData1 = await new DashboardDataPreparator().prepare()
      const investmentsData = await new InvestmentsDataPreparator().prepare()
      const goalsData = await new GoalsDataPreparator().prepare()
      const accountsData = await new AccountsDataPreparator().prepare()
      const dashboardData2 = await new DashboardDataPreparator().prepare()

      // Verify investment is consistently visible across all pages
      const dashboardInv1 = dashboardData1.investmentsWithValues.find(inv => inv.id === testInvestment.id)
      const investmentsInv = investmentsData.investments.find(inv => inv.id === testInvestment.id)
      const dashboardInv2 = dashboardData2.investmentsWithValues.find(inv => inv.id === testInvestment.id)

      expect(dashboardInv1).toBeDefined()
      expect(investmentsInv).toBeDefined()
      expect(dashboardInv2).toBeDefined()

      // All should have consistent data
      expect(dashboardInv1?.name).toBe('TEST_NO_CACHE_NAVIGATION')
      expect(investmentsInv?.name).toBe('TEST_NO_CACHE_NAVIGATION')
      expect(dashboardInv2?.name).toBe('TEST_NO_CACHE_NAVIGATION')

      // Verify goal shows the investment
      const goalWithInv = goalsData.goals.find(g => g.id === testGoal.id)
      expect(goalWithInv?.investments?.some(inv => inv.id === testInvestment.id)).toBe(true)

      // Verify account shows the investment
      const accountWithInv = accountsData.accounts.find(a => a.id === testAccount.id)
      expect(accountWithInv?.investments?.some(inv => inv.id === testInvestment.id)).toBe(true)
    })
  })

  describe('Performance Under No-Cache Strategy', () => {
    it('should maintain acceptable performance without caching', async () => {
      // Create multiple test data points
      const testData = []
      for (let i = 0; i < 10; i++) {
        const investmentFormData = new FormData()
        investmentFormData.append('type', 'STOCK')
        investmentFormData.append('name', `TEST_NO_CACHE_PERF_${i}`)
        investmentFormData.append('symbol', 'TEST')
        investmentFormData.append('units', '100')
        investmentFormData.append('buyPrice', '50')
        investmentFormData.append('buyDate', new Date().toISOString())
        investmentFormData.append('accountId', testAccount.id)

        const result = await createInvestment(investmentFormData)
        expect(result.success).toBe(true)
        testData.push(result.data)
      }

      // Measure performance of data preparators
      const startTime = Date.now()
      
      const [dashboardData, investmentsData, goalsData, accountsData] = await Promise.all([
        new DashboardDataPreparator().prepare(),
        new InvestmentsDataPreparator().prepare(),
        new GoalsDataPreparator().prepare(),
        new AccountsDataPreparator().prepare()
      ])

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete in reasonable time even without caching
      expect(duration).toBeLessThan(2000) // Less than 2 seconds

      // Verify all data is present
      expect(dashboardData.investmentsWithValues.length).toBeGreaterThanOrEqual(10)
      expect(investmentsData.investments.length).toBeGreaterThanOrEqual(10)

      // Clean up
      for (const investment of testData) {
        await deleteInvestment(investment.id)
      }

      console.log(`Data preparators completed in ${duration}ms without caching`)
    })

    it('should handle database queries efficiently without cache', async () => {
      // Create test investment
      const investmentFormData = new FormData()
      investmentFormData.append('type', 'STOCK')
      investmentFormData.append('name', 'TEST_NO_CACHE_DB_PERF')
      investmentFormData.append('symbol', 'TEST')
      investmentFormData.append('units', '100')
      investmentFormData.append('buyPrice', '50')
      investmentFormData.append('buyDate', new Date().toISOString())
      investmentFormData.append('accountId', testAccount.id)

      const createResult = await createInvestment(investmentFormData)
      expect(createResult.success).toBe(true)
      testInvestment = createResult.data

      // Measure multiple sequential data fetches (simulating rapid page navigation)
      const startTime = Date.now()
      
      for (let i = 0; i < 5; i++) {
        const preparator = new InvestmentsDataPreparator()
        const data = await preparator.prepare()
        
        const found = data.investments.find(inv => inv.id === testInvestment.id)
        expect(found).toBeDefined()
        expect(found?.name).toBe('TEST_NO_CACHE_DB_PERF')
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should handle multiple fetches efficiently
      expect(duration).toBeLessThan(1000) // Less than 1 second for 5 fetches

      console.log(`5 sequential data fetches completed in ${duration}ms`)
    })
  })

  describe('Error Handling Without Cache', () => {
    it('should handle errors gracefully without cache fallback', async () => {
      // Mock a database error scenario
      const originalFindMany = prisma.investment.findMany
      
      // Temporarily mock database error
      vi.spyOn(prisma.investment, 'findMany').mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      // Should handle error gracefully
      await expect(new InvestmentsDataPreparator().prepare())
        .rejects.toThrow('Database connection failed')

      // Restore original function
      vi.mocked(prisma.investment.findMany).mockRestore()

      // Should work normally after error
      const preparator = new InvestmentsDataPreparator()
      const data = await preparator.prepare()
      expect(data.investments).toBeDefined()
    })
  })
})