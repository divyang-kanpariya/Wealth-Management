import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoalAnalytics from '@/components/goals/GoalAnalytics';
import { Goal, Investment, InvestmentType } from '@/types';

// Mock the fetch function
global.fetch = vi.fn();

// Mock chart components
vi.mock('@/components/ui/ProgressChart', () => ({
  default: ({ currentAmount, targetAmount }: any) => (
    <div data-testid="progress-chart">
      Progress: {currentAmount}/{targetAmount}
    </div>
  )
}));

vi.mock('@/components/ui/AllocationChart', () => ({
  default: ({ data }: any) => (
    <div data-testid="allocation-chart">
      Allocation: {data.length} items
    </div>
  )
}));

vi.mock('@/components/ui/TimelineChart', () => ({
  default: ({ data }: any) => (
    <div data-testid="timeline-chart">
      Timeline: {data.length} points
    </div>
  )
}));

describe('GoalAnalytics', () => {
  const mockGoal: Goal = {
    id: 'goal-1',
    name: 'Emergency Fund',
    targetAmount: 100000,
    targetDate: new Date('2025-12-31'),
    priority: 1,
    description: 'Emergency fund goal',
    createdAt: new Date(),
    updatedAt: new Date(),
    investments: []
  };

  const mockInvestments: Investment[] = [
    {
      id: 'inv-1',
      type: 'STOCK' as InvestmentType,
      name: 'Apple Inc',
      symbol: 'AAPL',
      units: 10,
      buyPrice: 150,
      buyDate: new Date('2024-01-01'),
      goalId: 'goal-1',
      accountId: 'acc-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      account: {
        id: 'acc-1',
        name: 'Brokerage Account',
        type: 'BROKER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'inv-2',
      type: 'MUTUAL_FUND' as InvestmentType,
      name: 'S&P 500 Fund',
      symbol: 'SPY',
      units: 20,
      buyPrice: 400,
      buyDate: new Date('2024-02-01'),
      goalId: 'goal-1',
      accountId: 'acc-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      account: {
        id: 'acc-1',
        name: 'Brokerage Account',
        type: 'BROKER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'inv-3',
      type: 'REAL_ESTATE' as InvestmentType,
      name: 'Investment Property',
      totalValue: 50000,
      buyDate: new Date('2024-03-01'),
      goalId: 'goal-1',
      accountId: 'acc-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      account: {
        id: 'acc-2',
        name: 'Real Estate Account',
        type: 'OTHER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful price fetches
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('AAPL')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ price: 180 })
        });
      }
      if (url.includes('SPY')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ price: 450 })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  it('renders loading state initially', () => {
    render(<GoalAnalytics goal={mockGoal} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders overview tab with basic metrics for goal without investments', async () => {
    render(<GoalAnalytics goal={mockGoal} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Goal Progress')).toBeInTheDocument();
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
  });

  it('renders all analytics tabs for goal with investments', async () => {
    const goalWithInvestments = {
      ...mockGoal,
      investments: mockInvestments
    };

    render(<GoalAnalytics goal={goalWithInvestments} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check all tabs are present
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Allocation')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Risk Analysis')).toBeInTheDocument();
    expect(screen.getByText('Trends')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    const goalWithInvestments = {
      ...mockGoal,
      investments: mockInvestments
    };

    render(<GoalAnalytics goal={goalWithInvestments} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Click on Performance tab
    fireEvent.click(screen.getByText('Performance'));
    expect(screen.getByText('Performance Summary')).toBeInTheDocument();
    expect(screen.getByText('Advanced Metrics')).toBeInTheDocument();

    // Click on Risk Analysis tab
    fireEvent.click(screen.getByText('Risk Analysis'));
    expect(screen.getByText('Risk Overview')).toBeInTheDocument();
    expect(screen.getByText('Asset Risk Breakdown')).toBeInTheDocument();

    // Click on Trends tab
    fireEvent.click(screen.getByText('Trends'));
    expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
  });

  it('calculates performance metrics correctly', async () => {
    const goalWithInvestments = {
      ...mockGoal,
      investments: mockInvestments
    };

    render(<GoalAnalytics goal={goalWithInvestments} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should show progress percentage
    expect(screen.getByText(/Progress/)).toBeInTheDocument();
    
    // Should show gain/loss information
    expect(screen.getByText(/Total Return/)).toBeInTheDocument();
    expect(screen.getByText(/Gain\/Loss/)).toBeInTheDocument();
  });

  it('displays risk analysis correctly', async () => {
    const goalWithInvestments = {
      ...mockGoal,
      investments: mockInvestments
    };

    render(<GoalAnalytics goal={goalWithInvestments} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Switch to Risk Analysis tab
    fireEvent.click(screen.getByText('Risk Analysis'));

    await waitFor(() => {
      expect(screen.getByText('Risk Score')).toBeInTheDocument();
      expect(screen.getByText('Diversification')).toBeInTheDocument();
      expect(screen.getByText('Asset Types')).toBeInTheDocument();
    });
  });

  it('displays trend analysis correctly', async () => {
    const goalWithInvestments = {
      ...mockGoal,
      investments: mockInvestments
    };

    render(<GoalAnalytics goal={goalWithInvestments} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Switch to Trends tab
    fireEvent.click(screen.getByText('Trends'));

    await waitFor(() => {
      expect(screen.getByText('Trend Direction')).toBeInTheDocument();
      expect(screen.getByText('Monthly Growth')).toBeInTheDocument();
      expect(screen.getByText('Confidence Level')).toBeInTheDocument();
    });
  });

  it('handles price fetching errors gracefully', async () => {
    // Mock fetch to fail
    (global.fetch as any).mockImplementation(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'API Error' })
      })
    );

    const goalWithInvestments = {
      ...mockGoal,
      investments: mockInvestments
    };

    render(<GoalAnalytics goal={goalWithInvestments} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should still render without crashing
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('displays allocation charts correctly', async () => {
    const goalWithInvestments = {
      ...mockGoal,
      investments: mockInvestments
    };

    render(<GoalAnalytics goal={goalWithInvestments} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Switch to Allocation tab
    fireEvent.click(screen.getByText('Allocation'));

    await waitFor(() => {
      expect(screen.getByText('Asset Allocation')).toBeInTheDocument();
      expect(screen.getByText('Account Allocation')).toBeInTheDocument();
      expect(screen.getAllByTestId('allocation-chart')).toHaveLength(2);
    });
  });

  it('displays timeline chart correctly', async () => {
    const goalWithInvestments = {
      ...mockGoal,
      investments: mockInvestments
    };

    render(<GoalAnalytics goal={goalWithInvestments} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Switch to Timeline tab
    fireEvent.click(screen.getByText('Timeline'));

    await waitFor(() => {
      expect(screen.getByText('Investment Timeline')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-chart')).toBeInTheDocument();
    });
  });

  it('calculates risk scores correctly for different investment types', async () => {
    const highRiskInvestments: Investment[] = [
      {
        ...mockInvestments[0],
        type: 'CRYPTO' as InvestmentType,
        name: 'Bitcoin'
      }
    ];

    const goalWithHighRisk = {
      ...mockGoal,
      investments: highRiskInvestments
    };

    render(<GoalAnalytics goal={goalWithHighRisk} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Switch to Risk Analysis tab
    fireEvent.click(screen.getByText('Risk Analysis'));

    await waitFor(() => {
      // Should show high risk indicators
      expect(screen.getByText('Risk Score')).toBeInTheDocument();
    });
  });

  it('provides risk recommendations based on portfolio composition', async () => {
    const unbalancedInvestments: Investment[] = [
      {
        ...mockInvestments[0],
        type: 'CRYPTO' as InvestmentType,
        totalValue: 90000
      }
    ];

    const goalWithUnbalanced = {
      ...mockGoal,
      investments: unbalancedInvestments
    };

    render(<GoalAnalytics goal={goalWithUnbalanced} />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Switch to Risk Analysis tab
    fireEvent.click(screen.getByText('Risk Analysis'));

    await waitFor(() => {
      expect(screen.getByText('Risk Management Recommendations')).toBeInTheDocument();
    });
  });
});