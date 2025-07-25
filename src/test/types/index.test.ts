import { describe, it, expect } from 'vitest'
import { InvestmentType, AccountType } from '@prisma/client'
import type {
  Investment,
  Goal,
  Account,
  PriceCache,
  InvestmentWithCurrentValue,
  PortfolioSummary,
  GoalProgress,
  DashboardSummary,
  PriceResponse,
} from '../../types'

describe('TypeScript Types', () => {
  describe('Investment Type', () => {
    it('should have all required properties', () => {
      const investment: Investment = {
        id: 'inv-123',
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        symbol: 'AAPL',
        units: 10,
        buyPrice: 150.50,
        quantity: 10,
        totalValue: undefined,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
        notes: 'Tech stock investment',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(investment.id).toBe('inv-123')
      expect(investment.type).toBe(InvestmentType.STOCK)
      expect(investment.name).toBe('Apple Inc.')
      expect(investment.symbol).toBe('AAPL')
      expect(investment.units).toBe(10)
      expect(investment.buyPrice).toBe(150.50)
      expect(investment.quantity).toBe(10)
      expect(investment.buyDate).toBeInstanceOf(Date)
      expect(investment.goalId).toBe('goal-123')
      expect(investment.accountId).toBe('account-456')
      expect(investment.notes).toBe('Tech stock investment')
      expect(investment.createdAt).toBeInstanceOf(Date)
      expect(investment.updatedAt).toBeInstanceOf(Date)
    })

    it('should allow optional properties to be undefined', () => {
      const investment: Investment = {
        id: 'inv-123',
        type: InvestmentType.REAL_ESTATE,
        name: 'Apartment',
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(investment.symbol).toBeUndefined()
      expect(investment.units).toBeUndefined()
      expect(investment.buyPrice).toBeUndefined()
      expect(investment.quantity).toBeUndefined()
      expect(investment.totalValue).toBeUndefined()
      expect(investment.notes).toBeUndefined()
    })

    it('should allow related objects', () => {
      const goal: Goal = {
        id: 'goal-123',
        name: 'Emergency Fund',
        targetAmount: 500000,
        targetDate: new Date('2025-12-31'),
        priority: 1,
        description: 'Emergency fund',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const account: Account = {
        id: 'account-456',
        name: 'Zerodha',
        type: AccountType.BROKER,
        notes: 'Primary trading account',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const investment: Investment = {
        id: 'inv-123',
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        goal,
        account,
      }

      expect(investment.goal).toBe(goal)
      expect(investment.account).toBe(account)
    })
  })

  describe('Goal Type', () => {
    it('should have all required properties', () => {
      const goal: Goal = {
        id: 'goal-123',
        name: 'Emergency Fund',
        targetAmount: 500000,
        targetDate: new Date('2025-12-31'),
        priority: 1,
        description: 'Build emergency fund',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(goal.id).toBe('goal-123')
      expect(goal.name).toBe('Emergency Fund')
      expect(goal.targetAmount).toBe(500000)
      expect(goal.targetDate).toBeInstanceOf(Date)
      expect(goal.priority).toBe(1)
      expect(goal.description).toBe('Build emergency fund')
      expect(goal.createdAt).toBeInstanceOf(Date)
      expect(goal.updatedAt).toBeInstanceOf(Date)
    })

    it('should allow optional properties to be undefined', () => {
      const goal: Goal = {
        id: 'goal-123',
        name: 'Emergency Fund',
        targetAmount: 500000,
        targetDate: new Date('2025-12-31'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(goal.priority).toBeUndefined()
      expect(goal.description).toBeUndefined()
      expect(goal.investments).toBeUndefined()
    })
  })

  describe('Account Type', () => {
    it('should have all required properties', () => {
      const account: Account = {
        id: 'account-456',
        name: 'Zerodha',
        type: AccountType.BROKER,
        notes: 'Primary trading account',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(account.id).toBe('account-456')
      expect(account.name).toBe('Zerodha')
      expect(account.type).toBe(AccountType.BROKER)
      expect(account.notes).toBe('Primary trading account')
      expect(account.createdAt).toBeInstanceOf(Date)
      expect(account.updatedAt).toBeInstanceOf(Date)
    })

    it('should allow optional properties to be undefined', () => {
      const account: Account = {
        id: 'account-456',
        name: 'Zerodha',
        type: AccountType.BROKER,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(account.notes).toBeUndefined()
      expect(account.investments).toBeUndefined()
    })
  })

  describe('PriceCache Type', () => {
    it('should have all required properties', () => {
      const priceCache: PriceCache = {
        id: 'price-123',
        symbol: 'AAPL',
        price: 150.50,
        lastUpdated: new Date(),
        source: 'NSE',
      }

      expect(priceCache.id).toBe('price-123')
      expect(priceCache.symbol).toBe('AAPL')
      expect(priceCache.price).toBe(150.50)
      expect(priceCache.lastUpdated).toBeInstanceOf(Date)
      expect(priceCache.source).toBe('NSE')
    })
  })

  describe('InvestmentWithCurrentValue Type', () => {
    it('should have all required properties', () => {
      const investment: Investment = {
        id: 'inv-123',
        type: InvestmentType.STOCK,
        name: 'Apple Inc.',
        units: 10,
        buyPrice: 150.50,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const investmentWithValue: InvestmentWithCurrentValue = {
        investment,
        currentPrice: 160.00,
        currentValue: 1600.00,
        gainLoss: 95.00,
        gainLossPercentage: 6.31,
      }

      expect(investmentWithValue.investment).toBe(investment)
      expect(investmentWithValue.currentPrice).toBe(160.00)
      expect(investmentWithValue.currentValue).toBe(1600.00)
      expect(investmentWithValue.gainLoss).toBe(95.00)
      expect(investmentWithValue.gainLossPercentage).toBe(6.31)
    })

    it('should allow currentPrice to be undefined', () => {
      const investment: Investment = {
        id: 'inv-123',
        type: InvestmentType.REAL_ESTATE,
        name: 'Apartment',
        totalValue: 5000000,
        buyDate: new Date('2024-01-15'),
        goalId: 'goal-123',
        accountId: 'account-456',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const investmentWithValue: InvestmentWithCurrentValue = {
        investment,
        currentValue: 5000000,
        gainLoss: 0,
        gainLossPercentage: 0,
      }

      expect(investmentWithValue.currentPrice).toBeUndefined()
    })
  })

  describe('PortfolioSummary Type', () => {
    it('should have all required properties', () => {
      const portfolioSummary: PortfolioSummary = {
        totalValue: 1000000,
        totalInvested: 900000,
        totalGainLoss: 100000,
        totalGainLossPercentage: 11.11,
        assetAllocation: {
          STOCK: { value: 600000, percentage: 60 },
          MUTUAL_FUND: { value: 400000, percentage: 40 },
        },
        accountDistribution: {
          'Zerodha': { value: 700000, percentage: 70 },
          'HDFC': { value: 300000, percentage: 30 },
        },
      }

      expect(portfolioSummary.totalValue).toBe(1000000)
      expect(portfolioSummary.totalInvested).toBe(900000)
      expect(portfolioSummary.totalGainLoss).toBe(100000)
      expect(portfolioSummary.totalGainLossPercentage).toBe(11.11)
      expect(portfolioSummary.assetAllocation.STOCK.value).toBe(600000)
      expect(portfolioSummary.accountDistribution['Zerodha'].percentage).toBe(70)
    })
  })

  describe('GoalProgress Type', () => {
    it('should have all required properties', () => {
      const goalProgress: GoalProgress = {
        id: 'goal-123',
        name: 'Emergency Fund',
        targetAmount: 500000,
        currentValue: 300000,
        progress: 60,
        remainingAmount: 200000,
        targetDate: new Date('2025-12-31'),
      }

      expect(goalProgress.id).toBe('goal-123')
      expect(goalProgress.name).toBe('Emergency Fund')
      expect(goalProgress.targetAmount).toBe(500000)
      expect(goalProgress.currentValue).toBe(300000)
      expect(goalProgress.progress).toBe(60)
      expect(goalProgress.remainingAmount).toBe(200000)
      expect(goalProgress.targetDate).toBeInstanceOf(Date)
    })
  })

  describe('DashboardSummary Type', () => {
    it('should have all required properties', () => {
      const portfolioSummary: PortfolioSummary = {
        totalValue: 1000000,
        totalInvested: 900000,
        totalGainLoss: 100000,
        totalGainLossPercentage: 11.11,
        assetAllocation: {},
        accountDistribution: {},
      }

      const goalProgress: GoalProgress[] = [
        {
          id: 'goal-123',
          name: 'Emergency Fund',
          targetAmount: 500000,
          currentValue: 300000,
          progress: 60,
          remainingAmount: 200000,
          targetDate: new Date('2025-12-31'),
        },
      ]

      const dashboardSummary: DashboardSummary = {
        portfolioSummary,
        goalProgress,
        totalInvestments: 15,
        totalGoals: 3,
      }

      expect(dashboardSummary.portfolioSummary).toBe(portfolioSummary)
      expect(dashboardSummary.goalProgress).toBe(goalProgress)
      expect(dashboardSummary.totalInvestments).toBe(15)
      expect(dashboardSummary.totalGoals).toBe(3)
    })
  })

  describe('PriceResponse Type', () => {
    it('should have all required properties', () => {
      const priceResponse: PriceResponse = {
        symbol: 'AAPL',
        price: 150.50,
        source: 'NSE',
        cached: true,
        lastUpdated: new Date(),
      }

      expect(priceResponse.symbol).toBe('AAPL')
      expect(priceResponse.price).toBe(150.50)
      expect(priceResponse.source).toBe('NSE')
      expect(priceResponse.cached).toBe(true)
      expect(priceResponse.lastUpdated).toBeInstanceOf(Date)
    })

    it('should allow warning to be undefined', () => {
      const priceResponse: PriceResponse = {
        symbol: 'AAPL',
        price: 150.50,
        source: 'NSE',
        cached: false,
        lastUpdated: new Date(),
        warning: 'Price data may be stale',
      }

      expect(priceResponse.warning).toBe('Price data may be stale')
    })
  })

  describe('Enum Types', () => {
    it('should export InvestmentType enum', () => {
      expect(InvestmentType.STOCK).toBe('STOCK')
      expect(InvestmentType.MUTUAL_FUND).toBe('MUTUAL_FUND')
      expect(InvestmentType.GOLD).toBe('GOLD')
      expect(InvestmentType.JEWELRY).toBe('JEWELRY')
      expect(InvestmentType.REAL_ESTATE).toBe('REAL_ESTATE')
      expect(InvestmentType.FD).toBe('FD')
      expect(InvestmentType.CRYPTO).toBe('CRYPTO')
      expect(InvestmentType.OTHER).toBe('OTHER')
    })

    it('should export AccountType enum', () => {
      expect(AccountType.BROKER).toBe('BROKER')
      expect(AccountType.DEMAT).toBe('DEMAT')
      expect(AccountType.BANK).toBe('BANK')
      expect(AccountType.OTHER).toBe('OTHER')
    })
  })
})