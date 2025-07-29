import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import InvestmentForm from '../../../components/investments/InvestmentForm';
import { InvestmentType, AccountType } from '@prisma/client';
import { Goal, Account } from '../../../types';

// Mock data
const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    name: 'Retirement Fund',
    targetAmount: 1000000,
    targetDate: new Date('2030-12-31'),
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'goal-2',
    name: 'House Purchase',
    targetAmount: 5000000,
    targetDate: new Date('2025-06-30'),
    priority: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAccounts: Account[] = [
  {
    id: 'account-1',
    name: 'Zerodha',
    type: AccountType.BROKER,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'account-2',
    name: 'HDFC Bank',
    type: AccountType.BANK,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockOnSubmit = vi.fn();
const mockOnCancel = vi.fn();

describe('InvestmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (props = {}) => {
    return render(
      <InvestmentForm
        goals={mockGoals}
        accounts={mockAccounts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  };

  describe('Form Rendering', () => {
    it('renders all basic form fields', () => {
      renderForm();
      
      expect(screen.getByLabelText(/investment type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/investment name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/purchase date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/financial goal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/account\/platform/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add investment/i })).toBeInTheDocument();
    });

    it('renders cancel button when onCancel is provided', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('does not render cancel button when onCancel is not provided', () => {
      renderForm({ onCancel: undefined });
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('Dynamic Field Rendering', () => {
    it('shows unit-based fields for STOCK type', async () => {
      renderForm();
      
      const typeSelect = screen.getByLabelText(/investment type/i);
      fireEvent.change(typeSelect, { target: { value: 'STOCK' } });
      
      await waitFor(() => {
        expect(screen.getByLabelText(/stock symbol/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/number of shares/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/price per share/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/total value/i)).not.toBeInTheDocument();
      });
    });

    it('shows unit-based fields for MUTUAL_FUND type', async () => {
      renderForm();
      
      const typeSelect = screen.getByLabelText(/investment type/i);
      fireEvent.change(typeSelect, { target: { value: 'MUTUAL_FUND' } });
      
      await waitFor(() => {
        expect(screen.getByLabelText(/scheme code/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/number of units/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/nav/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/total value/i)).not.toBeInTheDocument();
      });
    });

    it('shows total value field for REAL_ESTATE type', async () => {
      renderForm();
      
      const typeSelect = screen.getByLabelText(/investment type/i);
      fireEvent.change(typeSelect, { target: { value: 'REAL_ESTATE' } });
      
      await waitFor(() => {
        expect(screen.getByLabelText(/total value/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/symbol/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/units/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/price/i)).not.toBeInTheDocument();
      });
    });

    it('shows total value field for GOLD type', async () => {
      renderForm();
      
      const typeSelect = screen.getByLabelText(/investment type/i);
      fireEvent.change(typeSelect, { target: { value: 'GOLD' } });
      
      await waitFor(() => {
        expect(screen.getByLabelText(/total value/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/symbol/i)).not.toBeInTheDocument();
      });
    });

    it('clears irrelevant fields when switching investment types', async () => {
      renderForm();
      
      const typeSelect = screen.getByLabelText(/investment type/i);
      
      // Start with STOCK and fill unit-based fields
      fireEvent.change(typeSelect, { target: { value: 'STOCK' } });
      
      await waitFor(() => {
        const symbolInput = screen.getByLabelText(/stock symbol/i);
        fireEvent.change(symbolInput, { target: { value: 'RELIANCE' } });
      });
      
      // Switch to REAL_ESTATE
      fireEvent.change(typeSelect, { target: { value: 'REAL_ESTATE' } });
      
      await waitFor(() => {
        // Symbol field should not be visible anymore
        expect(screen.queryByLabelText(/stock symbol/i)).not.toBeInTheDocument();
        expect(screen.getByLabelText(/total value/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for required fields', async () => {
      renderForm();
      
      const submitButton = screen.getByRole('button', { name: /add investment/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/goal is required/i)).toBeInTheDocument();
        expect(screen.getByText(/account is required/i)).toBeInTheDocument();
      });
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates unit-based investment fields', async () => {
      renderForm();
      
      // Fill basic fields but leave unit-based fields empty
      fireEvent.change(screen.getByLabelText(/investment name/i), { target: { value: 'Test Stock' } });
      fireEvent.change(screen.getByLabelText(/financial goal/i), { target: { value: 'goal-1' } });
      fireEvent.change(screen.getByLabelText(/account\/platform/i), { target: { value: 'account-1' } });
      
      const submitButton = screen.getByRole('button', { name: /add investment/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid investment data/i)).toBeInTheDocument();
      });
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates total value investment fields', async () => {
      renderForm();
      
      // Switch to REAL_ESTATE type
      fireEvent.change(screen.getByLabelText(/investment type/i), { target: { value: 'REAL_ESTATE' } });
      
      // Fill basic fields but leave total value empty
      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/investment name/i), { target: { value: 'Test Property' } });
        fireEvent.change(screen.getByLabelText(/financial goal/i), { target: { value: 'goal-1' } });
        fireEvent.change(screen.getByLabelText(/account\/platform/i), { target: { value: 'account-1' } });
      });
      
      const submitButton = screen.getByRole('button', { name: /add investment/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid investment data/i)).toBeInTheDocument();
      });
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('clears field errors when user starts typing', async () => {
      renderForm();
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /add investment/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment name is required/i)).toBeInTheDocument();
      });
      
      // Start typing in the name field
      const nameInput = screen.getByLabelText(/investment name/i);
      fireEvent.change(nameInput, { target: { value: 'Test' } });
      
      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/investment name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits valid unit-based investment data', async () => {
      renderForm();
      
      // Fill all required fields for STOCK
      fireEvent.change(screen.getByLabelText(/investment name/i), { target: { value: 'Reliance Industries' } });
      fireEvent.change(screen.getByLabelText(/stock symbol/i), { target: { value: 'RELIANCE' } });
      fireEvent.change(screen.getByLabelText(/number of shares/i), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/price per share/i), { target: { value: '2500' } });
      fireEvent.change(screen.getByLabelText(/financial goal/i), { target: { value: 'goal-1' } });
      fireEvent.change(screen.getByLabelText(/account\/platform/i), { target: { value: 'account-1' } });
      
      const submitButton = screen.getByRole('button', { name: /add investment/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'STOCK',
          name: 'Reliance Industries',
          symbol: 'RELIANCE',
          units: 10,
          buyPrice: 2500,
          totalValue: undefined,
          buyDate: expect.any(String),
          goalId: 'goal-1',
          accountId: 'account-1',
          notes: '',
        });
      });
    });

    it('submits valid total value investment data', async () => {
      renderForm();
      
      // Switch to REAL_ESTATE and fill fields
      fireEvent.change(screen.getByLabelText(/investment type/i), { target: { value: 'REAL_ESTATE' } });
      
      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/investment name/i), { target: { value: 'Mumbai Apartment' } });
        fireEvent.change(screen.getByLabelText(/total value/i), { target: { value: '5000000' } });
        fireEvent.change(screen.getByLabelText(/financial goal/i), { target: { value: 'goal-2' } });
        fireEvent.change(screen.getByLabelText(/account\/platform/i), { target: { value: 'account-2' } });
      });
      
      const submitButton = screen.getByRole('button', { name: /add investment/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'REAL_ESTATE',
          name: 'Mumbai Apartment',
          symbol: '',
          units: undefined,
          buyPrice: undefined,
          totalValue: 5000000,
          buyDate: expect.any(String),
          goalId: 'goal-2',
          accountId: 'account-2',
          notes: '',
        });
      });
    });

    it('includes notes when provided', async () => {
      renderForm();
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText(/investment name/i), { target: { value: 'Test Investment' } });
      fireEvent.change(screen.getByLabelText(/investment type/i), { target: { value: 'GOLD' } });
      
      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/total value/i), { target: { value: '100000' } });
        fireEvent.change(screen.getByLabelText(/financial goal/i), { target: { value: 'goal-1' } });
        fireEvent.change(screen.getByLabelText(/account\/platform/i), { target: { value: 'account-1' } });
      });
      
      // Add notes
      const notesTextarea = screen.getByPlaceholderText(/add any additional notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Gold jewelry for wedding' } });
      
      const submitButton = screen.getByRole('button', { name: /add investment/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Gold jewelry for wedding',
          })
        );
      });
    });
  });

  describe('Calculated Values Display', () => {
    it('shows calculated total for unit-based investments', async () => {
      renderForm();
      
      // Fill units and price
      fireEvent.change(screen.getByLabelText(/number of shares/i), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/price per share/i), { target: { value: '2500' } });
      
      // Should show calculated total
      await waitFor(() => {
        expect(screen.getByText(/total investment: ₹25,000/i)).toBeInTheDocument();
      });
    });

    it('updates calculated total when values change', async () => {
      renderForm();
      
      const unitsInput = screen.getByLabelText(/number of shares/i);
      const priceInput = screen.getByLabelText(/price per share/i);
      
      // Initial values
      fireEvent.change(unitsInput, { target: { value: '10' } });
      fireEvent.change(priceInput, { target: { value: '2500' } });
      
      await waitFor(() => {
        expect(screen.getByText(/total investment: ₹25,000/i)).toBeInTheDocument();
      });
      
      // Change units
      fireEvent.change(unitsInput, { target: { value: '20' } });
      
      await waitFor(() => {
        expect(screen.getByText(/total investment: ₹50,000/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode', () => {
    const mockInvestment = {
      id: 'inv-1',
      type: InvestmentType.STOCK,
      name: 'Existing Stock',
      symbol: 'EXISTING',
      units: 5,
      buyPrice: 1000,
      buyDate: new Date('2023-01-15'),
      goalId: 'goal-1',
      accountId: 'account-1',
      notes: 'Existing notes',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('populates form with existing investment data', () => {
      renderForm({ investment: mockInvestment });
      
      expect(screen.getByDisplayValue('Existing Stock')).toBeInTheDocument();
      expect(screen.getByDisplayValue('EXISTING')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2023-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing notes')).toBeInTheDocument();
    });

    it('shows update button text in edit mode', () => {
      renderForm({ investment: mockInvestment });
      
      expect(screen.getByRole('button', { name: /update investment/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add investment/i })).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('disables form during submission', () => {
      renderForm({ isLoading: true });
      
      const submitButton = screen.getByRole('button', { name: /saving/i });
      expect(submitButton).toBeDisabled();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      renderForm();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});