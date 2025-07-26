import { describe, it, expect } from 'vitest'
import { TestDataFactory } from './index'
import { InvestmentType, AccountType } from '@prisma/client'

describe('TestDataFactory', () => {
  describe('createInvestment', () => {
    it('should create a default stock investment', () => {
      const investment = TestDataFactory.createInvestment()
      
      expect(investment.type).toBe(InvestmentType.STOCK)
      expect(investment.name).toBe('Test Stock')
      expect(investment.symbol).toBe('TESTSTOCK')
      expect(investment.units).toBe(100)
      expect(investment.buyPrice).toBe(50.0)
      expect(investment.goalId).toBe('test-goal-id')
      expect(investment.accountId).toBe('test-account-id')
      expect(investment.buyDate).toBeInstanceOf(Date)
    })

    it('should create investment with custom overrides', () => {
      const customData = {
        name: 'Custom Investment',
        units: 200,
        buyPrice: 75.5
      }
      
      const investment = TestDataFactory.createInvestment(customData)
      
      expect(investment.name).toBe('Custom Investment')
      expect(investment.units).toBe(200)
      expect(investment.buyPrice).toBe(75.5)
      // Other fields should remain default
      expect(investment.type).toBe(InvestmentType.STOCK)
      expect(investment.symbol).toBe('TESTSTOCK')
    })
  })

  describe('createMutualFundInvestment', () => {
    it('should create a mutual fund investment', () => {
      const investment = TestDataFactory.createMutualFundInvestment()
      
      expect(investment.type).toBe(InvestmentType.MUTUAL_FUND)
      expect(investment.name).toBe('Test Mutual Fund')
      expect(investment.symbol).toBe('TESTMF')
      expect(investment.units).toBe(50)
      expect(investment.buyPrice).toBe(100.0)
    })
  })

  describe('createRealEstateInvestment', () => {
    it('should create a real estate investment', () => {
      const investment = TestDataFactory.createRealEstateInvestment()
      
      expect(investment.type).toBe(InvestmentType.REAL_ESTATE)
      expect(investment.name).toBe('Test Property')
      expect(investment.totalValue).toBe(1000000)
      expect(investment.units).toBeUndefined()
      expect(investment.buyPrice).toBeUndefined()
    })
  })

  describe('createGoal', () => {
    it('should create a default goal', () => {
      const goal = TestDataFactory.createGoal()
      
      expect(goal.name).toBe('Test Goal')
      expect(goal.targetAmount).toBe(100000)
      expect(goal.targetDate).toBeInstanceOf(Date)
      expect(goal.priority).toBe(1)
      expect(goal.description).toBe('Test financial goal')
    })

    it('should create goal with custom data', () => {
      const customGoal = TestDataFactory.createGoal({
        name: 'Retirement Fund',
        targetAmount: 5000000,
        priority: 2
      })
      
      expect(customGoal.name).toBe('Retirement Fund')
      expect(customGoal.targetAmount).toBe(5000000)
      expect(customGoal.priority).toBe(2)
      expect(customGoal.description).toBe('Test financial goal') // Default
    })
  })

  describe('createAccount', () => {
    it('should create a default account', () => {
      const account = TestDataFactory.createAccount()
      
      expect(account.name).toBe('Test Broker')
      expect(account.type).toBe(AccountType.BROKER)
      expect(account.notes).toBe('Test brokerage account')
    })

    it('should create account with custom type', () => {
      const bankAccount = TestDataFactory.createAccount({
        name: 'Test Bank',
        type: AccountType.BANK
      })
      
      expect(bankAccount.name).toBe('Test Bank')
      expect(bankAccount.type).toBe(AccountType.BANK)
    })
  })

  describe('createPortfolioSetup', () => {
    it('should create a complete portfolio setup', () => {
      const portfolio = TestDataFactory.createPortfolioSetup()
      
      expect(portfolio.goal).toBeDefined()
      expect(portfolio.account).toBeDefined()
      expect(portfolio.investments).toHaveLength(3)
      
      // Verify investment types
      expect(portfolio.investments[0].type).toBe(InvestmentType.STOCK)
      expect(portfolio.investments[1].type).toBe(InvestmentType.MUTUAL_FUND)
      expect(portfolio.investments[2].type).toBe(InvestmentType.REAL_ESTATE)
      
      // Verify relationships
      portfolio.investments.forEach(investment => {
        expect(investment.goalId).toBe(portfolio.goal.id)
        expect(investment.accountId).toBe(portfolio.account.id)
      })
    })
  })

  describe('createRealisticPortfolio', () => {
    it('should create a realistic portfolio with multiple goals and accounts', () => {
      const portfolio = TestDataFactory.createRealisticPortfolio()
      
      expect(portfolio.goals).toHaveLength(2)
      expect(portfolio.accounts).toHaveLength(2)
      expect(portfolio.investments).toHaveLength(3)
      
      // Verify goal details
      const retirementGoal = portfolio.goals.find(g => g.name === 'Retirement Fund')
      const houseGoal = portfolio.goals.find(g => g.name === 'House Purchase')
      
      expect(retirementGoal).toBeDefined()
      expect(retirementGoal!.targetAmount).toBe(5000000)
      expect(retirementGoal!.priority).toBe(1)
      
      expect(houseGoal).toBeDefined()
      expect(houseGoal!.targetAmount).toBe(2000000)
      expect(houseGoal!.priority).toBe(2)
      
      // Verify account details
      const zerodhaAccount = portfolio.accounts.find(a => a.name === 'Zerodha')
      const hdfcAccount = portfolio.accounts.find(a => a.name === 'HDFC Bank')
      
      expect(zerodhaAccount).toBeDefined()
      expect(zerodhaAccount!.type).toBe(AccountType.BROKER)
      
      expect(hdfcAccount).toBeDefined()
      expect(hdfcAccount!.type).toBe(AccountType.BANK)
      
      // Verify investment details
      const relianceStock = portfolio.investments.find(i => i.name === 'Reliance Industries')
      const sbiMF = portfolio.investments.find(i => i.name === 'SBI Bluechip Fund')
      const property = portfolio.investments.find(i => i.name === 'Apartment in Mumbai')
      
      expect(relianceStock).toBeDefined()
      expect(relianceStock!.symbol).toBe('RELIANCE')
      expect(relianceStock!.units).toBe(50)
      expect(relianceStock!.buyPrice).toBe(2500)
      
      expect(sbiMF).toBeDefined()
      expect(sbiMF!.symbol).toBe('120503')
      expect(sbiMF!.type).toBe(InvestmentType.MUTUAL_FUND)
      
      expect(property).toBeDefined()
      expect(property!.type).toBe(InvestmentType.REAL_ESTATE)
      expect(property!.totalValue).toBe(1500000)
    })
  })
})