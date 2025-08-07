import { InvestmentType, AccountType } from '@prisma/client'

// Test data factories for creating consistent test data
export interface TestInvestment {
  id?: string
  type: InvestmentType
  name: string
  symbol?: string
  units?: number
  buyPrice?: number
  totalValue?: number
  buyDate: Date
  goalId: string
  accountId: string
  notes?: string
}

export interface TestGoal {
  id?: string
  name: string
  targetAmount: number
  targetDate: Date
  priority?: number
  description?: string
}

export interface TestAccount {
  id?: string
  name: string
  type: AccountType
  notes?: string
}

export class TestDataFactory {
  static createInvestment(overrides: Partial<TestInvestment> = {}): TestInvestment {
    return {
      type: InvestmentType.STOCK,
      name: 'Test Stock',
      symbol: 'TESTSTOCK',
      units: 100,
      buyPrice: 50.0,
      buyDate: new Date('2024-01-01'),
      goalId: 'test-goal-id',
      accountId: 'test-account-id',
      notes: 'Test investment',
      ...overrides
    }
  }

  static createMutualFundInvestment(overrides: Partial<TestInvestment> = {}): TestInvestment {
    return {
      type: InvestmentType.MUTUAL_FUND,
      name: 'Test Mutual Fund',
      symbol: 'TESTMF',
      units: 50,
      buyPrice: 100.0,
      buyDate: new Date('2024-01-01'),
      goalId: 'test-goal-id',
      accountId: 'test-account-id',
      ...overrides
    }
  }

  static createRealEstateInvestment(overrides: Partial<TestInvestment> = {}): TestInvestment {
    return {
      type: InvestmentType.REAL_ESTATE,
      name: 'Test Property',
      totalValue: 1000000,
      buyDate: new Date('2024-01-01'),
      goalId: 'test-goal-id',
      accountId: 'test-account-id',
      ...overrides
    }
  }

  static createGoal(overrides: Partial<TestGoal> = {}): TestGoal {
    return {
      name: 'Test Goal',
      targetAmount: 100000,
      targetDate: new Date('2025-12-31'),
      priority: 1,
      description: 'Test financial goal',
      ...overrides
    }
  }

  static createAccount(overrides: Partial<TestAccount> = {}): TestAccount {
    return {
      name: 'Test Broker',
      type: AccountType.BROKER,
      notes: 'Test brokerage account',
      ...overrides
    }
  }

  // Create a complete portfolio setup
  static createPortfolioSetup() {
    const goal = this.createGoal()
    const account = this.createAccount()
    
    const investments = [
      this.createInvestment({ goalId: goal.id!, accountId: account.id! }),
      this.createMutualFundInvestment({ goalId: goal.id!, accountId: account.id! }),
      this.createRealEstateInvestment({ goalId: goal.id!, accountId: account.id! })
    ]

    return { goal, account, investments }
  }

  // Create test data with realistic values
  static createRealisticPortfolio() {
    const retirementGoal = this.createGoal({
      name: 'Retirement Fund',
      targetAmount: 5000000,
      targetDate: new Date('2040-12-31'),
      priority: 1
    })

    const houseGoal = this.createGoal({
      name: 'House Purchase',
      targetAmount: 2000000,
      targetDate: new Date('2027-06-30'),
      priority: 2
    })

    const zerodhaAccount = this.createAccount({
      name: 'Zerodha',
      type: AccountType.BROKER
    })

    const hdfcAccount = this.createAccount({
      name: 'HDFC Bank',
      type: AccountType.BANK
    })

    const investments = [
      this.createInvestment({
        name: 'Reliance Industries',
        symbol: 'RELIANCE',
        units: 50,
        buyPrice: 2500,
        goalId: retirementGoal.id!,
        accountId: zerodhaAccount.id!
      }),
      this.createMutualFundInvestment({
        name: 'SBI Bluechip Fund',
        symbol: '120503',
        units: 100,
        buyPrice: 75,
        goalId: retirementGoal.id!,
        accountId: hdfcAccount.id!
      }),
      this.createRealEstateInvestment({
        name: 'Apartment in Mumbai',
        totalValue: 1500000,
        goalId: houseGoal.id!,
        accountId: hdfcAccount.id!
      })
    ]

    return {
      goals: [retirementGoal, houseGoal],
      accounts: [zerodhaAccount, hdfcAccount],
      investments
    }
  }
}