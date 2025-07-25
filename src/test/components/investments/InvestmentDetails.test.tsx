import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvestmentDetails from '../../../components/investments/InvestmentDetails';
import { InvestmentType, AccountType } from '@/types';

// Mock fetch
global.fetch = vi.fn();

// Mock investment data
const mockInvestment = {
  id: '1',
  type: InvestmentType.STOCK,
  name: 'Reliance Industries',
  symbol: 'RELIANCE',
  units: 10,
  buyPrice: 2000,
  buyDate: new Date('2023-01-01'),
  goalId: '1',
  accountId: '1',
  notes: 'Test investment notes',
  createdAt: new Date(),
  updatedAt: new Date(),
  goal: {
    id: '1',
    name: 'Retirement',
    targetAmount: 1000000,
    targetDate: new Date('2040-01-01'),
    description: 'Retirement planning',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  account: {
    id: '1',
    name: 'Zerodha',
    type: AccountType.BROKER,
    notes: 'Demat account',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe('InvestmentDetails', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock successful fetch responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/investments/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockInvestment }),
        });
      } else if (url.includes('/api/prices/stocks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ price: 2500 }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('renders loading state initially', () => {
    render(<InvestmentDetails investmentId="1" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders investment details after loading', async () => {
    render(<InvestmentDetails investmentId="1" />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Check basic information
    expect(screen.getByText('Reliance Industries')).toBeInTheDocument();
    expect(screen.getByText('Stock')).toBeInTheDocument();
    expect(screen.getByText('RELIANCE')).toBeInTheDocument();
    
    // Check investment information
    expect(screen.getByText('Investment Information')).toBeInTheDocument();
    expect(screen.getByText('Units/Shares')).toBeInTheDocument();
    expect(screen.getByText('Buy Price')).toBeInTheDocument();
    expect(screen.getByText('Purchase Date')).toBeInTheDocument();
    
    // Check notes
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Test investment notes')).toBeInTheDocument();
    
    // Check goal information
    expect(screen.getByText('Linked Goal')).toBeInTheDocument();
    expect(screen.getByText('Retirement')).toBeInTheDocument();
    expect(screen.getByText('Retirement planning')).toBeInTheDocument();
    
    // Check account information
    expect(screen.getByText('Account/Platform')).toBeInTheDocument();
    expect(screen.getByText('Zerodha')).toBeInTheDocument();
    expect(screen.getByText('Demat account')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    
    render(<InvestmentDetails investmentId="1" onEdit={onEdit} />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    
    render(<InvestmentDetails investmentId="1" onDelete={onDelete} />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    
    render(<InvestmentDetails investmentId="1" onBack={onBack} />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('← Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('refreshes price when refresh button is clicked', async () => {
    render(<InvestmentDetails investmentId="1" />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Refresh Price'));
    
    // Verify that fetch was called for prices
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/prices/stocks'));
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as any).mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch data' }),
      });
    });

    render(<InvestmentDetails investmentId="1" />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to load investment details')).toBeInTheDocument();
  });

  it('renders total-value investment correctly', async () => {
    const totalValueInvestment = {
      ...mockInvestment,
      type: InvestmentType.REAL_ESTATE,
      name: 'Property Investment',
      symbol: undefined,
      units: undefined,
      buyPrice: undefined,
      totalValue: 5000000,
    };
    
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/investments/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: totalValueInvestment }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    render(<InvestmentDetails investmentId="1" />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    
    // Check basic information
    expect(screen.getByText('Property Investment')).toBeInTheDocument();
    expect(screen.getByText('Real Estate')).toBeInTheDocument();
    
    // Check total value instead of units/price
    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.queryByText('Units/Shares')).not.toBeInTheDocument();
    expect(screen.queryByText('Buy Price')).not.toBeInTheDocument();
    expect(screen.queryByText('Current Price')).not.toBeInTheDocument();
    
    // No refresh price button for total-value investments
    expect(screen.queryByText('Refresh Price')).not.toBeInTheDocument();
  });
});