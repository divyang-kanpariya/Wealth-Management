import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoalForm from '../../../components/goals/GoalForm';

describe('GoalForm', () => {
  const mockGoal = {
    id: 'goal-1',
    name: 'Test Goal',
    targetAmount: 10000,
    targetDate: new Date('2025-12-31'),
    priority: 2,
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
    investments: [],
  };

  const mockSubmit = vi.fn();
  const mockCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with empty fields for new goal', () => {
    render(
      <GoalForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    expect(screen.getByLabelText(/Goal Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Target Amount/i)).toHaveValue('');
    expect(screen.getByLabelText(/Target Date/i)).toHaveValue('');
    expect(screen.getByLabelText(/Priority/i)).toHaveValue('1');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('');
    
    expect(screen.getByRole('button', { name: /Create Goal/i })).toBeInTheDocument();
  });

  it('renders the form with populated fields for existing goal', () => {
    render(
      <GoalForm
        goal={mockGoal}
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    expect(screen.getByLabelText(/Goal Name/i)).toHaveValue('Test Goal');
    expect(screen.getByLabelText(/Target Amount/i)).toHaveValue('10000');
    expect(screen.getByLabelText(/Target Date/i)).toHaveValue('2025-12-31');
    expect(screen.getByLabelText(/Priority/i)).toHaveValue('2');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Test description');
    
    expect(screen.getByRole('button', { name: /Update Goal/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <GoalForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('validates required fields', async () => {
    render(
      <GoalForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Submit the form without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /Create Goal/i }));

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Goal name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Target amount must be a positive number/i)).toBeInTheDocument();
      expect(screen.getByText(/Target date is required/i)).toBeInTheDocument();
    });

    // Ensure onSubmit was not called
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits the form with valid data', async () => {
    render(
      <GoalForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Goal Name/i), { target: { value: 'New Goal' } });
    fireEvent.change(screen.getByLabelText(/Target Amount/i), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText(/Target Date/i), { target: { value: '2026-06-30' } });
    fireEvent.change(screen.getByLabelText(/Priority/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'New description' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Create Goal/i }));

    // Check that onSubmit was called with the correct data
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'New Goal',
        targetAmount: 5000,
        targetDate: '2026-06-30',
        priority: 3,
        description: 'New description',
      });
    });
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <GoalForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText(/Creating.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
  });
});