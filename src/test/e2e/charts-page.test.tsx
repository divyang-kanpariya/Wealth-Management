import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChartsPage from '@/app/charts/page'

// Mock the API hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: () => ({
    execute: vi.fn().mockImplementation((url: string) => {
      if (url === '/api/dashboard/summary') {
        return Promise.resolve({
          portfolioSummary: {
            totalValue: 500000,
            totalInvested: 450000,
            totalGainLoss: 50000,
            totalGainLossPercentage: 11.11,
            assetAllocation: {
              STOCK: { value: 250000, percentage: 50 },
              MUTUAL_FUND: { value: 200000, percentage: 40 },
              GOLD: { value: 50000, percentage: 10 }
            },
            accountDistribution: {
              'Zerodha': { value: 300000, percentage: 60 },
              'Groww': { value: 200000, percentage: 40 }
            }
          },
          goalProgress: [
            {
              id: '1',
              name: 'House Down Payment',
              targetAmount: 1000000,
              currentValue: 300000,
              progress: 30,
              remainingAmount: 700000,
              targetDate: new Date('2025-12-31')
            }
          ],
          totalInvestments: 15,
          totalGoals: 3
        })
      }
      if (url === '/api/investments') {
        return Promise.resolve([
          {
            investment: {
              id: '1',
              name: 'RELIANCE',
              type: 'STOCK',
              units: 100,
              buyPrice: 2000,
              buyDate: new Date('2024-01-01'),
              accountId: '1',
              goalId: '1'
            },
            currentPrice: 2200,
            currentValue: 220000,
            gainLoss: 20000,
            gainLossPercentage: 10
          }
        ])
      }
      if (url === '/api/sips') {
        return Promise.resolve([
          {
            sip: {
              id: '1',
              name: 'HDFC Top 100',
              amount: 5000,
              frequency: 'MONTHLY',
              status: 'ACTIVE',
              startDate: new Date('2024-01-01'),
              accountId: '1',
              goalId: '1'
            },
            totalInvested: 50000,
            totalUnits: 1000,
            currentValue: 55000,
            averageNAV: 50,
            gainLoss: 5000,
            gainLossPercentage: 10
          }
        ])
      }
      return Promise.resolve(null)
    })
  })
}))

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Radar: () => <div data-testid="radar-chart">Radar Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>
}))

// Mock Chart.js registration
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn()
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  BarElement: {},
  ArcElement: {},
  RadialLinearScale: {},
  Filler: {},
  Title: {},
  Tooltip: {},
  Legend: {}
}))

// Mock Layout component
vi.mock('@/components/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  )
}))

describe('ChartsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<ChartsPage />)
    
    expect(screen.getByText('Investment Analytics')).toBeInTheDocument()
    expect(screen.getByText('Comprehensive visualization of your portfolio performance')).toBeInTheDocument()
  })

  it('renders charts after data loads', async () => {
    render(<ChartsPage />)

    await waitFor(() => {
      expect(screen.getByText('Investment Analytics')).toBeInTheDocument()
    })

    // Wait for charts to render
    await waitFor(() => {
      expect(screen.getByText('Portfolio Performance')).toBeInTheDocument()
      expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
      expect(screen.getByText('SIP Performance & Projections')).toBeInTheDocument()
      expect(screen.getByText('Goal Progress Timeline')).toBeInTheDocument()
      expect(screen.getByText('Investment Analysis')).toBeInTheDocument()
    })
  })

  it('displays portfolio summary stats', async () => {
    render(<ChartsPage />)

    await waitFor(() => {
      expect(screen.getByText('Total Portfolio')).toBeInTheDocument()
      expect(screen.getByText('Total Return')).toBeInTheDocument()
      expect(screen.getByText('Active Investments')).toBeInTheDocument()
      expect(screen.getByText('Active Goals')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('₹5,00,000')).toBeInTheDocument()
      expect(screen.getByText('+11.11%')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('renders all chart components', async () => {
    render(<ChartsPage />)

    // Wait for data to load and charts to render
    await waitFor(() => {
      expect(screen.getByText('₹5,00,000')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Check for chart containers after data loads
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    }, { timeout: 2000 })

    await waitFor(() => {
      expect(screen.getAllByTestId('line-chart').length).toBeGreaterThanOrEqual(1)
    }, { timeout: 2000 })
  })

  it('shows footer with last updated time', async () => {
    render(<ChartsPage />)

    await waitFor(() => {
      expect(screen.getByText('Charts are updated in real-time based on your latest investment data')).toBeInTheDocument()
      expect(screen.getAllByText(/Last updated:/).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('handles responsive layout', async () => {
    render(<ChartsPage />)

    await waitFor(() => {
      // Check for grid layout classes
      const gridElements = document.querySelectorAll('.grid')
      expect(gridElements.length).toBeGreaterThan(0)
    })
  })
})