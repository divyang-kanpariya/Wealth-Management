import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvestmentList from '../../../components/investments/InvestmentList';
import { Investment, InvestmentType, AccountType } from '@/types';

// Mock fetch
global.fetch = vi.fn();

// Mock data
const mockInvestments = [
  {
    id: '1',
    type: InvestmentType.STOCK,
    name: 'Reliance Industries',
    symbol: 'RELIANCE',
    units: 10,
    buyPrice: 2000,
    buyDate: new Date('2023-01-01'),
    goalId: '1',
    accountId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    goal: {
      id: '1',
      name: 'Retirement',
      targetAmount: 1000000,
      targetDate: new Date('2040-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    account: {
      id: '1',
      name: 'Zerodha',
      type: AccountType.BROKER,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: '2',
    type: InvestmentType.MUTUAL_FUND,
    name: 'HDFC Top 100 Fund',
    symbol: '100123',
    units: 50,
    buyPrice: 300,
    buyDate: new Date('2023-02-01'),
    goalId: '2',
    accountId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    goal: {
      id: '2',
      name: 'House',
      targetAmount: 5000000,
      targetDate: new Date('2030-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    account: {
      id: '1',
      name: 'Zerodha',
      type: AccountType.BROKER,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
];

const mockGoals = [
  {
    id: '1',
    name: 'Retirement',
    targetAmount: 1000000,
    targetDate: new Date('2040-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'House',
    targetAmount: 5000000,
    targetDate: new Date('2030-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAccounts = [
  {
    id: '1',
    name: 'Zerodha',
    type: AccountType.BROKER,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockPrices = [
  { symbol: 'RELIANCE', price: 2500, source: 'NSE', cached: false },
  { symbol: '100123', price: 350, source: 'AMFI', cached: false },
];

describe('InvestmentList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock successful fetch responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/investments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockInvestments }),
        });
      } else if (url.includes('/api/goals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockGoals }),
        });
      } else if (url.includes('/api/accounts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockAccounts }),
        });
      } else if (url.includes('/api/prices/stocks') || url.includes('/api/prices/mutual-funds')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPrices }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('renders loading state initially', () => {
    render(<InvestmentList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders investments after loading', async () => {
    render(<InvestmentList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Reliance Industries')).toBeInTheDocument();
    expect(screen.getByText('HDFC Top 100 Fund')).toBeInTheDocument();
  });

  it('shows empty state when no investments', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/investments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      // Keep other mocks the same
      return global.fetch(url);
    });

    render(<InvestmentList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No investments yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by adding your first investment.')).toBeInTheDocument();
  });

  it('opens add investment modal when add button is clicked', async () => {
    render(<InvestmentList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Add Investment'));
    
    expect(screen.getByText('Add New Investment')).toBeInTheDocument();
  });

  it('opens edit investment modal when edit button is clicked', async () => {
    render(<InvestmentList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Find the first edit button and click it
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    expect(screen.getByText('Edit Investment')).toBeInTheDocument();
  });

  it('opens delete confirmation when delete button is clicked', async () => {
    render(<InvestmentList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Find the first delete button and click it
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    expect(screen.getByText('Delete Investment')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
  });

  it('refreshes prices when refresh button is clicked', async () => {
    render(<InvestmentList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Refresh Prices'));
    
    // Verify that fetch was called for prices
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/prices/'));
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as any).mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch data' }),
      });
    });

    render(<InvestmentList />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to load investments')).toBeInTheDocument();
  });
});