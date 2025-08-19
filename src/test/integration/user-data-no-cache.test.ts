import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createInvestment, updateInvestment, deleteInvestment } from '@/lib/server/actions/investments'
import { createGoal, updateGoal, deleteGoal } from '@/lib/server/actions/goals'
import { createAccount, updateAccount, deleteAccount } from '@/lib/server/actions/accounts'
import { DashboardDataPreparator } from '@/lib/server/data-preparators/dashboard'
import { InvestmentsDataPreparator } from '@/lib/server/data-preparators/investments'

describe('User Data No-Cache Integration Tests', () => {
  let testAccount: any
  let testGoal: any
  let testInvestment: any

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.investment.deleteMany({
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

  it('should immediately reflect investment creation without cache', async () => {
    // Create investment
    const investmentFormData = new FormData()
    investmentFormData.append('type', 'STOCK')
    investmentFormData.append('name', 'TEST_NO_CACHE_INVESTMENT')
    investmentFormData.append('symbol', 'TEST')
    investmentFormData.append('units', '100')
    investmentFormData.append('buyPrice', '50')
    investmentFormData.append('buyDate', new Date().toISOString())
    investmentFormData.append('accountId', testAccount.id)
    investmentFormData.append('goalId', testGoal.id)

    const createResult = await createInvestment(investmentFormData)
    expect(createResult.success).toBe(true)
    testInvestment = createResult.data

    // Immediately fetch fresh data from data preparator
    const preparator = new InvestmentsDataPreparator()
    const pageData = await preparator.prepare()

    // Verify the new investment is immediately visible
    const foundInvestment = pageData.investments.find(inv => inv.id === testInvestment.id)
    expect(foundInvestment).toBeDefined()
    expect(foundInvestment?.name).toBe('TEST_NO_CACHE_INVESTMENT')
    expect(foundInvestment?.symbol).toBe('TEST')
    expect(foundInvestment?.units).toBe(100)
    expect(foundInvestment?.buyPrice).toBe(50)
  })

  it('should immediately reflect investment updates without cache', async () => {
    // Create investment first
    const investmentFormData = new FormData()
    investmentFormData.append('type', 'STOCK')
    investmentFormData.append('name', 'TEST_NO_CACHE_INVESTMENT_UPDATE')
    investmentFormData.append('symbol', 'TEST')
    investmentFormData.append('units', '100')
    investmentFormData.append('buyPrice', '50')
    investmentFormData.append('buyDate', new Date().toISOString())
    investmentFormData.append('accountId', testAccount.id)

    const createResult = await createInvestment(investmentFormData)
    expect(createResult.success).toBe(true)
    testInvestment = createResult.data

    // Update the investment
    const updateFormData = new FormData()
    updateFormData.append('name', 'TEST_NO_CACHE_INVESTMENT_UPDATED')
    updateFormData.append('units', '200')
    updateFormData.append('buyPrice', '75')

    const updateResult = await updateInvestment(testInvestment.id, updateFormData)
    expect(updateResult.success).toBe(true)

    // Immediately fetch fresh data
    const preparator = new InvestmentsDataPreparator()
    const pageData = await preparator.prepare()

    // Verify the updates are immediately visible
    const foundInvestment = pageData.investments.find(inv => inv.id === testInvestment.id)
    expect(foundInvestment).toBeDefined()
    expect(foundInvestment?.name).toBe('TEST_NO_CACHE_INVESTMENT_UPDATED')
    expect(foundInvestment?.units).toBe(200)
    expect(foundInvestment?.buyPrice).toBe(75)
  })

  it('should immediately reflect investment deletion without cache', async () => {
    // Create investment first
    const investmentFormData = new FormData()
    investmentFormData.append('type', 'STOCK')
    investmentFormData.append('name', 'TEST_NO_CACHE_INVESTMENT_DELETE')
    investmentFormData.append('symbol', 'TEST')
    investmentFormData.append('units', '100')
    investmentFormData.append('buyPrice', '50')
    investmentFormData.append('buyDate', new Date().toISOString())
    investmentFormData.append('accountId', testAccount.id)

    const createResult = await createInvestment(investmentFormData)
    expect(createResult.success).toBe(true)
    testInvestment = createResult.data

    // Verify it exists
    let preparator = new InvestmentsDataPreparator()
    let pageData = await preparator.prepare()
    let foundInvestment = pageData.investments.find(inv => inv.id === testInvestment.id)
    expect(foundInvestment).toBeDefined()

    // Delete the investment
    const deleteResult = await deleteInvestment(testInvestment.id)
    expect(deleteResult.success).toBe(true)

    // Immediately fetch fresh data
    preparator = new InvestmentsDataPreparator()
    pageData = await preparator.prepare()

    // Verify the investment is immediately gone
    foundInvestment = pageData.investments.find(inv => inv.id === testInvestment.id)
    expect(foundInvestment).toBeUndefined()

    testInvestment = null // Prevent cleanup attempt
  })

  it('should immediately reflect changes in dashboard data without cache', async () => {
    // Create investment
    const investmentFormData = new FormData()
    investmentFormData.append('type', 'STOCK')
    investmentFormData.append('name', 'TEST_NO_CACHE_DASHBOARD')
    investmentFormData.append('symbol', 'TEST')
    investmentFormData.append('units', '100')
    investmentFormData.append('buyPrice', '50')
    investmentFormData.append('buyDate', new Date().toISOString())
    investmentFormData.append('accountId', testAccount.id)
    investmentFormData.append('goalId', testGoal.id)

    const createResult = await createInvestment(investmentFormData)
    expect(createResult.success).toBe(true)
    testInvestment = createResult.data

    // Immediately fetch dashboard data
    const dashboardPreparator = new DashboardDataPreparator()
    const dashboardData = await dashboardPreparator.prepare()

    // Verify the new investment is immediately visible in dashboard
    const foundInvestment = dashboardData.investmentsWithValues.find(inv => inv.id === testInvestment.id)
    expect(foundInvestment).toBeDefined()
    expect(foundInvestment?.name).toBe('TEST_NO_CACHE_DASHBOARD')

    // Verify goal progress is updated
    const goalProgress = dashboardData.goalProgress.find(gp => gp.goalId === testGoal.id)
    expect(goalProgress).toBeDefined()
    expect(goalProgress?.currentValue).toBeGreaterThan(0)
  })

  it('should always fetch fresh data without any caching delays', async () => {
    const startTime = Date.now()

    // Create multiple investments rapidly
    const investments = []
    for (let i = 0; i < 3; i++) {
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
      investments.push(createResult.data)

      // Immediately check if it's visible
      const preparator = new InvestmentsDataPreparator()
      const pageData = await preparator.prepare()
      
      const foundInvestment = pageData.investments.find(inv => inv.id === createResult.data.id)
      expect(foundInvestment).toBeDefined()
      expect(foundInvestment?.name).toBe(`TEST_NO_CACHE_RAPID_${i}`)
    }

    const endTime = Date.now()
    console.log(`Rapid CRUD operations completed in ${endTime - startTime}ms`)

    // Clean up
    for (const investment of investments) {
      await deleteInvestment(investment.id)
    }

    // Verify all are immediately gone
    const preparator = new InvestmentsDataPreparator()
    const pageData = await preparator.prepare()
    
    for (const investment of investments) {
      const foundInvestment = pageData.investments.find(inv => inv.id === investment.id)
      expect(foundInvestment).toBeUndefined()
    }
  })
})