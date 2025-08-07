import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvestmentForm from '@/components/investments/InvestmentForm';
import { Goal, Account } from '@/types';
import { InvestmentType } from '@prisma/client';

// Mock fetch globally
global.fetch = vi.fn();

const mockGoals: Goal[] = [
  {
    id: '1',
    name: 'Retirement',
    targetAmount: 1000000,
    targetDate: new Date('2030-12-31'),
    priority: 1,
    description: 'Retirement savings',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'Zerodha',
    type: 'BROKER',
    notes: 'Primary trading account',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockOnSubmit = vi.fn();
const mockOnCancel = vi.fn();

describe('InvestmentForm with Inline Goal Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('should render enhanced select for goals with create option', () => {
    render(
      <InvestmentForm
        goals={mockGoals}
        accounts={mockAccounts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check if the goal field is rendered
    expect(screen.getByText('Financial Goal (Optional)')).toBeInTheDocument();
  });

  it('should open inline goal creation modal when create option is clicked', async () => {
    render(
      <InvestmentForm
        goals={mockGoals}
        accounts={mockAccounts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Find and click the goal dropdown
    const goalDropdown = screen.getByText('Financial Goal (Optional)').closest('div')?.querySelector('[role="button"]');
    expect(goalDropdown).toBeInTheDocument();
    
    if (goalDropdown) {
      fireEvent.click(goalDropdown);
    }

    // Wait for dropdown to open and look for create option
    await waitFor(() => {
      const createOption = screen.queryByText('Create new goal');
      if (createOption) {
        fireEvent.click(createOption);
      }
    });

    // Check if modal opens
    await waitFor(() => {
      expect(screen.queryByText('Create New Goal')).toBeInTheDocument();
    });
  });

  it('should create new goal and add it to dropdown options', async () => {
    const newGoal = {
      id: '2',
      name: 'House Down Payment',
      targetAmount: 500000,
      targetDate: new Date('2025-12-31'),
      priority: 1,
      description: 'Saving for house',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newGoal }),
    });

    render(
      <InvestmentForm
        goals={mockGoals}
        accounts={mockAccounts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Open goal dropdown
    const goalDropdown = screen.getByText('Financial Goal (Optional)').closest('div')?.querySelector('[role="button"]');
    if (goalDropdown) {
      fireEvent.click(goalDropdown);
    }

    // Click create new goal option
    await waitFor(() => {
      const createOption = screen.queryByText('Create new goal');
      if (createOption) {
        fireEvent.click(createOption);
      }
    });

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Create New Goal')).toBeInTheDocument();
    });

    // Fill in the goal form
    const nameInput = screen.getByLabelText('Goal Name');
    const amountInput = screen.getByLabelText('Target Amount (₹)');
    const dateInput = screen.getByLabelText('Target Date');

    fireEvent.change(nameInput, { target: { value: 'House Down Payment' } });
    fireEvent.change(amountInput, { target: { value: '500000' } });
    fireEvent.change(dateInput, { target: { value: '2025-12-31' } });

    // Submit the goal form
    const createButton = screen.getByText('Create Goal');
    fireEvent.click(createButton);

    // Wait for API call and modal to close
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'House Down Payment',
          targetAmount: 500000,
          targetDate: '2025-12-31',
          priority: 1,
          description: undefined,
        }),
      });
    });

    // Modal should close after successful creation
    await waitFor(() => {
      expect(screen.queryByText('Create New Goal')).not.toBeInTheDocument();
    });
  });

  it('should handle goal creation errors gracefully', async () => {
    // Mock API error response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create goal' }),
    });

    render(
      <InvestmentForm
        goals={mockGoals}
        accounts={mockAccounts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Open goal dropdown and create new goal
    const goalDropdown = screen.getByText('Financial Goal (Optional)').closest('div')?.querySelector('[role="button"]');
    if (goalDropdown) {
      fireEvent.click(goalDropdown);
    }

    await waitFor(() => {
      const createOption = screen.queryByText('Create new goal');
      if (createOption) {
        fireEvent.click(createOption);
      }
    });

    // Fill and submit form
    await waitFor(() => {
      expect(screen.getByText('Create New Goal')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Goal Name');
    const amountInput = screen.getByLabelText('Target Amount (₹)');
    const dateInput = screen.getByLabelText('Target Date');

    fireEvent.change(nameInput, { target: { value: 'Test Goal' } });
    fireEvent.change(amountInput, { target: { value: '100000' } });
    fireEvent.change(dateInput, { target: { value: '2025-12-31' } });

    const createButton = screen.getByText('Create Goal');
    fireEvent.click(createButton);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to create goal')).toBeInTheDocument();
    });

    // Modal should remain open on error
    expect(screen.getByText('Create New Goal')).toBeInTheDocument();
  });

  it('should validate goal form before submission', async () => {
    render(
      <InvestmentForm
        goals={mockGoals}
        accounts={mockAccounts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Open goal creation modal
    const goalDropdown = screen.getByText('Financial Goal (Optional)').closest('div')?.querySelector('[role="button"]');
    if (goalDropdown) {
      fireEvent.click(goalDropdown);
    }

    await waitFor(() => {
      const createOption = screen.queryByText('Create new goal');
      if (createOption) {
        fireEvent.click(createOption);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Create New Goal')).toBeInTheDocument();
    });

    // Try to submit without filling required fields
    const createButton = screen.getByText('Create Goal');
    fireEvent.click(createButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Goal name is required')).toBeInTheDocument();
    });

    // API should not be called
    expect(global.fetch).not.toHaveBeenCalled();
  });
});