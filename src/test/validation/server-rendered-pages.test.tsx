import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextRequest } from 'next/server'

// Import all data preparators
import { DashboardDataPreparator } from '@/lib/server/data-preparators/dashboard'
import { ChartsDataPreparator } from '@/lib/server/data-preparators/charts'
import { InvestmentsDataPreparator } from '@/lib/server/data-preparators/investments'
import { GoalsDataPreparator } from '@/lib/server/data-preparators/goals'
import { SIPsDataPreparator } from '@/lib/server/data-preparators/sips'
import { AccountsDataPreparator } from '@/lib/server/data-preparators/accounts'
import { InvestmentDetailDataPreparator } from '@/lib/server/data-preparators/investment-detail'
import { GoalDetailDataPreparator } from '@/lib/server/data-preparators/goal-detail'
import { SIPDetailDataPreparator } from '@/lib/server/data-preparators/sip-detail'
import { AccountDetailDataPreparator } from '@/lib/server/data-preparators/account-detail'

// Import page components
import { DashboardView } from '@/components/dashboard'
import { ChartsView } from '@/components/charts'
import { InvestmentsView } from '@/components/investments'
import { GoalsView } from '@/components/goals'
import { SIPsView } from '@/components/sips'
import { AccountsView } from '@/components/accounts'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    goal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    sIP: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    priceCache: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  redirect: vi.fn(),
}))

