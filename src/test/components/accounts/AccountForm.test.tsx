import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AccountForm from '@/components/accounts/AccountForm';
import { Account, AccountType } from '@/types';
import { beforeEach } from 'node:test';

// Mock the UI components
vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, disabled, type, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/Input', () => ({
  default: ({ label, name, value, onChange, error, required, placeholder }: any) => (
    <div>
      <label htmlFor={name}>{label}{required && ' *'}</label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        data-error={error}
      />
      {error && <span data-testid="error">{error}</span>}
    </div>
  )
}));

vi.mock('@/components/ui/Select', () => ({
  default: ({ label, name, value, onChange, options, required }: any) => (
    <div>
      <label htmlFor={name}>{label}{required && ' *'}</label>
      <select id={name} name={name} value={value} onChange={onChange}>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  default: ({ size, className }: any) => (
    <div data-testid="loading-spinner" data-size={size} className={className}>
      Loading...
    </div>
  )
}));

describe('AccountForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const mockAccount: Account = {
    id: '1',
    name: 'Test Account',
    type: 'BROKER' as AccountType,
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(
      <AccountForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('populates form with account data when editing', () => {
    render(
      <AccountForm
        account={mockAccount}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Test Account')).toBeInTheDocument();
    // Check that the select has the correct value selected
    const typeSelect = screen.getByLabelText(/account type/i) as HTMLSelectElement;
    expect(typeSelect.value).toBe('BROKER');
    expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update account/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <AccountForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Account name is required');
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    render(
      <AccountForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText(/account name/i);
    const typeSelect = screen.getByLabelText(/account type/i);
    const notesTextarea = screen.getByLabelText(/notes/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'New Account' } });
    fireEvent.change(typeSelect, { target: { value: 'DEMAT' } });
    fireEvent.change(notesTextarea, { target: { value: 'New notes' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Account',
        type: 'DEMAT',
        notes: 'New notes',
      });
    });
  });

  it('clears validation errors when user types', async () => {
    render(
      <AccountForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/account name/i);
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    await waitFor(() => {
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <AccountForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <AccountForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating.../i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('shows correct button text for editing', () => {
    render(
      <AccountForm
        account={mockAccount}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByRole('button', { name: /updating.../i })).toBeInTheDocument();
  });
});