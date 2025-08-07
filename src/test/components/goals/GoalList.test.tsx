import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoalList from '@/components/goals/GoalList';

// Mock the components used by GoalList
jest.mock('@/components/goals/GoalTable', () => {
  return function MockGoalTable({ goals, onEdit, onDelete, onViewDetails }) {
    return (
      <div data-testid="goal-table">
        {goals.map((goal: any) => (
          <div key={goal.id} data-testid={`goal-row-${goal.id}`}>
            <div>{goal.name}</div>
            <button onClick={() => onEdit(goal)}>Edit</button>
            <button onClick={() => onDelete(goal)}>Delete</button>
            <button onClick={() => onViewDetails(goal)}>View</button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/goals/GoalForm', () => {
  return function MockGoalForm({ goal, onSubmit, onCancel }) {
    return (
      <div data-testid="goal-form">
        <div>{goal ? `Edit ${goal.name}` : 'Add Goal'}</div>
        <button onClick={() => onSubmit({ name: 'Test Goal', targetAmount: 10000, targetDate: '2030-01-01' })}>
          Submit
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

jest.mock('@/components/ui/Modal', () => {
  return function MockModal({ isOpen, children, title }) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <div>{title}</div>
        {children}
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('GoalList', () => {
  const mockGoals = [
    {
      id: 'goal-1',
      name: 'Retirement',
      targetAmount: 1000000,
      targetDate: '2040-01-01',
      priority: 1,
      description: 'Save for retirement',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      investments: [],
    },
    {
      id: 'goal-2',
      name: 'House',
      targetAmount: 500000,
      targetDate: '2030-01-01',
      priority: 2,
      description: 'Buy a house',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      investments: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockGoals,
    });
  });

  it('renders loading state initially', () => {
    render(<GoalList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders goals after loading', async () => {
    render(<GoalList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Financial Goals')).toBeInTheDocument();
    expect(screen.getByText('2 goals')).toBeInTheDocument();
    expect(screen.getByTestId('goal-row-goal-1')).toBeInTheDocument();
    expect(screen.getByTestId('goal-row-goal-2')).toBeInTheDocument();
  });

  it('renders empty state when no goals', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    
    render(<GoalList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No goals yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by adding your first financial goal.')).toBeInTheDocument();
  });

  it('opens add goal modal when add button is clicked', async () => {
    render(<GoalList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Goal'));
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Add New Goal')).toBeInTheDocument();
    expect(screen.getByTestId('goal-form')).toBeInTheDocument();
  });

  it('opens edit goal modal when edit button is clicked', async () => {
    render(<GoalList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Find the first goal row and click its edit button
    const firstGoalRow = screen.getByTestId('goal-row-goal-1');
    fireEvent.click(screen.getByText('Edit', { container: firstGoalRow }));
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Goal')).toBeInTheDocument();
    expect(screen.getByText('Edit Retirement')).toBeInTheDocument();
  });

  it('opens delete confirmation modal when delete button is clicked', async () => {
    render(<GoalList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Find the first goal row and click its delete button
    const firstGoalRow = screen.getByTestId('goal-row-goal-1');
    fireEvent.click(screen.getByText('Delete', { container: firstGoalRow }));
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Delete Goal')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
  });

  it('submits goal form correctly', async () => {
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'new-goal', ...JSON.parse(options.body) }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockGoals,
      });
    });
    
    render(<GoalList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Open add goal modal
    fireEvent.click(screen.getByText('Add Goal'));
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit'));
    
    // Check that fetch was called with the right arguments
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/goals', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.any(String),
      }));
    });
    
    // Check that the modal is closed
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('handles fetch error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    
    render(<GoalList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to load goals')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    
    // Click retry button
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockGoals,
    });
    
    fireEvent.click(screen.getByText('Try Again'));
    
    await waitFor(() => {
      expect(screen.queryByText('Failed to load goals')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Financial Goals')).toBeInTheDocument();
  });
});