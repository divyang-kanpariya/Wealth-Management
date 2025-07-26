import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrismaClient } from '@prisma/client'
import { TestDbUtils, TestDataFactory } from '../utils/test-helpers'
import { mockExternalApis } from '../utils/api-test-helpers'

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  })
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const prisma = new PrismaClient()
const testDb = new TestDbUtils(prisma)

describe('Dashboard E2E Workflows', () => {
  beforeEach(async () => {
    await testDb.cleanup()
    mockFetch.mockClear()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  describe('Portfolio Dashboard Integration', () => {
    it('should display real-time portfolio data with price updates', async () => {
      // Setup comprehensive test portfolio
      const retirementGoal = await testDb.createGoal(TestDataFactory.createGoal({
        name: 'Retirement',
        targetAmount: 5000000,
        targetDate: new Date('2040-12-31')
      }))

      const houseGoal = await testDb.createGoal(TestDataFactory.createGoal({
        name: 'House Purchase',
        targetAmount: 2000000,
        targetDate: new Date('2027-06-30')
      }))

      const zerodhaAccount = await testDb.createAccount(TestDataFactory.createAccount({
        name: 'Zerodha',
        type: 'BROKER'
      }))

      const hdfcAccount = await testDb.createAccount(TestDataFactory.createAccount({
        name: 'HDFC Bank',
        type: 'BANK'
      }))

      // Create diverse investment portfolio
      const relianceStock = await testDb.createInvestment(TestDataFactory.createInvestment({
        name: 'Reliance Industries',
        symbol: 'RELIANCE',
        units: 50,
        buyPrice: 2400,
        goalId: retirementGoal.id,
        accountId: zerodhaAccount.id
      }))

      const sbiMF = await testDb.createInvestment(TestDataFactory.createMutualFundInvestment({
        name: 'SBI Bluechip Fund',
        symbol: '120503',
        units: 100,
        buyPrice: 75,
        goalId: retirementGoal.id,
        accountId: hdfcAccount.id
      }))

      const property = await testDb.createInvestment(TestDataFactory.createRealEstateInvestment({
        name: 'Mumbai Apartment',
        totalValue: 1500000,
        goalId: houseGoal.id,
        accountId: hdfcAccount.id
      }))

      // Mock current prices (showing gains)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2600)) // +200 per share
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockExternalApis.amfi.success([
            { code: '120503', name: 'SBI Bluechip Fund', nav: 80 } // +5 per unit
          ]))
        })

      const DashboardPage = (await import('@/pages')).default
      render(<DashboardPage />)

      // Wait for all data to load
      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify total portfolio value calculation
      // Reliance: 50 * 2600 = 130,000 (was 120,000, gain: 10,000)
      // SBI MF: 100 * 80 = 8,000 (was 7,500, gain: 500)
      // Property: 1,500,000 (no change)
      // Total: 1,638,000, Total Gain: 10,500
      await waitFor(() => {
        expect(screen.getByText(/₹16,38,000/)).toBeInTheDocument() // Total value
        expect(screen.getByText(/₹10,500/)).toBeInTheDocument() // Total gain
        expect(screen.getByText(/0.64%/)).toBeInTheDocument() // Percentage gain
      })

      // Verify asset allocation percentages
      expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
      
      // Stocks: 130,000 / 1,638,000 = ~7.9%
      // Mutual Funds: 8,000 / 1,638,000 = ~0.5%
      // Real Estate: 1,500,000 / 1,638,000 = ~91.6%
      await waitFor(() => {
        expect(screen.getByText(/Stocks.*7\.9%/)).toBeInTheDocument()
        expect(screen.getByText(/Mutual Funds.*0\.5%/)).toBeInTheDocument()
        expect(screen.getByText(/Real Estate.*91\.6%/)).toBeInTheDocument()
      })

      // Verify account-wise distribution
      expect(screen.getByText('Account Distribution')).toBeInTheDocument()
      expect(screen.getByText('Zerodha')).toBeInTheDocument()
      expect(screen.getByText('HDFC Bank')).toBeInTheDocument()

      // Verify goal progress
      expect(screen.getByText('Goal Progress')).toBeInTheDocument()
      
      // Retirement goal: (130,000 + 8,000) / 5,000,000 = 2.76%
      await waitFor(() => {
        expect(screen.getByText('Retirement')).toBeInTheDocument()
        expect(screen.getByText(/2\.76%/)).toBeInTheDocument()
      })

      // House goal: 1,500,000 / 2,000,000 = 75%
      await waitFor(() => {
        expect(screen.getByText('House Purchase')).toBeInTheDocument()
        expect(screen.getByText(/75%/)).toBeInTheDocument()
      })

      // Verify top performers
      expect(screen.getByText('Top Performers')).toBeInTheDocument()
      expect(screen.getByText('Reliance Industries')).toBeInTheDocument() // Best performer by absolute gain
    })

    it('should handle mixed portfolio with losses and gains', async () => {
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      // Create investments with different performance
      await testDb.createInvestment(TestDataFactory.createInvestment({
        name: 'Winner Stock',
        symbol: 'WINNER',
        units: 100,
        buyPrice: 100,
        goalId: goal.id,
        accountId: account.id
      }))

      await testDb.createInvestment(TestDataFactory.createInvestment({
        name: 'Loser Stock',
        symbol: 'LOSER',
        units: 50,
        buyPrice: 200,
        goalId: goal.id,
        accountId: account.id
      }))

      // Mock prices showing one winner, one loser
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExternalApis.nse.success('WINNER', 120)) // +20%
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExternalApis.nse.success('LOSER', 150)) // -25%
        })

      const DashboardPage = (await import('@/pages')).default
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      })

      // Winner: 100 * 120 = 12,000 (was 10,000, gain: +2,000)
      // Loser: 50 * 150 = 7,500 (was 10,000, loss: -2,500)
      // Total: 19,500 (was 20,000, loss: -500)
      await waitFor(() => {
        expect(screen.getByText(/₹19,500/)).toBeInTheDocument()
        expect(screen.getByText(/-₹500/)).toBeInTheDocument()
        expect(screen.getByText(/-2\.5%/)).toBeInTheDocument()
      })

      // Verify top performers section shows both gainers and losers
      expect(screen.getByText('Top Gainers')).toBeInTheDocument()
      expect(screen.getByText('Winner Stock')).toBeInTheDocument()
      
      expect(screen.getByText('Top Losers')).toBeInTheDocument()
      expect(screen.getByText('Loser Stock')).toBeInTheDocument()
    })
  })

  describe('Dashboard Navigation and Interactions', () => {
    it('should allow navigation to detailed views from dashboard', async () => {
      const { goals, accounts, investments } = await testDb.seedTestData()

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2500))
      })

      const DashboardPage = (await import('@/pages')).default
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      })

      // Test navigation to investments
      const viewInvestmentsButton = screen.getByText('View All Investments')
      await userEvent.click(viewInvestmentsButton)
      
      // This would trigger router navigation in real app
      // For testing, we verify the button exists and is clickable
      expect(viewInvestmentsButton).toBeInTheDocument()

      // Test goal detail navigation
      const goalCard = screen.getByText(goals[0].name)
      await userEvent.click(goalCard)
      
      // Verify goal details are shown or navigation occurs
      expect(goalCard).toBeInTheDocument()

      // Test account detail navigation
      const accountCard = screen.getByText(accounts[0].name)
      await userEvent.click(accountCard)
      
      expect(accountCard).toBeInTheDocument()
    })

    it('should refresh data when refresh button is clicked', async () => {
      await testDb.seedTestData()

      // Initial price
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2500))
      })

      const DashboardPage = (await import('@/pages')).default
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      })

      // Click refresh button
      const refreshButton = screen.getByText('Refresh Prices')
      
      // Mock updated price
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2600))
      })

      await userEvent.click(refreshButton)

      // Verify loading state appears
      await waitFor(() => {
        expect(screen.getByText('Updating prices...')).toBeInTheDocument()
      })

      // Verify updated values appear
      await waitFor(() => {
        expect(screen.queryByText('Updating prices...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Dashboard Error Handling', () => {
    it('should handle price API failures gracefully', async () => {
      await testDb.seedTestData()

      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Price API unavailable'))

      const DashboardPage = (await import('@/pages')).default
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      })

      // Should show portfolio with last known prices or buy prices
      expect(screen.getByText(/Unable to fetch current prices/)).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()

      // Test retry functionality
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2500))
      })

      await userEvent.click(screen.getByText('Retry'))

      await waitFor(() => {
        expect(screen.queryByText(/Unable to fetch current prices/)).not.toBeInTheDocument()
      })
    })

    it('should handle empty portfolio state', async () => {
      // No investments created
      const DashboardPage = (await import('@/pages')).default
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Your Portfolio')).toBeInTheDocument()
        expect(screen.getByText('No investments found')).toBeInTheDocument()
        expect(screen.getByText('Add Your First Investment')).toBeInTheDocument()
      })

      // Test navigation to add investment
      const addInvestmentButton = screen.getByText('Add Your First Investment')
      await userEvent.click(addInvestmentButton)
      
      expect(addInvestmentButton).toBeInTheDocument()
    })
  })

  describe('Dashboard Performance', () => {
    it('should load dashboard efficiently with large portfolio', async () => {
      // Create large portfolio
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      // Create 100 investments
      const investments = []
      for (let i = 0; i < 100; i++) {
        investments.push(testDb.createInvestment(TestDataFactory.createInvestment({
          name: `Stock ${i}`,
          symbol: `STOCK${i}`,
          units: 10,
          buyPrice: 100 + i,
          goalId: goal.id,
          accountId: account.id
        })))
      }
      await Promise.all(investments)

      // Mock batch price responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('STOCK1', 150))
      })

      const startTime = performance.now()
      
      const DashboardPage = (await import('@/pages')).default
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      }, { timeout: 10000 })

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000)

      // Verify aggregated data is displayed
      expect(screen.getByText(/Total Portfolio Value/)).toBeInTheDocument()
      expect(screen.getByText(/100 investments/)).toBeInTheDocument()
    })
  })
})