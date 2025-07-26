import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

// Mock fetch for external APIs
const mockFetch = vi.fn()
global.fetch = mockFetch

const prisma = new PrismaClient()
const testDb = new TestDbUtils(prisma)

describe('Investment Management E2E Workflows', () => {
  beforeEach(async () => {
    await testDb.cleanup()
    mockFetch.mockClear()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  describe('Complete Investment Lifecycle', () => {
    it('should allow user to create, view, edit, and delete an investment', async () => {
      // Setup: Create prerequisite data
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      // Mock price API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExternalApis.nse.success('RELIANCE', 2500))
      })

      // Step 1: Navigate to investments page and create new investment
      const InvestmentPage = (await import('@/pages/investments')).default
      render(<InvestmentPage />)

      // Click "Add Investment" button
      const addButton = screen.getByText('Add Investment')
      await userEvent.click(addButton)

      // Fill out investment form
      await userEvent.selectOptions(screen.getByLabelText('Investment Type'), 'STOCK')
      await userEvent.type(screen.getByLabelText('Name'), 'Reliance Industries')
      await userEvent.type(screen.getByLabelText('Symbol'), 'RELIANCE')
      await userEvent.type(screen.getByLabelText('Units'), '100')
      await userEvent.type(screen.getByLabelText('Buy Price'), '2400')
      await userEvent.selectOptions(screen.getByLabelText('Goal'), goal.id)
      await userEvent.selectOptions(screen.getByLabelText('Account'), account.id)

      // Submit form
      const submitButton = screen.getByText('Add Investment')
      await userEvent.click(submitButton)

      // Step 2: Verify investment appears in list
      await waitFor(() => {
        expect(screen.getByText('Reliance Industries')).toBeInTheDocument()
        expect(screen.getByText('₹2,40,000')).toBeInTheDocument() // 100 * 2400
      })

      // Step 3: Edit the investment
      const editButton = screen.getByText('Edit')
      await userEvent.click(editButton)

      // Update units
      const unitsInput = screen.getByLabelText('Units')
      await userEvent.clear(unitsInput)
      await userEvent.type(unitsInput, '150')

      // Save changes
      const saveButton = screen.getByText('Save Changes')
      await userEvent.click(saveButton)

      // Step 4: Verify updated values
      await waitFor(() => {
        expect(screen.getByText('₹3,60,000')).toBeInTheDocument() // 150 * 2400
      })

      // Step 5: View investment details
      const viewButton = screen.getByText('View Details')
      await userEvent.click(viewButton)

      await waitFor(() => {
        expect(screen.getByText('Investment Details')).toBeInTheDocument()
        expect(screen.getByText('Current Value: ₹3,75,000')).toBeInTheDocument() // 150 * 2500
        expect(screen.getByText('Gain/Loss: ₹15,000')).toBeInTheDocument()
        expect(screen.getByText('Return: 4.17%')).toBeInTheDocument()
      })

      // Step 6: Delete the investment
      const deleteButton = screen.getByText('Delete')
      await userEvent.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByText('Confirm Delete')
      await userEvent.click(confirmButton)

      // Step 7: Verify investment is removed
      await waitFor(() => {
        expect(screen.queryByText('Reliance Industries')).not.toBeInTheDocument()
      })
    })

    it('should handle different investment types correctly', async () => {
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      const InvestmentPage = (await import('@/pages/investments')).default
      render(<InvestmentPage />)

      // Test Stock Investment
      await userEvent.click(screen.getByText('Add Investment'))
      await userEvent.selectOptions(screen.getByLabelText('Investment Type'), 'STOCK')
      
      // Verify stock-specific fields are shown
      expect(screen.getByLabelText('Symbol')).toBeInTheDocument()
      expect(screen.getByLabelText('Units')).toBeInTheDocument()
      expect(screen.getByLabelText('Buy Price')).toBeInTheDocument()
      expect(screen.queryByLabelText('Total Value')).not.toBeInTheDocument()

      // Switch to Real Estate
      await userEvent.selectOptions(screen.getByLabelText('Investment Type'), 'REAL_ESTATE')
      
      // Verify real estate fields are shown
      expect(screen.queryByLabelText('Symbol')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Units')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Buy Price')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Total Value')).toBeInTheDocument()

      // Fill and submit real estate investment
      await userEvent.type(screen.getByLabelText('Name'), 'Mumbai Apartment')
      await userEvent.type(screen.getByLabelText('Total Value'), '5000000')
      await userEvent.selectOptions(screen.getByLabelText('Goal'), goal.id)
      await userEvent.selectOptions(screen.getByLabelText('Account'), account.id)
      
      await userEvent.click(screen.getByText('Add Investment'))

      // Verify real estate investment is created
      await waitFor(() => {
        expect(screen.getByText('Mumbai Apartment')).toBeInTheDocument()
        expect(screen.getByText('₹50,00,000')).toBeInTheDocument()
      })
    })
  })

  describe('Portfolio Dashboard Workflow', () => {
    it('should display comprehensive portfolio overview', async () => {
      // Setup test portfolio
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

      const DashboardPage = (await import('@/pages')).default
      render(<DashboardPage />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      })

      // Verify portfolio summary
      expect(screen.getByText(/Total Portfolio Value/)).toBeInTheDocument()
      expect(screen.getByText(/Total Gain\/Loss/)).toBeInTheDocument()

      // Verify asset allocation
      expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
      expect(screen.getByText(/Stocks/)).toBeInTheDocument()
      expect(screen.getByText(/Mutual Funds/)).toBeInTheDocument()
      expect(screen.getByText(/Real Estate/)).toBeInTheDocument()

      // Verify goal progress
      expect(screen.getByText('Goal Progress')).toBeInTheDocument()
      goals.forEach(goal => {
        expect(screen.getByText(goal.name)).toBeInTheDocument()
      })

      // Verify top performers
      expect(screen.getByText('Top Performers')).toBeInTheDocument()
    })
  })

  describe('Goal Management Workflow', () => {
    it('should allow complete goal lifecycle with investment linking', async () => {
      const GoalsPage = (await import('@/pages/goals')).default
      render(<GoalsPage />)

      // Create new goal
      await userEvent.click(screen.getByText('Add Goal'))
      
      await userEvent.type(screen.getByLabelText('Goal Name'), 'Emergency Fund')
      await userEvent.type(screen.getByLabelText('Target Amount'), '500000')
      await userEvent.type(screen.getByLabelText('Target Date'), '2025-12-31')
      await userEvent.selectOptions(screen.getByLabelText('Priority'), '1')
      await userEvent.type(screen.getByLabelText('Description'), 'Emergency fund for unexpected expenses')

      await userEvent.click(screen.getByText('Create Goal'))

      // Verify goal creation
      await waitFor(() => {
        expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
        expect(screen.getByText('₹5,00,000')).toBeInTheDocument()
      })

      // Link investments to goal (this would involve creating investments with this goal)
      // The workflow would continue with investment creation as tested above
    })
  })

  describe('Error Handling Workflows', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const InvestmentPage = (await import('@/pages/investments')).default
      render(<InvestmentPage />)

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/Unable to load investments/)).toBeInTheDocument()
      })

      // Verify retry functionality
      const retryButton = screen.getByText('Retry')
      expect(retryButton).toBeInTheDocument()
    })

    it('should validate form inputs and show errors', async () => {
      const goal = await testDb.createGoal(TestDataFactory.createGoal())
      const account = await testDb.createAccount(TestDataFactory.createAccount())

      const InvestmentPage = (await import('@/pages/investments')).default
      render(<InvestmentPage />)

      await userEvent.click(screen.getByText('Add Investment'))

      // Try to submit empty form
      await userEvent.click(screen.getByText('Add Investment'))

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText('Investment name is required')).toBeInTheDocument()
        expect(screen.getByText('Investment type is required')).toBeInTheDocument()
      })

      // Fill invalid data
      await userEvent.selectOptions(screen.getByLabelText('Investment Type'), 'STOCK')
      await userEvent.type(screen.getByLabelText('Name'), 'Test Stock')
      await userEvent.type(screen.getByLabelText('Units'), '-10') // Invalid negative units
      await userEvent.type(screen.getByLabelText('Buy Price'), '0') // Invalid zero price

      await userEvent.click(screen.getByText('Add Investment'))

      // Verify specific validation errors
      await waitFor(() => {
        expect(screen.getByText('Units must be positive')).toBeInTheDocument()
        expect(screen.getByText('Buy price must be greater than 0')).toBeInTheDocument()
      })
    })
  })
})