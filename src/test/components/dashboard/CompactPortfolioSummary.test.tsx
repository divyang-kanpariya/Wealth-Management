import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CompactPortfolioSummary from '@/components/dashboard/CompactPortfolioSummary';
import { PortfolioSummary } from '@/types';

describe('CompactPortfolioSummary', () => {
  const mockSummary: PortfolioSummary = {
    totalValue: 150000,
    totalInvested: 120000,
    totalGainLoss: 30000,
    totalGainLossPercentage: 25,
    assetAllocation: {
      STOCK: { value: 80000, percentage: 53.33 },
      MUTUAL_FUND: { value: 50000, percentage: 33.33 },
      GOLD: { value: 20000, percentage: 13.33 }
    },
    accountDistribution: {
      'Zerodha': { value: 100000, percentage: 66.67 },
      'SBI Bank': { value: 50000, percentage: 33.33 }
    }
  };

  it('renders portfolio summary with correct values', () => {
    render(<CompactPortfolioSummary summary={mockSummary} />);

    expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
    expect(screen.getByText('₹1,50,000')).toBeInTheDocument(); // Total value
    expect(screen.getByText('₹1,20,000')).toBeInTheDocument(); // Total invested
    expect(screen.getByText('₹30,000')).toBeInTheDocument(); // Gain
    expect(screen.getByText('+25.00%')).toBeInTheDocument(); // Percentage
  });

  it('displays correct labels for positive gains', () => {
    render(<CompactPortfolioSummary summary={mockSummary} />);

    expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
    expect(screen.getByText('Total Invested')).toBeInTheDocument();
    expect(screen.getByText('Total Gain')).toBeInTheDocument();
    expect(screen.getByText('Return Rate')).toBeInTheDocument();
  });

  it('displays correct labels and styling for losses', () => {
    const lossSummary: PortfolioSummary = {
      ...mockSummary,
      totalValue: 100000,
      totalGainLoss: -20000,
      totalGainLossPercentage: -16.67
    };

    render(<CompactPortfolioSummary summary={lossSummary} />);

    expect(screen.getByText('Total Loss')).toBeInTheDocument();
    expect(screen.getByText('₹20,000')).toBeInTheDocument(); // Absolute value
    expect(screen.getByText('-16.67%')).toBeInTheDocument();
    expect(screen.getByText('Negative return')).toBeInTheDocument();
  });

  it('shows appropriate status indicators', () => {
    render(<CompactPortfolioSummary summary={mockSummary} />);

    // Should show success status for positive returns
    const returnRateSection = screen.getByText('Return Rate').closest('div');
    expect(returnRateSection).toBeInTheDocument();
  });

  it('displays current time in last updated', () => {
    render(<CompactPortfolioSummary summary={mockSummary} />);

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroSummary: PortfolioSummary = {
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      totalGainLossPercentage: 0,
      assetAllocation: {},
      accountDistribution: {}
    };

    render(<CompactPortfolioSummary summary={zeroSummary} />);

    expect(screen.getByText('₹0')).toBeInTheDocument();
    expect(screen.getByText('+0.00%')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeSummary: PortfolioSummary = {
      totalValue: 1500000,
      totalInvested: 1200000,
      totalGainLoss: 300000,
      totalGainLossPercentage: 25,
      assetAllocation: {},
      accountDistribution: {}
    };

    render(<CompactPortfolioSummary summary={largeSummary} />);

    expect(screen.getByText('₹15,00,000')).toBeInTheDocument();
    expect(screen.getByText('₹12,00,000')).toBeInTheDocument();
    expect(screen.getByText('₹3,00,000')).toBeInTheDocument();
  });

  it('shows correct icons for different metrics', () => {
    render(<CompactPortfolioSummary summary={mockSummary} />);

    // Should render SVG icons for each metric
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('displays sub-values correctly', () => {
    render(<CompactPortfolioSummary summary={mockSummary} />);

    expect(screen.getByText('Current market value')).toBeInTheDocument();
    expect(screen.getByText('Amount invested')).toBeInTheDocument();
    expect(screen.getByText('Positive return')).toBeInTheDocument();
  });

  it('handles edge case with very small percentages', () => {
    const smallPercentageSummary: PortfolioSummary = {
      ...mockSummary,
      totalGainLoss: 1,
      totalGainLossPercentage: 0.01
    };

    render(<CompactPortfolioSummary summary={smallPercentageSummary} />);

    expect(screen.getByText('+0.01%')).toBeInTheDocument();
  });

  it('handles edge case with very large percentages', () => {
    const largePercentageSummary: PortfolioSummary = {
      ...mockSummary,
      totalGainLoss: 120000,
      totalGainLossPercentage: 100
    };

    render(<CompactPortfolioSummary summary={largePercentageSummary} />);

    expect(screen.getByText('+100.00%')).toBeInTheDocument();
  });

  it('renders with compact card styling', () => {
    render(<CompactPortfolioSummary summary={mockSummary} />);

    const card = screen.getByText('Portfolio Overview').closest('div');
    expect(card).toHaveClass('rounded-lg');
  });

  it('uses data grid for layout', () => {
    render(<CompactPortfolioSummary summary={mockSummary} />);

    // Should render in a grid layout
    const gridContainer = screen.getByText('Portfolio Value').closest('.grid');
    expect(gridContainer).toBeInTheDocument();
  });
});