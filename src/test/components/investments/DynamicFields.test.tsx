import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DynamicFields from '../../../components/investments/DynamicFields';
import { InvestmentType } from '@prisma/client';

const mockOnChange = vi.fn();

describe('DynamicFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDynamicFields = (
    investmentType: InvestmentType,
    formData = {},
    errors = {}
  ) => {
    return render(
      <DynamicFields
        investmentType={investmentType}
        formData={formData}
        errors={errors}
        onChange={mockOnChange}
      />
    );
  };

  describe('Stock Investment Fields', () => {
    it('renders stock-specific fields', () => {
      renderDynamicFields('STOCK');
      
      expect(screen.getByLabelText(/stock symbol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of shares/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price per share/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\., reliance, tcs/i)).toBeInTheDocument();
    });

    it('shows helper text for stock symbol', () => {
      renderDynamicFields('STOCK');
      
      expect(screen.getByText(/nse stock symbol for price fetching/i)).toBeInTheDocument();
    });

    it('displays calculated total for stock', () => {
      renderDynamicFields('STOCK', { units: 10, buyPrice: 2500 });
      
      expect(screen.getByText(/total investment: ₹25,000/i)).toBeInTheDocument();
    });

    it('calls onChange when stock fields are modified', () => {
      renderDynamicFields('STOCK');
      
      const symbolInput = screen.getByLabelText(/stock symbol/i);
      fireEvent.change(symbolInput, { target: { value: 'RELIANCE' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('symbol', 'RELIANCE');
    });
  });

  describe('Mutual Fund Investment Fields', () => {
    it('renders mutual fund-specific fields', () => {
      renderDynamicFields('MUTUAL_FUND');
      
      expect(screen.getByLabelText(/scheme code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of units/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nav \(₹\)/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\., 120503/i)).toBeInTheDocument();
    });

    it('shows helper text for mutual fund scheme code', () => {
      renderDynamicFields('MUTUAL_FUND');
      
      expect(screen.getByText(/amfi scheme code for nav fetching/i)).toBeInTheDocument();
    });

    it('displays calculated total for mutual fund', () => {
      renderDynamicFields('MUTUAL_FUND', { units: 100, buyPrice: 50.25 });
      
      expect(screen.getByText(/total investment: ₹5,025/i)).toBeInTheDocument();
    });
  });

  describe('Cryptocurrency Investment Fields', () => {
    it('renders crypto-specific fields', () => {
      renderDynamicFields('CRYPTO');
      
      expect(screen.getByLabelText(/cryptocurrency symbol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price per unit \(₹\)/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\., btc, eth/i)).toBeInTheDocument();
    });

    it('shows helper text for crypto symbol', () => {
      renderDynamicFields('CRYPTO');
      
      expect(screen.getByText(/cryptocurrency symbol/i)).toBeInTheDocument();
    });
  });

  describe('Real Estate Investment Fields', () => {
    it('renders real estate-specific fields', () => {
      renderDynamicFields('REAL_ESTATE');
      
      expect(screen.getByLabelText(/property value \(₹\)/i)).toBeInTheDocument();
      expect(screen.getByText(/current market value or purchase price/i)).toBeInTheDocument();
    });

    it('does not render unit-based fields for real estate', () => {
      renderDynamicFields('REAL_ESTATE');
      
      expect(screen.queryByLabelText(/symbol/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/units/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/price per/i)).not.toBeInTheDocument();
    });

    it('calls onChange when total value is modified', () => {
      renderDynamicFields('REAL_ESTATE');
      
      const totalValueInput = screen.getByLabelText(/property value/i);
      fireEvent.change(totalValueInput, { target: { value: '5000000' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('totalValue', 5000000);
    });
  });

  describe('Gold Investment Fields', () => {
    it('renders gold-specific fields', () => {
      renderDynamicFields('GOLD');
      
      expect(screen.getByLabelText(/gold value \(₹\)/i)).toBeInTheDocument();
      expect(screen.getByText(/current value based on weight and purity/i)).toBeInTheDocument();
    });
  });

  describe('Jewelry Investment Fields', () => {
    it('renders jewelry-specific fields', () => {
      renderDynamicFields('JEWELRY');
      
      expect(screen.getByLabelText(/jewelry value \(₹\)/i)).toBeInTheDocument();
      expect(screen.getByText(/appraised or purchase value/i)).toBeInTheDocument();
    });
  });

  describe('Fixed Deposit Investment Fields', () => {
    it('renders FD-specific fields', () => {
      renderDynamicFields('FD');
      
      expect(screen.getByLabelText(/fixed deposit amount \(₹\)/i)).toBeInTheDocument();
      expect(screen.getByText(/principal amount deposited/i)).toBeInTheDocument();
    });
  });

  describe('Other Investment Fields', () => {
    it('renders generic total value field for OTHER type', () => {
      renderDynamicFields('OTHER');
      
      expect(screen.getByLabelText(/total value \(₹\)/i)).toBeInTheDocument();
      expect(screen.getByText(/enter the total investment amount/i)).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('displays validation errors for unit-based fields', () => {
      const errors = {
        symbol: 'Symbol is required',
        units: 'Units must be positive',
        buyPrice: 'Price is required',
      };
      
      renderDynamicFields('STOCK', {}, errors);
      
      expect(screen.getByText('Symbol is required')).toBeInTheDocument();
      expect(screen.getByText('Units must be positive')).toBeInTheDocument();
      expect(screen.getByText('Price is required')).toBeInTheDocument();
    });

    it('displays validation errors for total value fields', () => {
      const errors = {
        totalValue: 'Total value is required',
      };
      
      renderDynamicFields('REAL_ESTATE', {}, errors);
      
      expect(screen.getByText('Total value is required')).toBeInTheDocument();
    });
  });

  describe('Form Data Population', () => {
    it('populates unit-based fields with existing data', () => {
      const formData = {
        symbol: 'RELIANCE',
        units: 10,
        buyPrice: 2500,
      };
      
      renderDynamicFields('STOCK', formData);
      
      expect(screen.getByDisplayValue('RELIANCE')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2500')).toBeInTheDocument();
    });

    it('populates total value field with existing data', () => {
      const formData = {
        totalValue: 5000000,
      };
      
      renderDynamicFields('REAL_ESTATE', formData);
      
      expect(screen.getByDisplayValue('5000000')).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('handles numeric input for units field', () => {
      renderDynamicFields('STOCK');
      
      const unitsInput = screen.getByLabelText(/number of shares/i);
      fireEvent.change(unitsInput, { target: { value: '10.5' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('units', 10.5);
    });

    it('handles numeric input for price field', () => {
      renderDynamicFields('STOCK');
      
      const priceInput = screen.getByLabelText(/price per share/i);
      fireEvent.change(priceInput, { target: { value: '2500.75' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('buyPrice', 2500.75);
    });

    it('handles numeric input for total value field', () => {
      renderDynamicFields('REAL_ESTATE');
      
      const totalValueInput = screen.getByLabelText(/property value/i);
      fireEvent.change(totalValueInput, { target: { value: '5000000.50' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('totalValue', 5000000.50);
    });

    it('handles invalid numeric input gracefully', () => {
      renderDynamicFields('STOCK');
      
      const unitsInput = screen.getByLabelText(/number of shares/i);
      fireEvent.change(unitsInput, { target: { value: 'invalid' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('units', undefined);
    });
  });

  describe('Calculated Total Display', () => {
    it('formats large numbers with proper locale formatting', () => {
      renderDynamicFields('STOCK', { units: 1000, buyPrice: 2500.75 });
      
      expect(screen.getByText(/total investment: ₹25,00,750/i)).toBeInTheDocument();
    });

    it('handles decimal calculations correctly', () => {
      renderDynamicFields('MUTUAL_FUND', { units: 123.456, buyPrice: 78.90 });
      
      expect(screen.getByText(/total investment: ₹9,740.68/i)).toBeInTheDocument();
    });

    it('does not show calculated total for non-unit investments', () => {
      renderDynamicFields('REAL_ESTATE', { totalValue: 5000000 });
      
      expect(screen.queryByText(/total investment:/i)).not.toBeInTheDocument();
    });

    it('does not show calculated total when units or price is missing', () => {
      renderDynamicFields('STOCK', { units: 10 }); // missing buyPrice
      
      expect(screen.queryByText(/total investment:/i)).not.toBeInTheDocument();
    });
  });
});