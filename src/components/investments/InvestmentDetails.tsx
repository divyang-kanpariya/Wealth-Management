import React, { useState, useEffect } from 'react';
import { Investment, InvestmentWithCurrentValue, Goal, Account } from '@/types';
import { calculateInvestmentValue } from '@/lib/calculations';
import { InvestmentType } from '@prisma/client';
import { 
  Button, 
  LoadingState, 
  ErrorState, 
  CompactCard, 
  QuickActions, 
  DataGrid,
  type QuickAction,
  type DataGridItem
} from '../ui';

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
  }, [fetchInvestment, investmentId]);

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
      <LoadingState 
        message="Loading investment details..." 
        size="lg" 
        className={`py-12 ${className}`}
      />
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
    ? (investment.units ?? 0) * (investment.buyPrice ?? 0)
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
        <QuickActions
          actions={[
            ...(investment.symbol && ['STOCK', 'MUTUAL_FUND'].includes(investment.type) ? [{
              id: 'refresh-price',
              label: priceLoading ? 'Refreshing...' : 'Refresh Price',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ),
              onClick: handleRefreshPrice,
              disabled: priceLoading,
              variant: 'secondary' as const
            }] : []),
            ...(onEdit ? [{
              id: 'edit-investment',
              label: 'Edit',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ),
              onClick: () => onEdit(investment),
              variant: 'secondary' as const
            }] : []),
            ...(onDelete ? [{
              id: 'delete-investment',
              label: 'Delete',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ),
              onClick: () => onDelete(investment),
              variant: 'danger' as const
            }] : [])
          ]}
          size="md"
          layout="horizontal"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Investment Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Value Summary */}
          <div className={`rounded-lg border-2 p-6 ${gainLossBgColor}`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Value</h2>
            <DataGrid
              items={[
                {
                  label: 'Invested',
                  value: (
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(investedValue)}
                    </span>
                  )
                },
                {
                  label: 'Current Value',
                  value: (
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(currentValue)}
                    </span>
                  )
                },
                {
                  label: 'Gain/Loss',
                  value: (
                    <span className={`text-xl font-bold ${gainLossColor}`}>
                      {formatCurrency(gainLoss)}
                    </span>
                  ),
                  color: gainLoss >= 0 ? 'success' : 'danger'
                },
                {
                  label: 'Return %',
                  value: (
                    <span className={`text-xl font-bold ${gainLossColor}`}>
                      {formatPercentage(gainLossPercentage)}
                    </span>
                  ),
                  color: gainLoss >= 0 ? 'success' : 'danger'
                }
              ]}
              columns={4}
              variant="minimal"
              className="bg-transparent"
            />
          </div>

          {/* Investment Information */}
          <CompactCard title="Investment Information">
            <DataGrid
              items={[
                ...(isUnitBased ? [
                  {
                    label: 'Units/Shares',
                    value: investment.units?.toLocaleString('en-IN', { maximumFractionDigits: 3 }) || '0'
                  },
                  {
                    label: 'Buy Price',
                    value: formatCurrency(investment.buyPrice || 0)
                  },
                  ...(currentPrice ? [{
                    label: 'Current Price',
                    value: (
                      <div>
                        {formatCurrency(currentPrice)}
                        {lastPriceUpdate && (
                          <div className="text-xs text-gray-500 mt-1">
                            Updated: {lastPriceUpdate.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    )
                  }] : [])
                ] : [
                  {
                    label: 'Total Value',
                    value: formatCurrency(investment.totalValue || 0)
                  }
                ]),
                {
                  label: 'Purchase Date',
                  value: new Date(investment.buyDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                }
              ]}
              columns={2}
              variant="default"
            />
          </CompactCard>

          {/* Notes */}
          {investment.notes && (
            <CompactCard title="Notes">
              <p className="text-gray-700 whitespace-pre-wrap">{investment.notes}</p>
            </CompactCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Goal Information */}
          <CompactCard title="Linked Goal">
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
          </CompactCard>

          {/* Account Information */}
          <CompactCard title="Account/Platform">
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
          </CompactCard>

          {/* Price Status */}
          {isUnitBased && (
            <CompactCard title="Price Status">
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
            </CompactCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentDetails;