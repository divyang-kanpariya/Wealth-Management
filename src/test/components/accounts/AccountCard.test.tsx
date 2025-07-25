import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import AccountCard from '@/components/accounts/AccountCard';
import { Account, AccountType } from '@/types';

// Mock the UI components
vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, disabled, size, variant, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-size={size}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  )
}));

describe('AccountCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnViewDetails = vi.fn();

  const mockAccount: Account = {
    id: '1',
    name: 'Test Broker Account',
    type: 'BROKER' as AccountType,
    notes: 'This is a test broker account',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders account information correctly', () => {
    render(
      <AccountCard
        account={mockAccount}
        totalValue={150000}
        investmentCount={5}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Test Broker Account')).toBeInTheDocument();
    expect(screen.getByText('Broker')).toBeInTheDocument();
    expect(screen.getByText('₹1,50,000')).toBeInTheDocument();
    expect(screen.getByText('5 investments')).toBeInTheDocument();
    expect(screen.getByText('This is a test broker account')).toBeInTheDocument();
  });

  it('handles singular investment count correctly', () => {
    render(
      <AccountCard
        account={mockAccount}
        totalValue={50000}
        investmentCount={1}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('1 investment')).toBeInTheDocument();
  });

  it('displays different account types with correct styling', () => {
    const dematAccount: Account = {
      ...mockAccount,
      type: 'DEMAT' as AccountType,
    };

    render(
      <AccountCard
        account={dematAccount}
        totalValue={100000}
        investmentCount={3}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Demat')).toBeInTheDocument();
  });

  it('handles bank account type', () => {
    const bankAccount: Account = {
      ...mockAccount,
      type: 'BANK' as AccountType,
    };

    render(
      <AccountCard
        account={bankAccount}
        totalValue={75000}
        investmentCount={2}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Bank')).toBeInTheDocument();
  });

  it('handles other account type', () => {
    const otherAccount: Account = {
      ...mockAccount,
      type: 'OTHER' as AccountType,
    };

    render(
      <AccountCard
        account={otherAccount}
        totalValue={25000}
        investmentCount={1}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <AccountCard
        account={mockAccount}
        totalValue={100000}
        investmentCount={3}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalled();
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <AccountCard
        account={mockAccount}
        totalValue={100000}
        investmentCount={3}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('calls onViewDetails when view details button is clicked', () => {
    render(
      <AccountCard
        account={mockAccount}
        totalValue={100000}
        investmentCount={3}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(viewDetailsButton);

    expect(mockOnViewDetails).toHaveBeenCalled();
  });

  it('disables buttons when isLoading is true', () => {
    render(
      <AccountCard
        account={mockAccount}
        totalValue={100000}
        investmentCount={3}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
        isLoading={true}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    const viewDetailsButton = screen.getByRole('button', { name: /view details/i });

    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(viewDetailsButton).toBeDisabled();
  });

  it('does not render notes section when notes are empty', () => {
    const accountWithoutNotes: Account = {
      ...mockAccount,
      notes: undefined,
    };

    render(
      <AccountCard
        account={accountWithoutNotes}
        totalValue={100000}
        investmentCount={3}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.queryByText('This is a test broker account')).not.toBeInTheDocument();
  });

  it('formats total value correctly with Indian locale', () => {
    render(
      <AccountCard
        account={mockAccount}
        totalValue={1234567.89}
        investmentCount={10}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('₹12,34,567.89')).toBeInTheDocument();
  });

  it('displays created date correctly', () => {
    render(
      <AccountCard
        account={mockAccount}
        totalValue={100000}
        investmentCount={3}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText(/created 1\/1\/2024/i)).toBeInTheDocument();
  });
});