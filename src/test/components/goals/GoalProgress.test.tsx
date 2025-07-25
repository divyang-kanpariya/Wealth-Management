import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalProgress from '@/components/goals/GoalProgress';

describe('GoalProgress', () => {
  it('renders with correct progress percentage', () => {
    render(
      <GoalProgress
        currentAmount={5000}
        targetAmount={10000}
        percentage={50}
      />
    );

    // Check for formatted currency values
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
    
    // Check for percentage
    expect(screen.getByText('50%')).toBeInTheDocument();
    
    // Check for labels
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    
    // Check progress bar exists
    const progressBar = document.querySelector('.bg-blue-500');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle('width: 50%');
  });

  it('renders with 0% progress', () => {
    render(
      <GoalProgress
        currentAmount={0}
        targetAmount={10000}
        percentage={0}
      />
    );

    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    
    const progressBar = document.querySelector('.bg-red-500');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle('width: 0%');
  });

  it('renders with 100% progress', () => {
    render(
      <GoalProgress
        currentAmount={10000}
        targetAmount={10000}
        percentage={100}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
    
    const progressBar = document.querySelector('.bg-green-500');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle('width: 100%');
  });

  it('applies custom className', () => {
    render(
      <GoalProgress
        currentAmount={5000}
        targetAmount={10000}
        percentage={50}
        className="custom-class"
      />
    );

    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('renders with different progress colors based on percentage', () => {
    const { rerender } = render(
      <GoalProgress
        currentAmount={1000}
        targetAmount={10000}
        percentage={10}
      />
    );
    
    // 10% should be red
    expect(document.querySelector('.bg-red-500')).toBeInTheDocument();
    
    // 30% should be amber
    rerender(
      <GoalProgress
        currentAmount={3000}
        targetAmount={10000}
        percentage={30}
      />
    );
    expect(document.querySelector('.bg-amber-500')).toBeInTheDocument();
    
    // 60% should be blue
    rerender(
      <GoalProgress
        currentAmount={6000}
        targetAmount={10000}
        percentage={60}
      />
    );
    expect(document.querySelector('.bg-blue-500')).toBeInTheDocument();
    
    // 80% should be emerald
    rerender(
      <GoalProgress
        currentAmount={8000}
        targetAmount={10000}
        percentage={80}
      />
    );
    expect(document.querySelector('.bg-emerald-500')).toBeInTheDocument();
    
    // 100% should be green
    rerender(
      <GoalProgress
        currentAmount={10000}
        targetAmount={10000}
        percentage={100}
      />
    );
    expect(document.querySelector('.bg-green-500')).toBeInTheDocument();
  });
});