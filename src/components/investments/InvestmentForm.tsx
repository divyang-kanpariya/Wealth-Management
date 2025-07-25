import React, { useState, useEffect } from 'react';
import { InvestmentType } from '@prisma/client';
import { investmentSchema } from '../../lib/validations';
import { Investment, Goal, Account } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { z } from 'zod';

interface InvestmentFormProps {
  investment?: Investment;
  goals: Goal[];
  accounts: Account[];
  onSubmit: (data: InvestmentFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface InvestmentFormData {
  type: InvestmentType;
  name: string;
  symbol?: string;
  units?: number;
  buyPrice?: number;
  totalValue?: number;
  buyDate: string;
  goalId?: string;
  accountId: string;
  notes?: string;
}

const INVESTMENT_TYPE_OPTIONS = [
  { value: 'STOCK', label: 'Stock' },
  { value: 'MUTUAL_FUND', label: 'Mutual Fund' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'JEWELRY', label: 'Jewelry' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'FD', label: 'Fixed Deposit' },
  { value: 'CRYPTO', label: 'Cryptocurrency' },
  { value: 'OTHER', label: 'Other' },
];

const getFieldsForInvestmentType = (type: InvestmentType) => {
  const baseFields = ['name', 'buyDate', 'goalId', 'accountId', 'notes'];
  
  switch (type) {
    case 'STOCK':
    case 'MUTUAL_FUND':
    case 'CRYPTO':
      return [...baseFields, 'symbol', 'units', 'buyPrice'];
    case 'REAL_ESTATE':
    case 'JEWELRY':
    case 'GOLD':
    case 'FD':
    case 'OTHER':
      return [...baseFields, 'totalValue'];
    default:
      return [...baseFields, 'totalValue'];
  }
};

const InvestmentForm: React.FC<InvestmentFormProps> = ({
  investment,
  goals,
  accounts,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<InvestmentFormData>({
    type: 'STOCK',
    name: '',
    symbol: '',
    units: undefined,
    buyPrice: undefined,
    totalValue: undefined,
    buyDate: new Date().toISOString().split('T')[0],
    goalId: undefined,
    accountId: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<string[]>([]);

  // Initialize form data if editing
  useEffect(() => {
    if (investment) {
      setFormData({
        type: investment.type,
        name: investment.name,
        symbol: investment.symbol || '',
        units: investment.units,
        buyPrice: investment.buyPrice,
        totalValue: investment.totalValue,
        buyDate: new Date(investment.buyDate).toISOString().split('T')[0],
        goalId: investment.goalId,
        accountId: investment.accountId,
        notes: investment.notes || '',
      });
    }
  }, [investment]);

  // Update visible fields when investment type changes
  useEffect(() => {
    setVisibleFields(getFieldsForInvestmentType(formData.type));
    // Clear fields that are not relevant for the selected type
    if (['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(formData.type)) {
      setFormData(prev => ({ ...prev, totalValue: undefined }));
    } else {
      setFormData(prev => ({ ...prev, symbol: '', units: undefined, buyPrice: undefined }));
    }
  }, [formData.type]);

  const handleInputChange = (field: keyof InvestmentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    try {
      // Convert form data to match schema expectations
      const dataToValidate = {
        ...formData,
        buyDate: new Date(formData.buyDate),
        units: formData.units ? Number(formData.units) : undefined,
        buyPrice: formData.buyPrice ? Number(formData.buyPrice) : undefined,
        totalValue: formData.totalValue ? Number(formData.totalValue) : undefined,
      };

      investmentSchema.parse(dataToValidate);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const goalOptions = goals.map(goal => ({
    value: goal.id,
    label: goal.name,
  }));

  const accountOptions = accounts.map(account => ({
    value: account.id,
    label: `${account.name} (${account.type})`,
  }));

  const isUnitBased = ['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(formData.type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Investment Type */}
        <div className="md:col-span-2">
          <Select
            label="Investment Type"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value as InvestmentType)}
            options={INVESTMENT_TYPE_OPTIONS}
            error={errors.type}
            required
          />
        </div>

        {/* Investment Name */}
        {visibleFields.includes('name') && (
          <Input
            label="Investment Name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={errors.name}
            placeholder="Enter investment name"
            required
          />
        )}

        {/* Symbol (for stocks, mutual funds, crypto) */}
        {visibleFields.includes('symbol') && (
          <Input
            label={formData.type === 'STOCK' ? 'Stock Symbol' : 
                   formData.type === 'MUTUAL_FUND' ? 'Scheme Code' : 'Symbol'}
            type="text"
            value={formData.symbol}
            onChange={(e) => handleInputChange('symbol', e.target.value)}
            error={errors.symbol}
            placeholder={formData.type === 'STOCK' ? 'e.g., RELIANCE' : 
                        formData.type === 'MUTUAL_FUND' ? 'e.g., 120503' : 'Enter symbol'}
          />
        )}

        {/* Units (for unit-based investments) */}
        {visibleFields.includes('units') && (
          <Input
            label={formData.type === 'STOCK' ? 'Number of Shares' : 
                   formData.type === 'MUTUAL_FUND' ? 'Number of Units' : 'Quantity'}
            type="number"
            step="0.001"
            min="0"
            value={formData.units || ''}
            onChange={(e) => handleInputChange('units', parseFloat(e.target.value) || undefined)}
            error={errors.units}
            placeholder="Enter quantity"
            required={isUnitBased}
          />
        )}

        {/* Buy Price (for unit-based investments) */}
        {visibleFields.includes('buyPrice') && (
          <Input
            label={formData.type === 'STOCK' ? 'Price per Share (₹)' : 
                   formData.type === 'MUTUAL_FUND' ? 'NAV (₹)' : 'Price per Unit (₹)'}
            type="number"
            step="0.01"
            min="0"
            value={formData.buyPrice || ''}
            onChange={(e) => handleInputChange('buyPrice', parseFloat(e.target.value) || undefined)}
            error={errors.buyPrice}
            placeholder="Enter price"
            required={isUnitBased}
          />
        )}

        {/* Total Value (for non-unit investments) */}
        {visibleFields.includes('totalValue') && (
          <Input
            label="Total Value (₹)"
            type="number"
            step="0.01"
            min="0"
            value={formData.totalValue || ''}
            onChange={(e) => handleInputChange('totalValue', parseFloat(e.target.value) || undefined)}
            error={errors.totalValue}
            placeholder="Enter total value"
            required={!isUnitBased}
          />
        )}

        {/* Buy Date */}
        {visibleFields.includes('buyDate') && (
          <Input
            label="Purchase Date"
            type="date"
            value={formData.buyDate}
            onChange={(e) => handleInputChange('buyDate', e.target.value)}
            error={errors.buyDate}
            required
          />
        )}

        {/* Goal Selection */}
        {visibleFields.includes('goalId') && (
          <Select
            label="Financial Goal (Optional)"
            value={formData.goalId || ''}
            onChange={(e) => handleInputChange('goalId', e.target.value || undefined)}
            options={[
              { value: '', label: 'No specific goal' },
              ...goalOptions
            ]}
            placeholder="Select a goal or leave unassigned"
            error={errors.goalId}
          />
        )}

        {/* Account Selection */}
        {visibleFields.includes('accountId') && (
          <Select
            label="Account/Platform"
            value={formData.accountId}
            onChange={(e) => handleInputChange('accountId', e.target.value)}
            options={accountOptions}
            placeholder="Select an account"
            error={errors.accountId}
            required
          />
        )}

        {/* Notes */}
        {visibleFields.includes('notes') && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Add any additional notes..."
            />
          </div>
        )}
      </div>

      {/* Calculated Values Display */}
      {isUnitBased && formData.units && formData.buyPrice && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Calculated Values</h4>
          <p className="text-sm text-gray-600">
            Total Investment: ₹{(formData.units * formData.buyPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : investment ? 'Update Investment' : 'Add Investment'}
        </Button>
      </div>
    </form>
  );
};

export default InvestmentForm;