import React, { useState, useEffect } from 'react';
import { Investment, InvestmentWithCurrentValue, Goal, Account } from '@/types';
import { calculateInvestmentValue } from '@/lib/calculations';
import { InvestmentType } from '@prisma/client';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorState from '../ui/ErrorState';

interface InvestmentDetailsProps {
  investmentId: string;
  onEdit?: (investment: Investment) => void;
  onDelete?: (investment: Investment) => void;
  onBack?: () => void;
  className?: string;
}

const InvestmentDetails: React.FC<InvestmentDetailsProps> = ({
  investmentId,
  onEdit,
  onDelete,
  onBack,
  className = '',
}) => {
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [investmentWithValue, setInvestmentWithValue] = useState<InvestmentWithCurrentValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  const fetchInvestment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/investments/${investmentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch investment details');
      }

      const data = await response.json();
      setInvestment(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch investment');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentPrice = async (symbol: string, type: InvestmentType) => {
    try {
      setPriceLoading(true);
      let response;

      if (type === 'STOCK') {
        response = await fetch(`/api/prices/stocks?symbol=${symbol}`);
      } else if (type === 'MUTUAL_FUND') {
        response = await fetch(`/api/prices/mutual-funds?schemeCode=${symbol}`);
      } else {
        return; // No price fetching for other types
      }

      if (response.ok) {
        const data = await response.json();
        const price = type === 'STOCK' ? data.price : data.nav;
        if (price && price > 0) {
          setCurrentPrice(price);
          setLastPriceUpdate(new Date());
        }
      }
    } catch (err) {
      console.error('Failed to fetch current price:', err);
    } finally {
      setPriceLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestment();
  }, [investmentId]);

  useEffect(() => {
    if (investment && investment.symbol && ['STOCK', 'MUTUAL_FUND'].includes(investment.type)) {
      fetchCurrentPrice(investment.symbol, investment.type);
    }
  }, [investment]);

  useEffect(() => {
    if (investment) {
      const investmentWithValue = calculateInvestmentValue(investment, currentPrice || undefined);
      setInvestmentWithValue(investmentWithValue);
    }
  }, [investment, currentPrice]);

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

  const handleRefreshPrice = () => {
    if (investment && investment.symbol) {
      fetchCurrentPrice(investment.symbol, investment.type);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-12 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !investment || !investmentWithValue) {
    return (
      <div className={className}>
        <ErrorState
          title="Failed to load investment details"
          message={error || 'Investment not found'}
          onRetry={fetchInvestment}
        />
      </div>
    );
  }

  const { gainLoss, gainLossPercentage, currentValue } = investmentWithValue;
  const isUnitBased = investment.units && investment.buyPrice;
  const investedValue = isUnitBased 
    ? investment.units * investment.buyPrice 
    : investment.totalValue || 0;

  const gainLossColor = gainLoss >= 0 ? 'text-green-600' : 'text-red-600';
  const gainLossBgColor = gainLoss >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              ← Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{investment.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {getInvestmentTypeLabel(investment.type)}
              </span>
              {investment.symbol && (
                <span className="text-gray-600 text-sm">
                  {investment.symbol}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {investment.symbol && ['STOCK', 'MUTUAL_FUND'].includes(investment.type) && (
            <Button
              variant="outline"
              onClick={handleRefreshPrice}
              disabled={priceLoading}
            >
              {priceLoading ? 'Refreshing...' : 'Refresh Price'}
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit(investment)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              onClick={() => onDelete(investment)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Investment Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Value Summary */}
          <div className={`rounded-lg border-2 p-6 ${gainLossBgColor}`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Value</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Invested</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(investedValue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Value</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(currentValue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Gain/Loss</p>
                <p className={`text-xl font-bold ${gainLossColor}`}>
                  {formatCurrency(gainLoss)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Return %</p>
                <p className={`text-xl font-bold ${gainLossColor}`}>
                  {formatPercentage(gainLossPercentage)}
                </p>
              </div>
            </div>
          </div>

          {/* Investment Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Investment Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isUnitBased ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Units/Shares</p>
                    <p className="text-lg text-gray-900 mt-1">
                      {investment.units?.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Buy Price</p>
                    <p className="text-lg text-gray-900 mt-1">
                      {formatCurrency(investment.buyPrice || 0)}
                    </p>
                  </div>
                  {currentPrice && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Price</p>
                      <p className="text-lg text-gray-900 mt-1">
                        {formatCurrency(currentPrice)}
                        {lastPriceUpdate && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Updated: {lastPriceUpdate.toLocaleTimeString()})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-lg text-gray-900 mt-1">
                    {formatCurrency(investment.totalValue || 0)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-600">Purchase Date</p>
                <p className="text-lg text-gray-900 mt-1">
                  {new Date(investment.buyDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {investment.notes && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{investment.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Goal Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Linked Goal</h3>
            <div>
              <p className="font-medium text-gray-900">
                {investment.goal?.name || 'Unknown Goal'}
              </p>
              {investment.goal?.description && (
                <p className="text-sm text-gray-600 mt-2">
                  {investment.goal.description}
                </p>
              )}
              {investment.goal?.targetAmount && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Target Amount</p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(investment.goal.targetAmount)}
                  </p>
                </div>
              )}
              {investment.goal?.targetDate && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Target Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(investment.goal.targetDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account/Platform</h3>
            <div>
              <p className="font-medium text-gray-900">
                {investment.account?.name || 'Unknown Account'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {investment.account?.type || 'Unknown Type'}
              </p>
              {investment.account?.notes && (
                <p className="text-sm text-gray-600 mt-2">
                  {investment.account.notes}
                </p>
              )}
            </div>
          </div>

          {/* Price Status */}
          {isUnitBased && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Status</h3>
              <div className="space-y-2">
                {currentPrice ? (
                  <div className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Live price available
                  </div>
                ) : (
                  <div className="flex items-center text-amber-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Using buy price
                  </div>
                )}
                {lastPriceUpdate && (
                  <p className="text-xs text-gray-500">
                    Last updated: {lastPriceUpdate.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentDetails;