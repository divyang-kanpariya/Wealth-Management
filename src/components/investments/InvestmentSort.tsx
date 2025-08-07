import React from 'react';
import { InvestmentSortOptions } from '@/types';
import Select from '../ui/Select';

interface InvestmentSortProps {
  sortOptions: InvestmentSortOptions;
  onSortChange: (sortOptions: InvestmentSortOptions) => void;
}

const InvestmentSort: React.FC<InvestmentSortProps> = ({
  sortOptions,
  onSortChange
}) => {
  const sortFields = [
    { value: 'name', label: 'Name' },
    { value: 'currentValue', label: 'Current Value' },
    { value: 'gainLoss', label: 'Gain/Loss Amount' },
    { value: 'gainLossPercentage', label: 'Gain/Loss %' },
    { value: 'buyDate', label: 'Purchase Date' },
    { value: 'type', label: 'Investment Type' }
  ];

  const sortDirections = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' }
  ];

  const handleFieldChange = (field: string) => {
    onSortChange({
      ...sortOptions,
      field: field as InvestmentSortOptions['field']
    });
  };

  const handleDirectionChange = (direction: string) => {
    onSortChange({
      ...sortOptions,
      direction: direction as InvestmentSortOptions['direction']
    });
  };

  const toggleDirection = () => {
    onSortChange({
      ...sortOptions,
      direction: sortOptions.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm text-gray-600">Sort by:</span>
      
      <div className="flex items-center space-x-2">
        <Select
          value={sortOptions.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          options={sortFields}
          className="min-w-[140px]"
        />
        
        <button
          onClick={toggleDirection}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title={`Sort ${sortOptions.direction === 'asc' ? 'ascending' : 'descending'}`}
        >
          {sortOptions.direction === 'asc' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default InvestmentSort;