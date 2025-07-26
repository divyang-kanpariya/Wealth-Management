import React, { useState } from 'react';
import { InvestmentFilters, InvestmentType, Goal, Account } from '@/types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

interface InvestmentFiltersComponentProps {
  filters: InvestmentFilters;
  onFiltersChange: (filters: InvestmentFilters) => void;
  goals: Goal[];
  accounts: Account[];
  onReset: () => void;
}

const InvestmentFiltersComponent: React.FC<InvestmentFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  goals,
  accounts,
  onReset
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value || undefined
    });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value === 'ALL' ? undefined : (value as InvestmentType)
    });
  };

  const handleGoalChange = (value: string) => {
    onFiltersChange({
      ...filters,
      goalId: value === 'ALL' ? undefined : value
    });
  };

  const handleAccountChange = (value: string) => {
    onFiltersChange({
      ...filters,
      accountId: value === 'ALL' ? undefined : value
    });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const dateRange = filters.dateRange || {};
    onFiltersChange({
      ...filters,
      dateRange: {
        ...dateRange,
        [field]: value ? new Date(value) : undefined
      }
    });
  };

  const handleValueRangeChange = (field: 'min' | 'max', value: string) => {
    const valueRange = filters.valueRange || {};
    onFiltersChange({
      ...filters,
      valueRange: {
        ...valueRange,
        [field]: value ? parseFloat(value) : undefined
      }
    });
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof InvestmentFilters];
    if (key === 'dateRange' || key === 'valueRange') {
      return value && Object.values(value).some(v => v !== undefined);
    }
    return value !== undefined;
  });

  const investmentTypes = [
    { value: 'ALL', label: 'All Types' },
    { value: 'STOCK', label: 'Stocks' },
    { value: 'MUTUAL_FUND', label: 'Mutual Funds' },
    { value: 'GOLD', label: 'Gold' },
    { value: 'JEWELRY', label: 'Jewelry' },
    { value: 'REAL_ESTATE', label: 'Real Estate' },
    { value: 'FD', label: 'Fixed Deposit' },
    { value: 'CRYPTO', label: 'Cryptocurrency' },
    { value: 'OTHER', label: 'Other' }
  ];

  const goalOptions = [
    { value: 'ALL', label: 'All Goals' },
    ...goals.map(goal => ({ value: goal.id, label: goal.name }))
  ];

  const accountOptions = [
    { value: 'ALL', label: 'All Accounts' },
    ...accounts.map(account => ({ value: account.id, label: account.name }))
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
            >
              Clear All
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Always visible: Search */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search investments by name, symbol, or notes..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Expandable filters */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Type, Goal, Account filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Investment Type
              </label>
              <Select
                value={filters.type || 'ALL'}
                onChange={(e) => handleTypeChange(e.target.value)}
                options={investmentTypes}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal
              </label>
              <Select
                value={filters.goalId || 'ALL'}
                onChange={(e) => handleGoalChange(e.target.value)}
                options={goalOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account
              </label>
              <Select
                value={filters.accountId || 'ALL'}
                onChange={(e) => handleAccountChange(e.target.value)}
                options={accountOptions}
              />
            </div>
          </div>

          {/* Date range filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Date Range
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <Input
                  type="date"
                  value={filters.dateRange?.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <Input
                  type="date"
                  value={filters.dateRange?.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Value range filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Value Range (₹)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Minimum</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.valueRange?.min?.toString() || ''}
                  onChange={(e) => handleValueRangeChange('min', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Maximum</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={filters.valueRange?.max?.toString() || ''}
                  onChange={(e) => handleValueRangeChange('max', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentFiltersComponent;