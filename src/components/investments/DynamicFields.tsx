import React from 'react';
import { InvestmentType } from '@prisma/client';
import { Input } from '../ui';

interface DynamicFieldsProps {
  investmentType: InvestmentType;
  formData: {
    symbol?: string;
    units?: number;
    buyPrice?: number;
    totalValue?: number;
  };
  errors: Record<string, string>;
  onChange: (field: string, value: string | number | undefined) => void;
}

const DynamicFields: React.FC<DynamicFieldsProps> = ({
  investmentType,
  formData,
  errors,
  onChange,
}) => {
  const isUnitBased = ['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(investmentType);

  if (isUnitBased) {
    return (
      <>
        {/* Symbol Field */}
        <Input
          label={getSymbolLabel(investmentType)}
          type="text"
          value={formData.symbol || ''}
          onChange={(e) => onChange('symbol', e.target.value)}
          error={errors.symbol}
          placeholder={getSymbolPlaceholder(investmentType)}
          helperText={getSymbolHelperText(investmentType)}
        />

        {/* Units Field */}
        <Input
          label={getUnitsLabel(investmentType)}
          type="number"
          step="0.001"
          min="0"
          value={formData.units || ''}
          onChange={(e) => onChange('units', parseFloat(e.target.value) || undefined)}
          error={errors.units}
          placeholder="Enter quantity"
          required
        />

        {/* Buy Price Field */}
        <Input
          label={getBuyPriceLabel(investmentType)}
          type="number"
          step="0.01"
          min="0"
          value={formData.buyPrice || ''}
          onChange={(e) => onChange('buyPrice', parseFloat(e.target.value) || undefined)}
          error={errors.buyPrice}
          placeholder="Enter price"
          required
        />

        {/* Calculated Total Display */}
        {formData.units && formData.buyPrice && (
          <div className="md:col-span-2 bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-800">
              Total Investment: ₹{(formData.units * formData.buyPrice).toLocaleString('en-IN', { 
                maximumFractionDigits: 2 
              })}
            </p>
          </div>
        )}
      </>
    );
  }

  // For non-unit based investments
  return (
    <Input
      label={getTotalValueLabel(investmentType)}
      type="number"
      step="0.01"
      min="0"
      value={formData.totalValue || ''}
      onChange={(e) => onChange('totalValue', parseFloat(e.target.value) || undefined)}
      error={errors.totalValue}
      placeholder="Enter total value"
      helperText={getTotalValueHelperText(investmentType)}
      required
    />
  );
};

// Helper functions for dynamic labels and placeholders
function getSymbolLabel(type: InvestmentType): string {
  switch (type) {
    case 'STOCK':
      return 'Stock Symbol';
    case 'MUTUAL_FUND':
      return 'Scheme Code';
    case 'CRYPTO':
      return 'Cryptocurrency Symbol';
    default:
      return 'Symbol';
  }
}

function getSymbolPlaceholder(type: InvestmentType): string {
  switch (type) {
    case 'STOCK':
      return 'e.g., RELIANCE, TCS';
    case 'MUTUAL_FUND':
      return 'e.g., 120503';
    case 'CRYPTO':
      return 'e.g., BTC, ETH';
    default:
      return 'Enter symbol';
  }
}

function getSymbolHelperText(type: InvestmentType): string {
  switch (type) {
    case 'STOCK':
      return 'NSE stock symbol for price fetching';
    case 'MUTUAL_FUND':
      return 'AMFI scheme code for NAV fetching';
    case 'CRYPTO':
      return 'Cryptocurrency symbol';
    default:
      return '';
  }
}

function getUnitsLabel(type: InvestmentType): string {
  switch (type) {
    case 'STOCK':
      return 'Number of Shares';
    case 'MUTUAL_FUND':
      return 'Number of Units';
    case 'CRYPTO':
      return 'Quantity';
    default:
      return 'Quantity';
  }
}

function getBuyPriceLabel(type: InvestmentType): string {
  switch (type) {
    case 'STOCK':
      return 'Price per Share (₹)';
    case 'MUTUAL_FUND':
      return 'NAV (₹)';
    case 'CRYPTO':
      return 'Price per Unit (₹)';
    default:
      return 'Price per Unit (₹)';
  }
}

function getTotalValueLabel(type: InvestmentType): string {
  switch (type) {
    case 'REAL_ESTATE':
      return 'Property Value (₹)';
    case 'JEWELRY':
      return 'Jewelry Value (₹)';
    case 'GOLD':
      return 'Gold Value (₹)';
    case 'FD':
      return 'Fixed Deposit Amount (₹)';
    default:
      return 'Total Value (₹)';
  }
}

function getTotalValueHelperText(type: InvestmentType): string {
  switch (type) {
    case 'REAL_ESTATE':
      return 'Current market value or purchase price';
    case 'JEWELRY':
      return 'Appraised or purchase value';
    case 'GOLD':
      return 'Current value based on weight and purity';
    case 'FD':
      return 'Principal amount deposited';
    default:
      return 'Enter the total investment amount';
  }
}

export default DynamicFields;