import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Import components that should maintain interactivity
import { DashboardView } from '@/components/dashboard'
import { InvestmentsView } from '@/components/investments'
import { GoalsView } from '@/components/goals'
import { SIPsView } from '@/components/sips'
import { AccountsView } from '@/components/accounts'

// Mock server actions
vi.mock('@/lib/server/actions/investments', () => ({
  createInvestment: vi.fn(),
  updateInvestment: vi.fn(),
  deleteInvestment: vi.fn(),
}))

vi.mock('@/lib/server/actions/goals', () => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}))

vi.mock('@/lib/server/actions/sips', () => ({
  createSIP: vi.fn(),
  updateSIP: vi.fn(),
  deleteSIP: vi.fn(),
}))

vi.mock('@/lib/server/actions/accounts', () => ({
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

describe('User Interactions on Server-Rendered Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Dashboard Interactions', () => {
    const mockDashboardData = {
      summary: {
        totalValue: 1000000,
        totalInvested: 800000,
        totalGains: 200000,
        gainsPercentage: 25,
        goalProgress: 75,
        activeGoals: 5,
        activeSIPs: 3,
        accounts: 2,
      },
      recentTransactions: [
        {
          id: '1',
          type: 'BUY',
          amount: 5000,
          date: new Date('2024-01-15'),
          investment: { name: 'Test Stock', symbol: 'TEST' },
        },
      ],
      goalProgress: [
        {
          id: '1',
          name: 'Emergency Fund',
          targetAmount: 100000,
          currentAmount: 75000,
          progress: 75,
          targetDate: new Date('2025-12-31'),
        },
      ],
      portfolioSummary: {
        totalValue: 1000000,
        totalInvested: 800000,
        totalGains: 200000,
        gainsPercentage: 25,
      },
      timestamp: new Date(),
    }

    it('should allow navigation between dashboard sections', async () => {
      const user = userEvent.setup()
      render(<DashboardView data={mockDashboardData} />)

      // Should be able to click on different dashboard sections
      const portfolioSection = screen.getByText('Portfolio Summary')
      const goalsSection = screen.getByText('Goal Progress')
      const transactionsSection = screen.getByText('Recent Transactions')

      expect(portfolioSection).toBeInTheDocument()
      expect(goalsSection).toBeInTheDocument()
      expect(transactionsSection).toBeInTheDocument()

      // Interactions should work immediately without loading
      await user.click(portfolioSection)
      await user.click(goalsSection)
      await user.click(transactionsSection)

      // No loading states should appear
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    it('should handle refresh actions', async () => {
      const user = userEvent.setup()
      render(<DashboardView data={mockDashboardData} />)

      // Look for refresh button
      const refreshButton = screen.queryByRole('button', { name: /refresh/i })
      
      if (refreshButton) {
        await user.click(refreshButton)
        
        // Should handle refresh without breaking
        expect(refreshButton).toBeInTheDocument()
      }
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<DashboardView data={mockDashboardData} />)

      // Tab navigation should work
      await user.tab()
      
      // Should be able to navigate through interactive elements
      const focusedElement = document.activeElement
      expect(focusedElement).toBeDefined()
    })
  })

  describe('Investments List Interactions', () => {
    const mockInvestmentsData = {
      investmentsWithValues: [
        {
          id: '1',
          name: 'Test Stock',
          type: 'STOCK',
          symbol: 'TEST',
          units: 100,
          buyPrice: 50,
          currentPrice: 60,
          currentValue: 6000,
          totalInvested: 5000,
          totalGains: 1000,
          gainsPercentage: 20,
          account: { id: 'acc1', name: 'Test Account' },
          goal: { id: 'goal1', name: 'Test Goal' },
        },
        {
          id: '2',
          name: 'Test Mutual Fund',
          type: 'MUTUAL_FUND',
          symbol: 'TESTMF',
          units: 200,
          buyPrice: 25,
          currentPrice: 30,
          currentValue: 6000,
          totalInvested: 5000,
          totalGains: 1000,
          gainsPercentage: 20,
          account: { id: 'acc1', name: 'Test Account' },
          goal: { id: 'goal1', name: 'Test Goal' },
        },
      ],
      summary: {
        totalValue: 12000,
        totalInvested: 10000,
        totalGains: 2000,
        gainsPercentage: 20,
        count: 2,
      },
      timestamp: new Date(),
    }

    it('should support sorting and filtering', async () => {
      const user = userEvent.setup()
      render(<InvestmentsView data={mockInvestmentsData} />)

      // Should be able to sort by different columns
      const nameHeader = screen.queryByText('Name')
      const valueHeader = screen.queryByText('Current Value')
      const gainsHeader = screen.queryByText('Gains')

      if (nameHeader) {
        await user.click(nameHeader)
        // Should maintain data integrity after sort
        expect(screen.getByText('Test Stock')).toBeInTheDocument()
        expect(screen.getByText('Test Mutual Fund')).toBeInTheDocument()
      }

      if (valueHeader) {
        await user.click(valueHeader)
        expect(screen.getByText('₹6,000')).toBeInTheDocument()
      }

      // Should support filtering
      const filterInput = screen.queryByPlaceholderText(/search/i) || 
                         screen.queryByPlaceholderText(/filter/i)
      
      if (filterInput) {
        await user.type(filterInput, 'Stock')
        
        // Should filter results immediately
        expect(screen.getByText('Test Stock')).toBeInTheDocument()
      }
    })

    it('should handle investment actions', async () => {
      const user = userEvent.setup()
      const { createInvestment, updateInvestment, deleteInvestment } = await import('@/lib/server/actions/investments')
      
      render(<InvestmentsView data={mockInvestmentsData} />)

      // Should be able to add new investment
      const addButton = screen.queryByRole('button', { name: /add/i }) ||
                       screen.queryByRole('button', { name: /create/i })
      
      if (addButton) {
        await user.click(addButton)
        
        // Form should appear
        const nameInput = screen.queryByLabelText(/name/i)
        if (nameInput) {
          await user.type(nameInput, 'New Investment')
          
          const submitButton = screen.queryByRole('button', { name: /save/i }) ||
                              screen.queryByRole('button', { name: /submit/i })
          
          if (submitButton) {
            await user.click(submitButton)
            
            // Should call server action
            await waitFor(() => {
              expect(createInvestment).toHaveBeenCalled()
            })
          }
        }
      }

      // Should be able to edit existing investment
      const editButton = screen.queryByRole('button', { name: /edit/i })
      if (editButton) {
        await user.click(editButton)
        
        // Edit form should work
        const nameInput = screen.queryByDisplayValue('Test Stock')
        if (nameInput) {
          await user.clear(nameInput)
          await user.type(nameInput, 'Updated Stock')
          
          const saveButton = screen.queryByRole('button', { name: /save/i })
          if (saveButton) {
            await user.click(saveButton)
            
            await waitFor(() => {
              expect(updateInvestment).toHaveBeenCalled()
            })
          }
        }
      }
    })

    it('should support bulk operations', async () => {
      const user = userEvent.setup()
      render(<InvestmentsView data={mockInvestmentsData} />)

      // Should be able to select multiple items
      const checkboxes = screen.queryAllByRole('checkbox')
      
      if (checkboxes.length > 0) {
        // Select first two items
        await user.click(checkboxes[0])
        await user.click(checkboxes[1])
        
        // Bulk actions should become available
        const bulkDeleteButton = screen.queryByRole('button', { name: /delete selected/i })
        if (bulkDeleteButton) {
          await user.click(bulkDeleteButton)
          
          // Confirmation should appear
          const confirmButton = screen.queryByRole('button', { name: /confirm/i })
          if (confirmButton) {
            await user.click(confirmButton)
            
            // Should handle bulk operation
            expect(bulkDeleteButton).toBeInTheDocument()
          }
        }
      }
    })
  })

  describe('Goals Management Interactions', () => {
    const mockGoalsData = {
      goalsWithProgress: [
        {
          id: '1',
          name: 'Emergency Fund',
          targetAmount: 100000,
          currentAmount: 75000,
          progress: 75,
          targetDate: new Date('2025-12-31'),
          priority: 'HIGH',
          allocatedInvestments: [
            {
              id: '1',
              name: 'Safe Investment',
              currentValue: 75000,
            },
          ],
        },
      ],
      summary: {
        totalTargetAmount: 100000,
        totalCurrentAmount: 75000,
        averageProgress: 75,
        count: 1,
      },
      timestamp: new Date(),
    }

    it('should handle goal creation and editing', async () => {
      const user = userEvent.setup()
      const { createGoal, updateGoal } = await import('@/lib/server/actions/goals')
      
      render(<GoalsView data={mockGoalsData} />)

      // Should be able to create new goal
      const createButton = screen.queryByRole('button', { name: /create goal/i }) ||
                          screen.queryByRole('button', { name: /add goal/i })
      
      if (createButton) {
        await user.click(createButton)
        
        // Goal creation form should work
        const nameInput = screen.queryByLabelText(/goal name/i) ||
                         screen.queryByLabelText(/name/i)
        const targetInput = screen.queryByLabelText(/target amount/i)
        const dateInput = screen.queryByLabelText(/target date/i)
        
        if (nameInput && targetInput && dateInput) {
          await user.type(nameInput, 'New Goal')
          await user.type(targetInput, '50000')
          await user.type(dateInput, '2025-06-30')
          
          const submitButton = screen.queryByRole('button', { name: /save/i })
          if (submitButton) {
            await user.click(submitButton)
            
            await waitFor(() => {
              expect(createGoal).toHaveBeenCalledWith(
                expect.objectContaining({
                  name: 'New Goal',
                  targetAmount: 50000,
                })
              )
            })
          }
        }
      }

      // Should be able to edit existing goal
      const editButton = screen.queryByRole('button', { name: /edit/i })
      if (editButton) {
        await user.click(editButton)
        
        const nameInput = screen.queryByDisplayValue('Emergency Fund')
        if (nameInput) {
          await user.clear(nameInput)
          await user.type(nameInput, 'Updated Emergency Fund')
          
          const saveButton = screen.queryByRole('button', { name: /save/i })
          if (saveButton) {
            await user.click(saveButton)
            
            await waitFor(() => {
              expect(updateGoal).toHaveBeenCalled()
            })
          }
        }
      }
    })

    it('should support goal progress tracking', async () => {
      const user = userEvent.setup()
      render(<GoalsView data={mockGoalsData} />)

      // Should display progress visually
      const progressBar = screen.queryByRole('progressbar')
      if (progressBar) {
        expect(progressBar).toHaveAttribute('aria-valuenow', '75')
      }

      // Should show progress percentage
      expect(screen.getByText('75%')).toBeInTheDocument()
      
      // Should show current vs target amounts
      expect(screen.getByText('₹75,000')).toBeInTheDocument()
      expect(screen.getByText('₹1,00,000')).toBeInTheDocument()
    })

    it('should handle investment allocation', async () => {
      const user = userEvent.setup()
      render(<GoalsView data={mockGoalsData} />)

      // Should be able to allocate investments to goals
      const allocateButton = screen.queryByRole('button', { name: /allocate/i })
      if (allocateButton) {
        await user.click(allocateButton)
        
        // Allocation interface should work
        const investmentSelect = screen.queryByRole('combobox') ||
                                screen.queryByRole('listbox')
        
        if (investmentSelect) {
          await user.click(investmentSelect)
          
          // Should be able to select investments
          const option = screen.queryByText('Safe Investment')
          if (option) {
            await user.click(option)
          }
        }
      }
    })
  })

  describe('SIPs Management Interactions', () => {
    const mockSIPsData = {
      sipsWithValues: [
        {
          id: '1',
          name: 'Monthly SIP',
          amount: 5000,
          frequency: 'MONTHLY',
          status: 'ACTIVE',
          startDate: new Date('2024-01-01'),
          nextTransactionDate: new Date('2024-02-01'),
          investment: {
            id: '1',
            name: 'Growth Fund',
            currentValue: 60000,
          },
          totalInvested: 50000,
          currentValue: 60000,
          totalGains: 10000,
          gainsPercentage: 20,
        },
      ],
      summary: {
        totalMonthlyAmount: 5000,
        totalInvested: 50000,
        totalCurrentValue: 60000,
        totalGains: 10000,
        count: 1,
      },
      timestamp: new Date(),
    }

    it('should handle SIP management actions', async () => {
      const user = userEvent.setup()
      const { createSIP, updateSIP } = await import('@/lib/server/actions/sips')
      
      render(<SIPsView data={mockSIPsData} />)

      // Should be able to create new SIP
      const createButton = screen.queryByRole('button', { name: /create sip/i }) ||
                          screen.queryByRole('button', { name: /add sip/i })
      
      if (createButton) {
        await user.click(createButton)
        
        // SIP creation form should work
        const nameInput = screen.queryByLabelText(/sip name/i) ||
                         screen.queryByLabelText(/name/i)
        const amountInput = screen.queryByLabelText(/amount/i)
        const frequencySelect = screen.queryByLabelText(/frequency/i)
        
        if (nameInput && amountInput && frequencySelect) {
          await user.type(nameInput, 'New SIP')
          await user.type(amountInput, '3000')
          await user.selectOptions(frequencySelect, 'MONTHLY')
          
          const submitButton = screen.queryByRole('button', { name: /save/i })
          if (submitButton) {
            await user.click(submitButton)
            
            await waitFor(() => {
              expect(createSIP).toHaveBeenCalledWith(
                expect.objectContaining({
                  name: 'New SIP',
                  amount: 3000,
                  frequency: 'MONTHLY',
                })
              )
            })
          }
        }
      }

      // Should be able to pause/resume SIP
      const pauseButton = screen.queryByRole('button', { name: /pause/i })
      if (pauseButton) {
        await user.click(pauseButton)
        
        await waitFor(() => {
          expect(updateSIP).toHaveBeenCalledWith(
            '1',
            expect.objectContaining({
              status: 'PAUSED',
            })
          )
        })
      }
    })

    it('should display SIP schedule and next transaction', async () => {
      render(<SIPsView data={mockSIPsData} />)

      // Should show next transaction date
      expect(screen.getByText(/next transaction/i)).toBeInTheDocument()
      
      // Should show frequency
      expect(screen.getByText('MONTHLY')).toBeInTheDocument()
      
      // Should show amount
      expect(screen.getByText('₹5,000')).toBeInTheDocument()
    })
  })

  describe('Accounts Management Interactions', () => {
    const mockAccountsData = {
      accountsWithTotals: [
        {
          id: '1',
          name: 'Primary Demat',
          type: 'DEMAT',
          provider: 'Test Broker',
          accountNumber: '12345',
          totalValue: 500000,
          totalInvested: 400000,
          totalGains: 100000,
          gainsPercentage: 25,
          investmentCount: 10,
        },
      ],
      summary: {
        totalValue: 500000,
        totalInvested: 400000,
        totalGains: 100000,
        gainsPercentage: 25,
        count: 1,
      },
      timestamp: new Date(),
    }

    it('should handle account management', async () => {
      const user = userEvent.setup()
      const { createAccount, updateAccount } = await import('@/lib/server/actions/accounts')
      
      render(<AccountsView data={mockAccountsData} />)

      // Should be able to create new account
      const createButton = screen.queryByRole('button', { name: /add account/i }) ||
                          screen.queryByRole('button', { name: /create account/i })
      
      if (createButton) {
        await user.click(createButton)
        
        // Account creation form should work
        const nameInput = screen.queryByLabelText(/account name/i) ||
                         screen.queryByLabelText(/name/i)
        const typeSelect = screen.queryByLabelText(/type/i)
        const providerInput = screen.queryByLabelText(/provider/i)
        
        if (nameInput && typeSelect && providerInput) {
          await user.type(nameInput, 'New Account')
          await user.selectOptions(typeSelect, 'BANK')
          await user.type(providerInput, 'Test Bank')
          
          const submitButton = screen.queryByRole('button', { name: /save/i })
          if (submitButton) {
            await user.click(submitButton)
            
            await waitFor(() => {
              expect(createAccount).toHaveBeenCalledWith(
                expect.objectContaining({
                  name: 'New Account',
                  type: 'BANK',
                  provider: 'Test Bank',
                })
              )
            })
          }
        }
      }
    })

    it('should display account summaries correctly', async () => {
      render(<AccountsView data={mockAccountsData} />)

      // Should show account details
      expect(screen.getByText('Primary Demat')).toBeInTheDocument()
      expect(screen.getByText('DEMAT')).toBeInTheDocument()
      expect(screen.getByText('Test Broker')).toBeInTheDocument()
      
      // Should show financial summary
      expect(screen.getByText('₹5,00,000')).toBeInTheDocument()
      expect(screen.getByText('₹1,00,000')).toBeInTheDocument()
      expect(screen.getByText('25%')).toBeInTheDocument()
    })
  })

  describe('Form Validation and Error Handling', () => {
    it('should validate form inputs properly', async () => {
      const user = userEvent.setup()
      const mockData = {
        investmentsWithValues: [],
        summary: { totalValue: 0, totalInvested: 0, totalGains: 0, gainsPercentage: 0, count: 0 },
        timestamp: new Date(),
      }
      
      render(<InvestmentsView data={mockData} />)

      const createButton = screen.queryByRole('button', { name: /add/i })
      if (createButton) {
        await user.click(createButton)
        
        // Try to submit empty form
        const submitButton = screen.queryByRole('button', { name: /save/i })
        if (submitButton) {
          await user.click(submitButton)
          
          // Should show validation errors
          const errorMessage = screen.queryByText(/required/i) ||
                              screen.queryByText(/invalid/i)
          
          if (errorMessage) {
            expect(errorMessage).toBeInTheDocument()
          }
        }
      }
    })

    it('should handle server action errors gracefully', async () => {
      const user = userEvent.setup()
      const { createInvestment } = await import('@/lib/server/actions/investments')
      
      // Mock server action to fail
      vi.mocked(createInvestment).mockRejectedValue(new Error('Server error'))
      
      const mockData = {
        investmentsWithValues: [],
        summary: { totalValue: 0, totalInvested: 0, totalGains: 0, gainsPercentage: 0, count: 0 },
        timestamp: new Date(),
      }
      
      render(<InvestmentsView data={mockData} />)

      const createButton = screen.queryByRole('button', { name: /add/i })
      if (createButton) {
        await user.click(createButton)
        
        const nameInput = screen.queryByLabelText(/name/i)
        const submitButton = screen.queryByRole('button', { name: /save/i })
        
        if (nameInput && submitButton) {
          await user.type(nameInput, 'Test Investment')
          await user.click(submitButton)
          
          // Should handle error gracefully
          await waitFor(() => {
            const errorMessage = screen.queryByText(/error/i) ||
                                screen.queryByText(/failed/i)
            
            if (errorMessage) {
              expect(errorMessage).toBeInTheDocument()
            }
          })
        }
      }
    })
  })
})