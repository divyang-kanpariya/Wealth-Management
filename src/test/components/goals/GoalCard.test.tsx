import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GoalCard from '@/components/goals/GoalCard';

// Mock the GoalProgress component
jest.mock('@/components/goals/GoalProgress', () => {
  return function MockGoalProgress({ currentAmount, targetAmount, percentage }) {
    return (
      <div data-testid="goal-progress">
        <div>Current: {currentAmount}</div>
        <div>Target: {targetAmount}</div>
        <div>Progress: {percentage}%</div>
      </div>
    );
  };
});

describe('GoalCard', () => {
  const mockGoal = {
    id: 'goal-1',
    name: 'Retirement',
    targetAmount: 1000000,
    targetDate: new Date('2040-01-01').toISOString(),
    priority: 1,
    description: 'Save for retirement',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    investments: [
      {
        id: 'inv-1',
        name: 'Stock A',
        type: 'STOCK',
        units: 100,
        buyPrice: 50,
        buyDate: new Date().toISOString(),
        goalId: 'goal-1',
        accountId: 'account-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'inv-2',
        name: 'Real Estate',
        type: 'REAL_ESTATE',
        totalValue: 300000,
        buyDate: new Date().toISOString(),
        goalId: 'goal-1',
        accountId: 'account-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const mockHandlers = {
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders goal information correctly', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);

    // Check goal name and priority
    expect(screen.getByText('Retirement')).toBeInTheDocument();
    expect(screen.getByText('Highest')).toBeInTheDocument();
    
    // Check target amount and date
    expect(screen.getByText('$1,000,000')).toBeInTheDocument();
    expect(screen.getByText(/Jan 1, 2040/)).toBeInTheDocument();
    
    // Check time remaining (this will change based on current date)
    expect(screen.getByText(/\d+y/)).toBeInTheDocument();
    
    // Check linked investments count
    expect(screen.getByText('Linked Investments')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Check description
    expect(screen.getByText('Save for retirement')).toBeInTheDocument();
  });

  it('calls the appropriate handlers when buttons are clicked', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);

    fireEvent.click(screen.getByText('View Details'));
    expect(mockHandlers.onViewDetails).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Edit'));
    expect(mockHandlers.onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Delete'));
    expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when isLoading is true', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} isLoading={true} />);

    expect(screen.getByText('View Details')).toBeDisabled();
    expect(screen.getByText('Edit')).toBeDisabled();
    expect(screen.getByText('Delete')).toBeDisabled();
  });

  it('calculates current amount from investments correctly', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);

    // Mock GoalProgress should receive currentAmount = 5000 (from units * buyPrice) + 300000 (totalValue) = 305000
    const progressElement = screen.getByTestId('goal-progress');
    expect(progressElement).toHaveTextContent('Current: 305000');
    expect(progressElement).toHaveTextContent('Target: 1000000');
    expect(progressElement).toHaveTextContent('Progress: 31%'); // 305000/1000000 = 30.5% rounded to 31%
  });

  it('handles goal with no investments', () => {
    const goalWithNoInvestments = {
      ...mockGoal,
      investments: [],
    };
    
    render(<GoalCard goal={goalWithNoInvestments} {...mockHandlers} />);
    
    const progressElement = screen.getByTestId('goal-progress');
    expect(progressElement).toHaveTextContent('Current: 0');
    expect(screen.getByText('0')).toBeInTheDocument(); // Linked investments count
  });

  it('displays different priority labels based on priority value', () => {
    const priorities = [
      { value: 1, label: 'Highest' },
      { value: 2, label: 'High' },
      { value: 3, label: 'Medium' },
      { value: 4, label: 'Low' },
      { value: 5, label: 'Lowest' },
    ];
    
    const { rerender } = render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    
    priorities.forEach(({ value, label }) => {
      rerender(<GoalCard goal={{ ...mockGoal, priority: value }} {...mockHandlers} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});