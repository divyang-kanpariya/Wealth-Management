import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvestmentTable from '../components/investments/InvestmentTable';
import { InvestmentWithCurrentValue, Goal, Account } from '../types';

// Mock data
const mockGoals: Goal[] = [
  {
    id: '1',
    name: 'Retirement',
    targetAmount: 1000000,
    targetDate: new Date('2030-12-31'),
    priority: 'HIGH',
    description: 'Retirement savings',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'Zerodha',
    type: 'DEMAT',
    description: 'Trading account',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockInvestments: InvestmentWithCurrentValue[] = [
  {
    investment: {
      id: '1',
      name: 'Reliance Industries',
      type: 'STOCK',
      symbol: 'RELIANCE',
      units: 100,
      buyPrice: 2000,
      totalValue: null,
      buyDate: new Date('2023-01-01'),
      goalId: '1',
      accountId: '1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    currentValue: 250000,
    currentPrice: 2500,
    gainLoss: 50000,
    gainLossPercentage: 25
  },
  {
    investment: {
      id: '2',
      name: 'HDFC Bank',
      type: 'STOCK',
      symbol: 'HDFCBANK',
      units: 50,
      buyPrice: 1500,
      totalValue: null,
      buyDate: new Date('2023-02-01'),
      goalId: '1',
      accountId: '1',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    currentValue: 80000,
    currentPrice: 1600,
    gainLoss: 5000,
    gainLossPercentage: 6.67
  }
];

describe('Table Dropdown Integration', () => {
  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onViewDetails: vi.fn(),
    onSort: vi.fn(),
    onSelectionChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock getBoundingClientRect for consistent positioning
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 132,
      left: 800,
      right: 832,
      width: 32,
      height: 32,
      x: 800,
      y: 100
    }));
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

    // Click first dropdown
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit Investment')).toBeInTheDocument();
      expect(screen.getByText('Delete Investment')).toBeInTheDocument();
    });
  });

  it('should handle dropdown actions correctly', async () => {
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

    // Click view details
    fireEvent.click(screen.getByText('View Details'));

    expect(mockHandlers.onViewDetails).toHaveBeenCalledWith(mockInvestments[0].investment);
  });

  it('should close dropdown when clicking outside', async () => {
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

    // Click outside the dropdown
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    });
  });

  it('should handle multiple dropdowns correctly', async () => {
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

    // Open second dropdown (should close first)
    fireEvent.click(actionButtons[1]);

    await waitFor(() => {
      // Should still have View Details (from second dropdown)
      expect(screen.getByText('View Details')).toBeInTheDocument();
      // But only one dropdown should be open
      expect(screen.getAllByText('View Details')).toHaveLength(1);
    });
  });

  it('should position dropdown correctly in scrollable table', async () => {
    // Create a scrollable container
    const { container } = render(
      <div style={{ height: '300px', overflow: 'auto' }}>
        <InvestmentTable
          investments={mockInvestments}
          goals={mockGoals}
          accounts={mockAccounts}
          {...mockHandlers}
        />
      </div>
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
      
      // Verify dropdown uses fixed positioning
      const styles = window.getComputedStyle(dropdown);
      expect(styles.position).toBe('fixed');
    });

    // Simulate scrolling the container
    const scrollContainer = container.firstChild as HTMLElement;
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 100 } });

    // Dropdown should still be visible and positioned correctly
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('should handle keyboard navigation', async () => {
    render(
      <InvestmentTable
        investments={mockInvestments}
        goals={mockGoals}
        accounts={mockAccounts}
        {...mockHandlers}
      />
    );

    const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
    
    // Focus and open dropdown with Enter key
    actionButtons[0].focus();
    fireEvent.keyDown(actionButtons[0], { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    // Close with Escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    });
  });

  it('should handle single row table correctly', async () => {
    // Test with only one investment
    const singleInvestment = [mockInvestments[0]];
    
    render(
      <InvestmentTable
        investments={singleInvestment}
        goals={mockGoals}
        accounts={mockAccounts}
        {...mockHandlers}
      />
    );

    const actionButton = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(actionButton);

    await waitFor(() => {
      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
      
      // Verify dropdown is positioned correctly (not hidden behind table)
      const styles = window.getComputedStyle(dropdown);
      expect(styles.position).toBe('fixed');
      expect(styles.zIndex).toBe('9999');
    });
  });

  it('should handle window scroll events', async () => {
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
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Simulate window scroll
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    fireEvent.scroll(window);

    // Dropdown should still be visible and repositioned
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });
});