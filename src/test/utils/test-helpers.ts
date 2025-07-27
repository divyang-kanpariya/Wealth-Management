import { PrismaClient } from '@prisma/client'
import { vi, expect } from 'vitest'
import { TestDataFactory, TestInvestment, TestGoal, TestAccount } from '../factories'

// Test database utilities
export class TestDbUtils {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  // Clean up all test data
  async cleanup() {
    await this.prisma.investment.deleteMany()
    await this.prisma.goal.deleteMany()
    await this.prisma.account.deleteMany()
    await this.prisma.priceCache.deleteMany()
  }

  // Seed test data
  async seedTestData() {
    const { goals, accounts, investments } = TestDataFactory.createRealisticPortfolio()
    
    // Create goals
    const createdGoals = await Promise.all(
      goals.map(goal => this.prisma.goal.create({ data: goal }))
    )

    // Create accounts
    const createdAccounts = await Promise.all(
      accounts.map(account => this.prisma.account.create({ data: account }))
    )

    // Update investment references and create investments
    const investmentsWithIds = investments.map((investment, index) => ({
      ...investment,
      goalId: createdGoals[index < 2 ? 0 : 1].id,
      accountId: createdAccounts[index < 1 ? 0 : 1].id
    }))

    const createdInvestments = await Promise.all(
      investmentsWithIds.map(investment => 
        this.prisma.investment.create({ data: investment })
      )
    )

    return {
      goals: createdGoals,
      accounts: createdAccounts,
      investments: createdInvestments
    }
  }

  // Create individual entities
  async createGoal(data: TestGoal) {
    return this.prisma.goal.create({ data })
  }

  async createAccount(data: TestAccount) {
    return this.prisma.account.create({ data })
  }

  async createInvestment(data: TestInvestment) {
    return this.prisma.investment.create({ data })
  }

  // Create price cache entries for testing
  async createPriceCache(symbol: string, price: number, source: string = 'NSE') {
    return this.prisma.priceCache.create({
      data: {
        symbol,
        price,
        source,
        lastUpdated: new Date()
      }
    })
  }
}

// Mock API response helpers
export class MockApiHelpers {
  static createNSEResponse(symbol: string, price: number) {
    return {
      info: {
        symbol,
        companyName: `${symbol} Limited`,
        lastPrice: price,
        change: 5.25,
        pChange: 2.15
      }
    }
  }

  static createAMFIResponse(schemes: Array<{ code: string; name: string; nav: number }>) {
    const header = 'Scheme Code;ISIN Div Payout/ ISIN Growth;Scheme Name;Net Asset Value;Date'
    const rows = schemes.map(scheme => 
      `${scheme.code};;${scheme.name};${scheme.nav};01-Jan-2024`
    )
    return [header, ...rows].join('\n')
  }

  static mockFetch(responses: Record<string, any>) {
    return vi.fn().mockImplementation((url: string) => {
      const response = responses[url]
      if (!response) {
        return Promise.reject(new Error(`No mock response for ${url}`))
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response.json || response),
        text: () => Promise.resolve(response.text || JSON.stringify(response))
      })
    })
  }
}

// Test assertion helpers
export class TestAssertions {
  static expectInvestmentToMatch(actual: any, expected: TestInvestment) {
    expect(actual.type).toBe(expected.type)
    expect(actual.name).toBe(expected.name)
    expect(actual.symbol).toBe(expected.symbol)
    expect(actual.units).toBe(expected.units)
    expect(actual.buyPrice).toBe(expected.buyPrice)
    expect(actual.totalValue).toBe(expected.totalValue)
    expect(actual.goalId).toBe(expected.goalId)
    expect(actual.accountId).toBe(expected.accountId)
  }

  static expectGoalToMatch(actual: any, expected: TestGoal) {
    expect(actual.name).toBe(expected.name)
    expect(actual.targetAmount).toBe(expected.targetAmount)
    expect(actual.priority).toBe(expected.priority)
    expect(actual.description).toBe(expected.description)
  }

  static expectAccountToMatch(actual: any, expected: TestAccount) {
    expect(actual.name).toBe(expected.name)
    expect(actual.type).toBe(expected.type)
    expect(actual.notes).toBe(expected.notes)
  }

  static expectPortfolioCalculations(portfolio: any) {
    expect(portfolio).toHaveProperty('totalValue')
    expect(portfolio).toHaveProperty('totalGainLoss')
    expect(portfolio).toHaveProperty('totalGainLossPercentage')
    expect(typeof portfolio.totalValue).toBe('number')
    expect(typeof portfolio.totalGainLoss).toBe('number')
    expect(typeof portfolio.totalGainLossPercentage).toBe('number')
  }
}

// Performance testing utilities
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    return { result, duration: end - start }
  }

  static expectExecutionTimeUnder(duration: number, maxTime: number) {
    expect(duration).toBeLessThan(maxTime)
  }

  static async createLargeDataset(size: number) {
    const investments = []
    for (let i = 0; i < size; i++) {
      investments.push(TestDataFactory.createInvestment({
        name: `Investment ${i}`,
        symbol: `STOCK${i}`,
        units: Math.random() * 1000,
        buyPrice: Math.random() * 100
      }))
    }
    return investments
  }
}