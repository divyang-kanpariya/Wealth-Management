import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvestmentTable from '@/components/investments/InvestmentTable';
import { InvestmentWithCurrentValue, Goal, Account } from '@/types';

// Mock getBoundingClientRect for positioning tests
const mockGetBoundingClientRect = vi.fn();

describe('DropdownMenu in Table Integration', () => {
  const mockGoals: Goal[] = [
    {
      id: '1',
      name: 'Test Goal',
      targetAmount: 100000,
      targetDate: new Date('2025-12-31'),
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockAccounts: Account[] = [
    {
      id: '1',
      name: 'Test Account',
      type: 'BROKER',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockInvestments: InvestmentWithCurrentValue[] = [
    {
      investment: {
        id: '1',
        name: 'Test Stock',
        type: 'STOCK',
        symbol: 'TEST',
        units: 100,
        buyPrice: 50,
        buyDate: new Date('2024-01-01'),
        accountId: '1',
        goalId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      currentValue: 5500,
      currentPrice: 55,
      gainLoss: 500,
      gainLossPercentage: 10
    },
    {
      investment: {
        id: '2',
        name: 'Test Mutual Fund',
        type: 'MUTUAL_FUND',
        symbol: 'TESTMF',
        units: 200,
        buyPrice: 25,
        buyDate: new Date('2024-01-01'),
        accountId: '1',
        goalId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      currentValue: 4800,
      currentPrice: 24,
      gainLoss: -200,
      gainLossPercentage: -4
    }
  ];

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onViewDetails: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock getBoundingClientRect for consistent positioning
    Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;
    
    // Default positioning - center of viewport
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });
  });

  it('should render dropdown menus for each table row', async () => {
    render(
      <InvestmentTable
        investments={mockInvestments}
        goals={mockGoals}
        accounts={mockAccounts}
        {...mockHandlers}
      />
    );

    // Find all action buttons (three-dot menus)
    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    expect(actionButtons).toHaveLength(2); // One for each investment
  });

  it('should open dropdown menu when action button is clicked', async () => {
    render(
      <InvestmentTable
        investments={mockInvestments}
        goals={mockGoals}
        accounts={mockAccounts}
        {...mockHandlers}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit Investment')).toBeInTheDocument();
      expect(screen.getByText('Delete Investment')).toBeInTheDocument();
    });
  });

  it('should handle dropdown positioning in table context', async () => {
    render(
      <InvestmentTable
        investments={mockInvestments}
        goals={mockGoals}
        accounts={mockAccounts}
        {...mockHandlers}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveClass('absolute');
    });
  });

  it('should handle edge case positioning for last row', async () => {
    // Mock positioning near bottom of viewport (simulating last row)
    mockGetBoundingClientRect.mockReturnValue({
      top: 700, // Near bottom
      bottom: 732,
      left: 400,
      right: 432,
      width: 32,
      height: 32
    });

    render(
      <InvestmentTable
        investments={mockInvestments}
        goals={mockGoals}
        accounts={mockAccounts}
        {...mockHandlers}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    fireEvent.click(actionButtons[1]); // Click second button (simulating last row)

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      // Should position above trigger when near bottom
      expect(menu).toHaveClass('bottom-full', 'mb-1');
    });
  });

  it('should handle edge case positioning for right edge', async () => {
    // Mock positioning near right edge of viewport
    mockGetBoundingClientRect.mockReturnValue({
      top: 300,
      bottom: 332,
      left: 900, // Near right edge
      right: 932,
      width: 32,
      height: 32
    });

    render(
      <InvestmentTable
        investments={mockInvestments}
        goals={mockGoals}
        accounts={mockAccounts}
        {...mockHandlers}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      // Should position to left when near right edge
      expect(menu).toHaveClass('left-0');
    });
  });

  it('should call correct handlers when menu items are clicked', async () => {
    render(
      <InvestmentTable
        investments={mockInvestments}
        goals={mockGoals}
        accounts={mockAccounts}
        {...mockHandlers}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    // Click on View Details
    fireEvent.click(screen.getByText('View Details'));

    expect(mockHandlers.onViewDetails).toHaveBeenCalledWith(mockInvestments[0].investment);

    // Open menu again and test Edit
    fireEvent.click(actionButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Edit Investment')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Investment'));
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockInvestments[0].investment);
  });

  it('should close dropdown when clicking outside table', async () => {
    render(
      <div>
        <InvestmentTable
          investments={mockInvestments}
          goals={mockGoals}
          accounts={mockAccounts}
          {...mockHandlers}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    });
  });

  it('should handle multiple dropdowns in table correctly', async () => {
    render(
      <InvestmentTable
        investments={mockInvestments}
        goals={mockGoals}
        accounts={mockAccounts}
        {...mockHandlers}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    
    // Open first dropdown
    fireEvent.click(actionButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    // Open second dropdown (both can be open simultaneously)
    fireEvent.click(actionButtons[1]);
    await waitFor(() => {
      // Should have two menus open
      const menus = screen.getAllByRole('menu');
      expect(menus).toHaveLength(2);
    });

    // Clicking outside should close both
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      const menus = screen.queryAllByRole('menu');
      expect(menus).toHaveLength(0);
    });
  });

  it('should work correctly with scrollable table', async () => {
    // Create more investments to make table scrollable
    const manyInvestments = Array.from({ length: 10 }, (_, i) => ({
      ...mockInvestments[0],
      investment: {
        ...mockInvestments[0].investment,
        id: `investment-${i}`,
        name: `Investment ${i + 1}`
      }
    }));

    render(
      <div style={{ height: '300px', overflow: 'auto' }}>
        <InvestmentTable
          investments={manyInvestments}
          goals={mockGoals}
          accounts={mockAccounts}
          {...mockHandlers}
        />
      </div>
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    expect(actionButtons.length).toBeGreaterThan(5);

    // Test dropdown on first visible item
    fireEvent.click(actionButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
  });
});