describe('Server-Rendered Pages Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Data Preparator Integration Tests', () => {
    it('should prepare dashboard data without client-side API calls', async () => {
      const preparator = new DashboardDataPreparator()
      
      // Mock successful data preparation
      const mockData = {
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
        recentTransactions: [],
        goalProgress: [],
        portfolioSummary: {
          totalValue: 1000000,
          totalInvested: 800000,
          totalGains: 200000,
          gainsPercentage: 25,
        },
        timestamp: new Date(),
      }

      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
      vi.mocked(prisma.account.findMany).mockResolvedValue([])
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([])

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
      
      // Verify no client-side API calls would be needed
      expect(typeof result.summary.totalValue).toBe('number')
      expect(Array.isArray(result.recentTransactions)).toBe(true)
    })

    it('should prepare charts data with all calculations pre-processed', async () => {
      const preparator = new ChartsDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(result.dashboardData).toBeDefined()
      expect(Array.isArray(result.investments)).toBe(true)
      expect(Array.isArray(result.sips)).toBe(true)
      expect(Array.isArray(result.portfolioTrendData)).toBe(true)
      
      // Verify chart data is ready for immediate rendering
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should prepare investments list with current values calculated', async () => {
      const preparator = new InvestmentsDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(Array.isArray(result.investmentsWithValues)).toBe(true)
      expect(result.summary).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should prepare goals list with progress calculations', async () => {
      const preparator = new GoalsDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(Array.isArray(result.goalsWithProgress)).toBe(true)
      expect(result.summary).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should prepare SIPs list with current values', async () => {
      const preparator = new SIPsDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(Array.isArray(result.sipsWithValues)).toBe(true)
      expect(result.summary).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should prepare accounts list with balances', async () => {
      const preparator = new AccountsDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.account.findMany).mockResolvedValue([])
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])

      const result = await preparator.prepare()

      expect(result).toBeDefined()
      expect(Array.isArray(result.accountsWithTotals)).toBe(true)
      expect(result.summary).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Detail Page Data Preparation', () => {
    it('should prepare investment detail with all related data', async () => {
      const preparator = new InvestmentDetailDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      const mockInvestment = {
        id: '1',
        name: 'Test Investment',
        type: 'STOCK',
        symbol: 'TEST',
        units: 100,
        buyPrice: 50,
        currentPrice: 60,
        accountId: 'acc1',
        goalId: 'goal1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      vi.mocked(prisma.investment.findUnique).mockResolvedValue(mockInvestment)
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([])
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      const result = await preparator.prepare('1')

      expect(result).toBeDefined()
      expect(result.investment).toBeDefined()
      expect(result.investment.id).toBe('1')
      expect(Array.isArray(result.transactions)).toBe(true)
      expect(result.performance).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should prepare goal detail with allocations', async () => {
      const preparator = new GoalDetailDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      const mockGoal = {
        id: '1',
        name: 'Test Goal',
        targetAmount: 100000,
        targetDate: new Date('2025-12-31'),
        priority: 'HIGH',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      vi.mocked(prisma.goal.findUnique).mockResolvedValue(mockGoal)
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])

      const result = await preparator.prepare('1')

      expect(result).toBeDefined()
      expect(result.goal).toBeDefined()
      expect(result.goal.id).toBe('1')
      expect(Array.isArray(result.allocatedInvestments)).toBe(true)
      expect(result.progress).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should prepare SIP detail with transaction history', async () => {
      const preparator = new SIPDetailDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      const mockSIP = {
        id: '1',
        name: 'Test SIP',
        amount: 5000,
        frequency: 'MONTHLY',
        startDate: new Date('2024-01-01'),
        status: 'ACTIVE',
        investmentId: 'inv1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      vi.mocked(prisma.sIP.findUnique).mockResolvedValue(mockSIP)
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([])

      const result = await preparator.prepare('1')

      expect(result).toBeDefined()
      expect(result.sip).toBeDefined()
      expect(result.sip.id).toBe('1')
      expect(Array.isArray(result.transactions)).toBe(true)
      expect(result.performance).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should prepare account detail with investments', async () => {
      const preparator = new AccountDetailDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      const mockAccount = {
        id: '1',
        name: 'Test Account',
        type: 'DEMAT',
        provider: 'Test Broker',
        accountNumber: '12345',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccount)
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])

      const result = await preparator.prepare('1')

      expect(result).toBeDefined()
      expect(result.account).toBeDefined()
      expect(result.account.id).toBe('1')
      expect(Array.isArray(result.investments)).toBe(true)
      expect(result.totals).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Component Rendering with Server Data', () => {
    it('should render dashboard without loading states', () => {
      const mockData = {
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
        recentTransactions: [],
        goalProgress: [],
        portfolioSummary: {
          totalValue: 1000000,
          totalInvested: 800000,
          totalGains: 200000,
          gainsPercentage: 25,
        },
        timestamp: new Date(),
      }

      render(<DashboardView data={mockData} />)

      // Verify content is immediately visible
      expect(screen.getByText('₹10,00,000')).toBeInTheDocument()
      expect(screen.getByText('₹8,00,000')).toBeInTheDocument()
      expect(screen.getByText('₹2,00,000')).toBeInTheDocument()
      
      // Verify no loading states
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })

    it('should render charts with pre-calculated data', () => {
      const mockData = {
        dashboardData: {
          totalValue: 1000000,
          totalInvested: 800000,
          totalGains: 200000,
          gainsPercentage: 25,
          goalProgress: 75,
          activeGoals: 5,
          activeSIPs: 3,
          accounts: 2,
        },
        investments: [],
        sips: [],
        portfolioTrendData: [
          { date: '2024-01-01', value: 800000 },
          { date: '2024-12-31', value: 1000000 },
        ],
        timestamp: new Date(),
      }

      render(<ChartsView data={mockData} />)

      // Verify charts are rendered immediately
      expect(screen.getByText('Portfolio Performance')).toBeInTheDocument()
      
      // Verify no loading states
      expect(screen.queryByText('Loading charts...')).not.toBeInTheDocument()
    })

    it('should render investments list with calculated values', () => {
      const mockData = {
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
            account: { name: 'Test Account' },
            goal: { name: 'Test Goal' },
          },
        ],
        summary: {
          totalValue: 6000,
          totalInvested: 5000,
          totalGains: 1000,
          gainsPercentage: 20,
          count: 1,
        },
        timestamp: new Date(),
      }

      render(<InvestmentsView data={mockData} />)

      // Verify investment data is immediately visible
      expect(screen.getByText('Test Stock')).toBeInTheDocument()
      expect(screen.getByText('₹6,000')).toBeInTheDocument()
      expect(screen.getByText('₹1,000')).toBeInTheDocument()
      
      // Verify no loading states
      expect(screen.queryByText('Loading investments...')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling Validation', () => {
    it('should handle data preparation errors gracefully', async () => {
      const preparator = new DashboardDataPreparator()
      
      // Mock database error
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockRejectedValue(new Error('Database error'))

      // Should not throw, should return fallback data
      const result = await preparator.prepare()
      
      expect(result).toBeDefined()
      expect(result.summary).toBeDefined()
      // Fallback data should have safe defaults
      expect(typeof result.summary.totalValue).toBe('number')
    })

    it('should handle missing detail records with 404', async () => {
      const preparator = new InvestmentDetailDataPreparator()
      
      // Mock not found
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findUnique).mockResolvedValue(null)

      // Should throw NEXT_NOT_FOUND error
      await expect(preparator.prepare('nonexistent')).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('should handle partial data failures with degraded service', async () => {
      const preparator = new ChartsDataPreparator()
      
      // Mock partial failure
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
      vi.mocked(prisma.priceCache.findMany).mockRejectedValue(new Error('Price service down'))

      const result = await preparator.prepare()
      
      expect(result).toBeDefined()
      // Should still return data even with price service failure
      expect(result.dashboardData).toBeDefined()
      expect(Array.isArray(result.investments)).toBe(true)
    })
  })

  describe('Performance Validation', () => {
    it('should complete data preparation within reasonable time', async () => {
      const preparator = new DashboardDataPreparator()
      
      // Mock fast database responses
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
      vi.mocked(prisma.account.findMany).mockResolvedValue([])
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([])

      const startTime = Date.now()
      await preparator.prepare()
      const endTime = Date.now()
      
      // Should complete within 1 second for mocked data
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('should cache expensive operations', async () => {
      const preparator = new ChartsDataPreparator()
      
      // Mock database calls
      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.investment.findMany).mockResolvedValue([])
      vi.mocked(prisma.goal.findMany).mockResolvedValue([])
      vi.mocked(prisma.sIP.findMany).mockResolvedValue([])
      vi.mocked(prisma.priceCache.findMany).mockResolvedValue([])

      // First call
      await preparator.prepare()
      
      // Second call should use cache
      const startTime = Date.now()
      await preparator.prepare()
      const endTime = Date.now()
      
      // Cached call should be very fast
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})