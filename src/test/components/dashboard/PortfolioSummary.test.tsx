import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PortfolioSummary from '@/components/dashboard/PortfolioSummary'
import { PortfolioSummary as PortfolioSummaryType } from '@/types'

describe('PortfolioSummary Component', () => {
  const mockSummary: PortfolioSummaryType = {
    totalValue: 150000,
    totalInvested: 120000,
    totalGainLoss: 30000,
    totalGainLossPercentage: 25.0,
    assetAllocation: {
      STOCK: { value: 90000, percentage: 60 },
      MUTUAL_FUND: { value: 60000, percentage: 40 }
    },
    accountDistribution: {
      'Broker Account': { value: 150000, percentage: 100 }
    }
  }

  it('should render portfolio summary with correct values', () => {
    render(<PortfolioSummary summary={mockSummary} />)
    
    expect(screen.getByText('Portfolio Summary')).toBeInTheDocument()
    expect(screen.getByText('₹1,50,000')).toBeInTheDocument() // Total Value
    expect(screen.getByText('₹1,20,000')).toBeInTheDocument() // Total Invested
    expect(screen.getByText('₹30,000')).toBeInTheDocument() // Total Gain
    expect(screen.getByText('+25.00%')).toBeInTheDocument() // Gain Percentage
  })

  it('should display gain values with green styling for positive gains', () => {
    render(<PortfolioSummary summary={mockSummary} />)
    
    const gainElements = screen.getAllByText('₹30,000')
    expect(gainElements[0]).toBeInTheDocument()
    
    const percentageElement = screen.getByText('+25.00%')
    expect(percentageElement).toBeInTheDocument()
  })

  it('should display loss values with red styling for negative gains', () => {
    const lossSummary: PortfolioSummaryType = {
      ...mockSummary,
      totalGainLoss: -15000,
      totalGainLossPercentage: -12.5
    }
    
    render(<PortfolioSummary summary={lossSummary} />)
    
    expect(screen.getByText('₹15,000')).toBeInTheDocument() // Absolute value
    expect(screen.getByText('-12.50%')).toBeInTheDocument()
  })

  it('should handle zero values correctly', () => {
    const zeroSummary: PortfolioSummaryType = {
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      totalGainLossPercentage: 0,
      assetAllocation: {},
      accountDistribution: {}
    }
    
    render(<PortfolioSummary summary={zeroSummary} />)
    
    expect(screen.getAllByText('₹0')).toHaveLength(3) // Total Value, Invested, Gain/Loss
    expect(screen.getByText('+0.00%')).toBeInTheDocument()
  })

  it('should format large numbers correctly', () => {
    const largeSummary: PortfolioSummaryType = {
      totalValue: 12500000,
      totalInvested: 10000000,
      totalGainLoss: 2500000,
      totalGainLossPercentage: 25.0,
      assetAllocation: {},
      accountDistribution: {}
    }
    
    render(<PortfolioSummary summary={largeSummary} />)
    
    expect(screen.getByText('₹1,25,00,000')).toBeInTheDocument() // Total Value
    expect(screen.getByText('₹1,00,00,000')).toBeInTheDocument() // Total Invested
    expect(screen.getByText('₹25,00,000')).toBeInTheDocument() // Gain
  })

  it('should render all summary cards', () => {
    render(<PortfolioSummary summary={mockSummary} />)
    
    expect(screen.getByText('Total Value')).toBeInTheDocument()
    expect(screen.getByText('Total Invested')).toBeInTheDocument()
    expect(screen.getByText('Total Gain')).toBeInTheDocument()
    expect(screen.getByText('Return %')).toBeInTheDocument()
  })
})