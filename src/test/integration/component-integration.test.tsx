import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrismaClient } from '@prisma/client'
import { TestDbUtils, TestDataFactory } from '../utils/test-helpers'
import { mockExternalApis } from '../utils/api-test-helpers'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/investments',
    query: {},
    asPath: '/investments'
  })
}))

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

const prisma = new PrismaClient()
const testDb = new TestDbUtils(prisma)

describe('Component Integration Tests', () => {
  beforeEach(async () => {
    await testDb.cleanup()
    mockFetch.mockClear()
    mockPush.mockClear()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  describe('Investment Form Integration', () => {
    it('should integrate form validation with dynamic field rendering', async () => {
      // Setup prerequisites
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      // Mock API responses for dropdowns
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([goal])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([account])
        })

      const InvestmentForm = (await import('@/components/investments/InvestmentForm')).default
      render(<InvestmentForm onSubmit={vi.fn()} onCancel={vi.fn()} goals={[]} accounts={[]} />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText('Investment Type')).toBeInTheDocument()
      })

      // Test dynamic field rendering for STOCK type
      await userEvent.selectOptions(screen.getByLabelText('Investment Type'), 'STOCK')

      await waitFor(() => {
        expect(screen.getByLabelText('Symbol')).toBeInTheDocument()
        expect(screen.getByLabelText('Units')).toBeInTheDocument()
        expect(screen.getByLabelText('Buy Price')).toBeInTheDocument()
        expect(screen.queryByLabelText('Total Value')).not.toBeInTheDocument()
      })

      // Test validation for stock fields
      await userEvent.click(screen.getByText('Add Investment'))

      await waitFor(() => {
        expect(screen.getByText('Investment name is required')).toBeInTheDocument()
        expect(screen.getByText('Units are required for this investment type')).toBeInTheDocument()
        expect(screen.getByText('Buy price is required for this investment type')).toBeInTheDocument()
      })

      // Switch to REAL_ESTATE and test different validation
      await userEvent.selectOptions(screen.getByLabelText('Investment Type'), 'REAL_ESTATE')

      await waitFor(() => {
        expect(screen.queryByLabelText('Symbol')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Units')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Buy Price')).not.toBeInTheDocument()
        expect(screen.getByLabelText('Total Value')).toBeInTheDocument()
      })

      // Clear previous errors and test real estate validation
      await userEvent.type(screen.getByLabelText('Name'), 'Test Property')
      await userEvent.click(screen.getByText('Add Investment'))

      await waitFor(() => {
        expect(screen.queryByText('Units are required')).not.toBeInTheDocument()
        expect(screen.getByText('Total value is required for this investment type')).toBeInTheDocument()
      })

      // Fill valid data and test successful submission
      await userEvent.type(screen.getByLabelText('Total Value'), '1000000')
      await userEvent.selectOptions(screen.getByLabelText('Goal'), goal.id)
      await userEvent.selectOptions(screen.getByLabelText('Account'), account.id)

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-investment-id', ...TestDataFactory.createRealEstateInvestment() })
      })

      await userEvent.click(screen.getByText('Add Investment'))

      // Verify form submission
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/investments', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"totalValue":1000000')
        }))
      })
    })

    it('should handle form submission errors gracefully', async () => {
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([goal]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([account]) })

      const InvestmentForm = (await import('@/components/investments/InvestmentForm')).default
      render(<InvestmentForm onSubmit={vi.fn()} onCancel={vi.fn()} goals={[]} accounts={[]} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Investment Type')).toBeInTheDocument()
      })

      // Fill valid form data
      await userEvent.selectOptions(screen.getByLabelText('Investment Type'), 'STOCK')
      await userEvent.type(screen.getByLabelText('Name'), 'Test Stock')
      await userEvent.type(screen.getByLabelText('Symbol'), 'TEST')
      await userEvent.type(screen.getByLabelText('Units'), '100')
      await userEvent.type(screen.getByLabelText('Buy Price'), '50')
      await userEvent.selectOptions(screen.getByLabelText('Goal'), goal.id)
      await userEvent.selectOptions(screen.getByLabelText('Account'), account.id)

      // Mock API error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'Validation error',
          details: [{ path: ['symbol'], message: 'Symbol already exists' }]
        })
      })

      await userEvent.click(screen.getByText('Add Investment'))

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText('Symbol already exists')).toBeInTheDocument()
        expect(screen.getByText('Add Investment')).toBeEnabled() // Form should remain usable
      })

      // Test network error handling
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await userEvent.click(screen.getByText('Add Investment'))

      await waitFor(() => {
        expect(screen.getByText('Network error occurred. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Investment List Integration', () => {
    it('should integrate with price fetching and real-time updates', async () => {
      // Setup test data
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())
      const investment = await testDb.createInvestment(TestDataFactory.createInvestment({
        name: 'Reliance Industries',
        symbol: 'RELIANCE',
        units: 100,
        buyPrice: 2400,
        goalId: goal.id,
        accountId: account.id
      }))

      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ ...investment, goal, account }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2500))
        })

      const InvestmentList = (await import('@/components/investments/InvestmentList')).default
      render(<InvestmentList />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Reliance Industries')).toBeInTheDocument()
      })

      // Verify initial values (buy price)
      expect(screen.getByText('₹2,40,000')).toBeInTheDocument() // 100 * 2400

      // Wait for price update
      await waitFor(() => {
        expect(screen.getByText('₹2,50,000')).toBeInTheDocument() // 100 * 2500
        expect(screen.getByText('+₹10,000')).toBeInTheDocument() // Gain
        expect(screen.getByText('+4.17%')).toBeInTheDocument() // Percentage gain
      })

      // Test manual price refresh
      const refreshButton = screen.getByText('Refresh Prices')
      
      // Mock updated price
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2600))
      })

      await userEvent.click(refreshButton)

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument()
      })

      // Verify updated values
      await waitFor(() => {
        expect(screen.getByText('₹2,60,000')).toBeInTheDocument() // 100 * 2600
        expect(screen.getByText('+₹20,000')).toBeInTheDocument() // Updated gain
        expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
      })
    })

    it('should handle edit and delete operations with optimistic updates', async () => {
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())
      const investment = await testDb.createInvestment(TestDataFactory.createInvestment({
        goalId: goal.id,
        accountId: account.id
      }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ...investment, goal, account }])
      })

      const InvestmentList = (await import('@/components/investments/InvestmentList')).default
      render(<InvestmentList />)

      await waitFor(() => {
        expect(screen.getByText(investment.name)).toBeInTheDocument()
      })

      // Test edit operation
      const editButton = screen.getByText('Edit')
      await userEvent.click(editButton)

      // Should show edit form or navigate to edit page
      expect(mockPush).toHaveBeenCalledWith(`/investments/${investment.id}/edit`)

      // Test delete operation
      const deleteButton = screen.getByText('Delete')
      await userEvent.click(deleteButton)

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
        expect(screen.getByText('Are you sure you want to delete this investment?')).toBeInTheDocument()
      })

      // Mock successful deletion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204
      })

      const confirmButton = screen.getByText('Confirm')
      await userEvent.click(confirmButton)

      // Verify optimistic update (immediate removal)
      expect(screen.queryByText(investment.name)).not.toBeInTheDocument()

      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/investments/${investment.id}`, {
          method: 'DELETE'
        })
      })
    })
  })

  describe('Dashboard Component Integration', () => {
    it('should integrate multiple data sources and calculations', async () => {
      // Setup comprehensive portfolio
      const { goals, accounts, investments } = await testDb.seedTestData()

      // Mock dashboard API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalValue: 1638000,
          totalGainLoss: 10500,
          totalGainLossPercentage: 0.64,
          assetAllocation: [
            { type: 'STOCK', value: 130000, percentage: 7.9 },
            { type: 'MUTUAL_FUND', value: 8000, percentage: 0.5 },
            { type: 'REAL_ESTATE', value: 1500000, percentage: 91.6 }
          ],
          accountDistribution: [
            { accountId: accounts[0].id, accountName: accounts[0].name, value: 130000 },
            { accountId: accounts[1].id, accountName: accounts[1].name, value: 1508000 }
          ],
          goalProgress: [
            { goalId: goals[0].id, goalName: goals[0].name, currentValue: 138000, targetAmount: 5000000, progressPercentage: 2.76 },
            { goalId: goals[1].id, goalName: goals[1].name, currentValue: 1500000, targetAmount: 2000000, progressPercentage: 75 }
          ],
          topPerformers: {
            gainers: [{ name: 'Reliance Industries', gainLoss: 10000, gainLossPercentage: 8.33 }],
            losers: []
          }
        })
      })

      const Dashboard = (await import('@/app/page')).default
      render(<Dashboard />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      })

      // Verify portfolio summary
      expect(screen.getByText('₹16,38,000')).toBeInTheDocument()
      expect(screen.getByText('+₹10,500')).toBeInTheDocument()
      expect(screen.getByText('+0.64%')).toBeInTheDocument()

      // Verify asset allocation chart integration
      expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
      expect(screen.getByText('Stocks (7.9%)')).toBeInTheDocument()
      expect(screen.getByText('Mutual Funds (0.5%)')).toBeInTheDocument()
      expect(screen.getByText('Real Estate (91.6%)')).toBeInTheDocument()

      // Verify goal progress integration
      expect(screen.getByText('Goal Progress')).toBeInTheDocument()
      expect(screen.getByText(goals[0].name)).toBeInTheDocument()
      expect(screen.getByText('2.76%')).toBeInTheDocument()
      expect(screen.getByText(goals[1].name)).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()

      // Verify account distribution
      expect(screen.getByText('Account Distribution')).toBeInTheDocument()
      expect(screen.getByText(accounts[0].name)).toBeInTheDocument()
      expect(screen.getByText(accounts[1].name)).toBeInTheDocument()

      // Verify top performers
      expect(screen.getByText('Top Performers')).toBeInTheDocument()
      expect(screen.getByText('Reliance Industries')).toBeInTheDocument()
      expect(screen.getByText('+₹10,000')).toBeInTheDocument()
    })

    it('should handle interactive dashboard elements', async () => {
      // Mock dashboard data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalValue: 100000,
          totalGainLoss: 5000,
          totalGainLossPercentage: 5,
          assetAllocation: [
            { type: 'STOCK', value: 60000, percentage: 60 },
            { type: 'MUTUAL_FUND', value: 40000, percentage: 40 }
          ],
          accountDistribution: [],
          goalProgress: [],
          topPerformers: { gainers: [], losers: [] }
        })
      })

      const Dashboard = (await import('@/app/page')).default
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      })

      // Test navigation to detailed views
      const viewInvestmentsButton = screen.getByText('View All Investments')
      await userEvent.click(viewInvestmentsButton)

      expect(mockPush).toHaveBeenCalledWith('/investments')

      // Test asset allocation chart interaction
      const stocksSegment = screen.getByText('Stocks (60%)')
      await userEvent.click(stocksSegment)

      // Should show detailed breakdown or filter
      await waitFor(() => {
        expect(screen.getByText('Stock Investments')).toBeInTheDocument()
      })

      // Test refresh functionality
      const refreshButton = screen.getByText('Refresh Data')
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalValue: 105000,
          totalGainLoss: 10000,
          totalGainLossPercentage: 10.5,
          assetAllocation: [
            { type: 'STOCK', value: 65000, percentage: 61.9 },
            { type: 'MUTUAL_FUND', value: 40000, percentage: 38.1 }
          ],
          accountDistribution: [],
          goalProgress: [],
          topPerformers: { gainers: [], losers: [] }
        })
      })

      await userEvent.click(refreshButton)

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByText('Refreshing...')).toBeInTheDocument()
      })

      // Verify updated data
      await waitFor(() => {
        expect(screen.getByText('₹1,05,000')).toBeInTheDocument()
        expect(screen.getByText('+₹10,000')).toBeInTheDocument()
        expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Goal Management Integration', () => {
    it('should integrate goal creation with investment linking', async () => {
      // Mock empty goals initially
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })

      const GoalsPage = (await import('@/app/goals/page')).default
      render(<GoalsPage />)

      await waitFor(() => {
        expect(screen.getByText('Financial Goals')).toBeInTheDocument()
      })

      // Create new goal
      const addGoalButton = screen.getByText('Add Goal')
      await userEvent.click(addGoalButton)

      await userEvent.type(screen.getByLabelText('Goal Name'), 'Emergency Fund')
      await userEvent.type(screen.getByLabelText('Target Amount'), '500000')
      await userEvent.type(screen.getByLabelText('Target Date'), '2025-12-31')

      // Mock successful goal creation
      const newGoal = {
        id: 'new-goal-id',
        name: 'Emergency Fund',
        targetAmount: 500000,
        targetDate: '2025-12-31',
        currentValue: 0,
        progressPercentage: 0
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newGoal)
      })

      await userEvent.click(screen.getByText('Create Goal'))

      // Verify goal appears in list
      await waitFor(() => {
        expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
        expect(screen.getByText('₹5,00,000')).toBeInTheDocument()
        expect(screen.getByText('0%')).toBeInTheDocument()
      })

      // Test linking investments to goal
      const linkInvestmentButton = screen.getByText('Link Investment')
      await userEvent.click(linkInvestmentButton)

      // Should navigate to investment creation with goal pre-selected
      expect(mockPush).toHaveBeenCalledWith('/investments/new?goalId=new-goal-id')
    })

    it('should show real-time goal progress updates', async () => {
      const goal = await testDb.createGoal(TestDataFactory.createGoal({
        name: 'House Fund',
        targetAmount: 2000000
      }))

      // Mock goal with some progress
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          ...goal,
          currentValue: 500000,
          progressPercentage: 25,
          investments: []
        }])
      })

      const GoalProgress = (await import('@/components/goals/GoalProgress')).default
      render(<GoalProgress currentAmount={1000} targetAmount={5000} percentage={20} />)

      await waitFor(() => {
        expect(screen.getByText('House Fund')).toBeInTheDocument()
      })

      // Verify progress display
      expect(screen.getByText('₹5,00,000 / ₹20,00,000')).toBeInTheDocument()
      expect(screen.getByText('25%')).toBeInTheDocument()

      // Verify progress bar
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '25')

      // Test progress update when investment is added
      // This would typically happen through WebSocket or polling
      // For testing, we'll simulate a data refresh

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          ...goal,
          currentValue: 750000,
          progressPercentage: 37.5,
          investments: []
        }])
      })

      const refreshButton = screen.getByText('Refresh')
      await userEvent.click(refreshButton)

      await waitFor(() => {
        expect(screen.getByText('₹7,50,000 / ₹20,00,000')).toBeInTheDocument()
        expect(screen.getByText('37.5%')).toBeInTheDocument()
      })
    })
  })

  describe('Error Boundary Integration', () => {
    it('should handle component errors gracefully', async () => {
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const ErrorBoundary = (await import('@/components/ErrorBoundary')).default
      const ProblematicComponent = () => {
        throw new Error('Component Error')
      }

      render(
        <ErrorBoundary>
          <ProblematicComponent />
        </ErrorBoundary>
      )

      // Verify error boundary catches the error
      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        expect(screen.getByText('Reload Page')).toBeInTheDocument()
      })

      // Test error recovery
      const reloadButton = screen.getByText('Reload Page')
      await userEvent.click(reloadButton)

      // Should trigger page reload (in real app)
      expect(reloadButton).toBeInTheDocument()
    })
  })
})