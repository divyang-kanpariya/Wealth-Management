import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AccountList from '@/components/accounts/AccountList';
import { Account, AccountType, Investment } from '@/types';

// Mock fetch
global.fetch = vi.fn();

// Mock the child components
vi.mock('@/components/accounts/AccountCard', () => ({
  default: ({ account, totalValue, investmentCount, onEdit, onDelete, onViewDetails }: any) => (
    <div data-testid="account-card">
      <h3>{account.name}</h3>
      <p>₹{totalValue.toLocaleString('en-IN')}</p>
      <p>{investmentCount} investments</p>
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDelete}>Delete</button>
      <button onClick={onViewDetails}>View Details</button>
    </div>
  )
}));

vi.mock('@/components/accounts/AccountForm', () => ({
  default: ({ account, onSubmit, onCancel }: any) => (
    <div data-testid="account-form">
      <button onClick={() => onSubmit({ name: 'Test Account', type: 'BROKER' })}>
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('@/components/ui/Modal', () => ({
  default: ({ isOpen, children, title, onClose }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>
}));

vi.mock('@/components/ui/ErrorState', () => ({
  default: ({ title, message, onRetry }: any) => (
    <div data-testid="error-state">
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  )
}));

vi.mock('@/components/ui/Alert', () => ({
  default: ({ type, message, onClose }: any) => (
    <div data-testid="alert" data-type={type}>
      {message}
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

describe('AccountList', () => {
  const mockAccounts: Account[] = [
    {
      id: '1',
      name: 'Zerodha',
      type: 'BROKER' as AccountType,
      notes: 'Primary trading account',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      investments: [
        {
          id: 'inv1',
          name: 'RELIANCE',
          type: 'STOCK',
          units: 10,
          buyPrice: 2500,
          buyDate: new Date('2024-01-01'),
          accountId: '1',
        } as Investment,
        {
          id: 'inv2',
          name: 'Gold ETF',
          type: 'GOLD',
          totalValue: 50000,
          buyDate: new Date('2024-01-01'),
          accountId: '1',
        } as Investment,
      ],
    },
    {
      id: '2',
      name: 'HDFC Bank',
      type: 'BANK' as AccountType,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      investments: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAccounts),
    });
  });

  it('renders loading state initially', () => {
    render(<AccountList />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders accounts after loading', async () => {
    render(<AccountList />);

    await waitFor(() => {
      expect(screen.getByText('Zerodha')).toBeInTheDocument();
      expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    });

    expect(screen.getByText('Investment Accounts')).toBeInTheDocument();
    expect(screen.getByText(/2 accounts • 2 investments • ₹75,000 total/)).toBeInTheDocument();
  });

  it('calculates account totals correctly', async () => {
    render(<AccountList />);

    await waitFor(() => {
      expect(screen.getByText('₹75,000')).toBeInTheDocument(); // 10 * 2500 + 50000
      expect(screen.getByText('2 investments')).toBeInTheDocument();
    });
  });

  it('handles fetch error', async () => {
    (fetch as any).mockRejectedValue(new Error('Network error'));

    render(<AccountList />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText('Failed to load accounts')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows empty state when no accounts', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<AccountList />);

    await waitFor(() => {
      expect(screen.getByText('No accounts yet')).toBeInTheDocument();
      expect(screen.getByText('Get started by adding your first investment account or platform.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first account/i })).toBeInTheDocument();
    });
  });

  it('opens add account modal when add button is clicked', async () => {
    render(<AccountList />);

    await waitFor(() => {
      expect(screen.getByText('Zerodha')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add account/i });
    fireEvent.click(addButton);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Add New Account')).toBeInTheDocument();
  });

  it('opens edit modal when edit button is clicked', async () => {
    render(<AccountList />);

    await waitFor(() => {
      expect(screen.getByText('Zerodha')).toBeInTheDocument();
    });

    const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
    fireEvent.click(editButton);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Account')).toBeInTheDocument();
  });

  it('opens delete modal when delete button is clicked', async () => {
    render(<AccountList />);

    await waitFor(() => {
      expect(screen.getByText('Zerodha')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    fireEvent.click(deleteButton);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
  });

  it('submits new account successfully', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccounts),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '3', name: 'Test Account', type: 'BROKER' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([...mockAccounts, { id: '3', name: 'Test Account', type: 'BROKER' }]),
      });

    render(<AccountList />);

    await waitFor(() => {
      expect(screen.getByText('Zerodha')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add account/i });
    fireEvent.click(addButton);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Account', type: 'BROKER' }),
      });
    });
  });

  it('handles account deletion with linked investments', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccounts),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot delete account with linked investments' }),
      });

    render(<AccountList />);

    await waitFor(() => {
      expect(screen.getByText('Zerodha')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    fireEvent.click(deleteButton);

    expect(screen.getByText('Cannot delete account')).toBeInTheDocument();
    expect(screen.getByText(/This account has 2 linked investments/)).toBeInTheDocument();

    const confirmDeleteButtons = screen.getAllByRole('button', { name: /delete/i });
    const confirmDeleteButton = confirmDeleteButtons[confirmDeleteButtons.length - 1]; // Get the last delete button (in modal)
    expect(confirmDeleteButton).toBeDisabled();
  });






});