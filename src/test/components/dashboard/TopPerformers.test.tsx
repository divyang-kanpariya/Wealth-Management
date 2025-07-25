import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TopPerformers from '@/components/dashboard/TopPerformers'
import { InvestmentWithCurrentValue, Investment, InvestmentType, AccountType } from '@/types'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

describe('TopPerformers Component', () => {
  const mockInvestments: InvestmentWithCurrentValue[] = [
    {
      investment: {
        id: '1',
        type: InvestmentType.STOCK,
        name: 'Good Stock',
        symbol: 'GOOD',
        units: 100,
        buyPrice: 100,
        buyDate: new Date('2024-01-01'),
        accountId: 'acc1',
        createdAt: new Date(),
        updatedAt: new Date(),
        account: {
          id: 'acc1',
          name: 'Broker Account',
          type: AccountType.BROKER,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } as Investment,
      currentPrice: 150,
      currentValue: 15000,
      gainLoss: 5000,
      gainLossPercentage: 50.0
    },
    {
      investment: {
        id: '2',
        type: InvestmentType.STOCK,
        name: 'Poor Stock',
        symbol: 'POOR',
        units: 100,
        buyPrice: 200,
        buyDate: new Date('2024-01-01'),
        accountId: 'acc1',
        createdAt: new Date(),
        updatedAt: new Date(),
        account: {
          id: 'acc1',
          name: 'Broker Account',
          type: AccountType.BROKER,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } as Investment,
      currentPrice: 120,
      currentValue: 12000,
      gainLoss: -8000,
      gainLossPercentage: -40.0
    },
    {
      investment: {
        id: '3',
        type: InvestmentType.MUTUAL_FUND,
        name: 'Average MF',
        symbol: 'AVG',
        units: 500,
        buyPrice: 20,
        buyDate: new Date('2024-01-01'),
        accountId: 'acc1',
        createdAt: new Date(),
        updatedAt: new Date(),
        account: {
          id: 'acc1',
          name: 'Broker Account',
          type: AccountType.BROKER,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } as Investment,
      currentPrice: 22,
      currentValue: 11000,
      gainLoss: 1000,
      gainLossPercentage: 10.0
    }
  ]

  it('should render top performers sections', () => {
    render(<TopPerformers investments={mockInvestments} />)
    
    expect(screen.getByText('Top Performers (Amount)')).toBeInTheDocument()
    expect(screen.getByText('Top Performers (%)')).toBeInTheDocument()
    expect(screen.getAllByText('View All')).toHaveLength(2)
  })

  it('should display top gainers and losers by amount', () => {
    render(<TopPerformers investments={mockInvestments} />)
    
    expect(screen.getByText('Top Gainers')).toBeInTheDocument()
    expect(screen.getByText('Top Losers')).toBeInTheDocument()
    
    // Should show investment names
    expect(screen.getAllByText('Good Stock')).toHaveLength(2) // Appears in both sections
    expect(screen.getAllByText('Poor Stock')).toHaveLength(2)
    expect(screen.getAllByText('Average MF')).toHaveLength(2)
  })

  it('should display best and worst performers by percentage', () => {
    render(<TopPerformers investments={mockInvestments} />)
    
    expect(screen.getByText('Best Returns')).toBeInTheDocument()
    expect(screen.getByText('Worst Returns')).toBeInTheDocument()
  })

  it('should format currency values correctly', () => {
    render(<TopPerformers investments={mockInvestments} />)
    
    expect(screen.getByText('₹5,000')).toBeInTheDocument() // Good Stock gain
    expect(screen.getByText('₹8,000')).toBeInTheDocument() // Poor Stock loss (absolute)
    expect(screen.getByText('₹1,000')).toBeInTheDocument() // Average MF gain
  })

  it('should format percentage values correctly', () => {
    render(<TopPerformers investments={mockInvestments} />)
    
    expect(screen.getByText('+50.00%')).toBeInTheDocument() // Good Stock
    expect(screen.getByText('-40.00%')).toBeInTheDocument() // Poor Stock
    expect(screen.getByText('+10.00%')).toBeInTheDocument() // Average MF
  })

  it('should display investment types correctly', () => {
    render(<TopPerformers investments={mockInvestments} />)
    
    expect(screen.getAllByText('STOCK')).toHaveLength(4) // 2 stocks × 2 sections each
    expect(screen.getAllByText('MUTUAL FUND')).toHaveLength(2) // 1 MF × 2 sections
  })

  it('should handle empty investment list', () => {
    render(<TopPerformers investments={[]} />)
    
    expect(screen.getAllByText('No performance data available')).toHaveLength(2)
  })

  it('should handle investments with only gains', () => {
    const gainOnlyInvestments = mockInvestments.filter(inv => inv.gainLoss > 0)
    
    render(<TopPerformers investments={gainOnlyInvestments} />)
    
    expect(screen.getByText('Top Gainers')).toBeInTheDocument()
    expect(screen.queryByText('Top Losers')).not.toBeInTheDocument()
    expect(screen.getByText('Best Returns')).toBeInTheDocument()
    expect(screen.queryByText('Worst Returns')).not.toBeInTheDocument()
  })

  it('should handle investments with only losses', () => {
    const lossOnlyInvestments = mockInvestments.filter(inv => inv.gainLoss < 0)
    
    render(<TopPerformers investments={lossOnlyInvestments} />)
    
    expect(screen.queryByText('Top Gainers')).not.toBeInTheDocument()
    expect(screen.getByText('Top Losers')).toBeInTheDocument()
    expect(screen.queryByText('Best Returns')).not.toBeInTheDocument()
    expect(screen.getByText('Worst Returns')).toBeInTheDocument()
  })

  it('should sort gainers by absolute gain amount (descending)', () => {
    render(<TopPerformers investments={mockInvestments} />)
    
    const gainersSection = screen.getByText('Top Gainers').closest('div')
    const investmentNames = gainersSection?.querySelectorAll('div > div:first-child > div:first-child')
    
    // Good Stock should appear before Average MF (5000 > 1000)
    expect(investmentNames?.[0]).toHaveTextContent('Good Stock')
    expect(investmentNames?.[1]).toHaveTextContent('Average MF')
  })

  it('should sort losers by absolute loss amount (ascending)', () => {
    render(<TopPerformers investments={mockInvestments} />)
    
    const losersSection = screen.getByText('Top Losers').closest('div')
    
    // Should show Poor Stock (the only loser in our test data)
    expect(losersSection).toHaveTextContent('Poor Stock')
  })

  it('should sort by percentage correctly', () => {
    render(<TopPerformers investments={mockInvestments} />)
    
    const bestReturnsSection = screen.getByText('Best Returns').closest('div')
    const investmentNames = bestReturnsSection?.querySelectorAll('div > div:first-child > div:first-child')
    
    // Good Stock (50%) should appear before Average MF (10%)
    expect(investmentNames?.[0]).toHaveTextContent('Good Stock')
    expect(investmentNames?.[1]).toHaveTextContent('Average MF')
  })

  it('should limit display to top 3 performers', () => {
    // Create more investments to test the limit
    const manyInvestments: InvestmentWithCurrentValue[] = Array.from({ length: 5 }, (_, i) => ({
      investment: {
        id: `${i + 1}`,
        type: InvestmentType.STOCK,
        name: `Stock ${i + 1}`,
        symbol: `STK${i + 1}`,
        units: 100,
        buyPrice: 100,
        buyDate: new Date('2024-01-01'),
        accountId: 'acc1',
        createdAt: new Date(),
        updatedAt: new Date(),
        account: {
          id: 'acc1',
          name: 'Broker Account',
          type: AccountType.BROKER,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } as Investment,
      currentPrice: 110 + i * 10, // Different prices for different gains
      currentValue: (110 + i * 10) * 100,
      gainLoss: (10 + i * 10) * 100,
      gainLossPercentage: 10 + i * 10
    }))
    
    render(<TopPerformers investments={manyInvestments} />)
    
    // Should show Stock 5, Stock 4, Stock 3 (top 3 gainers)
    expect(screen.getByText('Stock 5')).toBeInTheDocument()
    expect(screen.getByText('Stock 4')).toBeInTheDocument()
    expect(screen.getByText('Stock 3')).toBeInTheDocument()
    
    // Should not show Stock 1 and Stock 2 (they would be 4th and 5th)
    expect(screen.queryByText('Stock 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Stock 2')).not.toBeInTheDocument()
  })

  it('should handle investments without current prices', () => {
    const investmentsWithoutPrices: InvestmentWithCurrentValue[] = [
      {
        investment: {
          id: '1',
          type: InvestmentType.REAL_ESTATE,
          name: 'Property Investment',
          totalValue: 1000000,
          buyDate: new Date('2024-01-01'),
          accountId: 'acc1',
          createdAt: new Date(),
          updatedAt: new Date(),
          account: {
            id: 'acc1',
            name: 'Bank Account',
            type: AccountType.BANK,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        } as Investment,
        currentValue: 1000000,
        gainLoss: 0,
        gainLossPercentage: 0
      }
    ]
    
    render(<TopPerformers investments={investmentsWithoutPrices} />)
    
    // Should show "No performance data available" since real estate doesn't have price data
    expect(screen.getAllByText('No performance data available')).toHaveLength(2)
  })
})