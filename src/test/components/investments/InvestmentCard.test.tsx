import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InvestmentCard from '../../../components/investments/InvestmentCard';
import { InvestmentType, AccountType } from '@/types';

describe('InvestmentCard', () => {
  const mockInvestmentWithValue = {
    investment: {
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
    currentPrice: 2500,
    currentValue: 25000,
    gainLoss: 5000,
    gainLossPercentage: 25,
  };

  const mockTotalValueInvestment = {
    investment: {
      id: '2',
      type: InvestmentType.REAL_ESTATE,
      name: 'Property Investment',
      totalValue: 5000000,
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
        name: 'HDFC Bank',
        type: AccountType.BANK,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    currentValue: 5000000,
    gainLoss: 0,
    gainLossPercentage: 0,
  };

  it('renders unit-based investment correctly', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    render(
      <InvestmentCard 
        investmentWithValue={mockInvestmentWithValue} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );
    
    // Check basic information
    expect(screen.getByText('Reliance Industries')).toBeInTheDocument();
    expect(screen.getByText('Stock')).toBeInTheDocument();
    expect(screen.getByText('RELIANCE')).toBeInTheDocument();
    
    // Check units and prices
    expect(screen.getByText('Units')).toBeInTheDocument();
    expect(screen.getByText('Buy Price')).toBeInTheDocument();
    expect(screen.getByText('Current Price')).toBeInTheDocument();
    
    // Check gain/loss information
    expect(screen.getByText('Gain/Loss')).toBeInTheDocument();
    expect(screen.getByText('+25.00%')).toBeInTheDocument();
    
    // Check goal and account
    expect(screen.getByText('Retirement')).toBeInTheDocument();
    expect(screen.getByText('Zerodha')).toBeInTheDocument();
  });

  it('renders total-value investment correctly', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    render(
      <InvestmentCard 
        investmentWithValue={mockTotalValueInvestment} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );
    
    // Check basic information
    expect(screen.getByText('Property Investment')).toBeInTheDocument();
    expect(screen.getByText('Real Estate')).toBeInTheDocument();
    
    // Check total value instead of units/price
    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.queryByText('Units')).not.toBeInTheDocument();
    expect(screen.queryByText('Buy Price')).not.toBeInTheDocument();
    expect(screen.queryByText('Current Price')).not.toBeInTheDocument();
    
    // Check goal and account
    expect(screen.getByText('Retirement')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    render(
      <InvestmentCard 
        investmentWithValue={mockInvestmentWithValue} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );
    
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockInvestmentWithValue.investment);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    render(
      <InvestmentCard 
        investmentWithValue={mockInvestmentWithValue} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );
    
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(mockInvestmentWithValue.investment);
  });

  it('disables buttons when isLoading is true', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    render(
      <InvestmentCard 
        investmentWithValue={mockInvestmentWithValue} 
        onEdit={onEdit} 
        onDelete={onDelete}
        isLoading={true}
      />
    );
    
    const editButton = screen.getByText('Edit');
    const deleteButton = screen.getByText('Delete');
    
    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    
    fireEvent.click(editButton);
    fireEvent.click(deleteButton);
    
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('shows price update status for unit-based investments', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    render(
      <InvestmentCard 
        investmentWithValue={mockInvestmentWithValue} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );
    
    expect(screen.getByText('Live price')).toBeInTheDocument();
  });

  it('shows "Using buy price" when no current price is available', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const investmentWithoutPrice = {
      ...mockInvestmentWithValue,
      currentPrice: undefined,
    };
    
    render(
      <InvestmentCard 
        investmentWithValue={investmentWithoutPrice} 
        onEdit={onEdit} 
        onDelete={onDelete} 
      />
    );
    
    expect(screen.getByText('Using buy price')).toBeInTheDocument();
  });
});