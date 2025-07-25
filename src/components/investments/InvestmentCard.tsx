import React from 'react';
import { Investment, InvestmentWithCurrentValue } from '@/types';
import { InvestmentType } from '@prisma/client';
import Button from '../ui/Button';

interface InvestmentCardProps {
  investmentWithValue: InvestmentWithCurrentValue;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  onViewDetails?: (investment: Investment) => void;
  isLoading?: boolean;
}

const InvestmentCard: React.FC<InvestmentCardProps> = ({
  investmentWithValue,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false,
}) => {
  const { investment, currentPrice, currentValue, gainLoss, gainLossPercentage } = investmentWithValue;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getInvestmentTypeLabel = (type: InvestmentType) => {
    const labels: Record<InvestmentType, string> = {
      STOCK: 'Stock',
      MUTUAL_FUND: 'Mutual Fund',
      GOLD: 'Gold',
      JEWELRY: 'Jewelry',
      REAL_ESTATE: 'Real Estate',
      FD: 'Fixed Deposit',
      CRYPTO: 'Cryptocurrency',
      OTHER: 'Other',
    };
    return labels[type];
  };

  const isUnitBased = investment.units && investment.buyPrice;
  const investedValue = isUnitBased 
    ? investment.units * investment.buyPrice 
    : investment.totalValue || 0;

  const gainLossColor = gainLoss >= 0 ? 'text-green-600' : 'text-red-600';
  const gainLossBgColor = gainLoss >= 0 ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div 
          className="flex-1 cursor-pointer" 
          onClick={() => onViewDetails && onViewDetails(investment)}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors">
            {investment.name}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {getInvestmentTypeLabel(investment.type)}
            </span>
            {investment.symbol && (
              <span className="text-gray-500">
                {investment.symbol}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(investment)}
              disabled={isLoading}
            >
              View
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(investment)}
            disabled={isLoading}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(investment)}
            disabled={isLoading}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Investment Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {isUnitBased ? (
          <>
            <div>
              <p className="text-sm text-gray-600">Units</p>
              <p className="font-medium">{investment.units?.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Buy Price</p>
              <p className="font-medium">{formatCurrency(investment.buyPrice || 0)}</p>
            </div>
            {currentPrice && (
              <div>
                <p className="text-sm text-gray-600">Current Price</p>
                <p className="font-medium">{formatCurrency(currentPrice)}</p>
              </div>
            )}
          </>
        ) : (
          <div>
            <p className="text-sm text-gray-600">Total Value</p>
            <p className="font-medium">{formatCurrency(investment.totalValue || 0)}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600">Purchase Date</p>
          <p className="font-medium">
            {new Date(investment.buyDate).toLocaleDateString('en-IN')}
          </p>
        </div>
      </div>

      {/* Value Summary */}
      <div className={`rounded-lg p-4 mb-4 ${gainLossBgColor}`}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Invested</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(investedValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Value</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(currentValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Gain/Loss</p>
            <p className={`font-semibold ${gainLossColor}`}>
              {formatCurrency(gainLoss)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Return %</p>
            <p className={`font-semibold ${gainLossColor}`}>
              {formatPercentage(gainLossPercentage)}
            </p>
          </div>
        </div>
      </div>

      {/* Goal and Account Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Goal</p>
          <p className="font-medium text-gray-900">
            {investment.goal?.name || 'Unknown Goal'}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Account</p>
          <p className="font-medium text-gray-900">
            {investment.account?.name || 'Unknown Account'}
          </p>
        </div>
      </div>

      {/* Notes */}
      {investment.notes && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">Notes</p>
          <p className="text-sm text-gray-900 mt-1">{investment.notes}</p>
        </div>
      )}

      {/* Price Update Status */}
      {isUnitBased && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {currentPrice ? 'Live price' : 'Using buy price'}
            </span>
            {!currentPrice && investment.symbol && (
              <span className="text-amber-600">
                Price data unavailable
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentCard;