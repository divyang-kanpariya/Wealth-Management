import React from 'react';
import { InvestmentWithCurrentValue, Goal, Account } from '@/types';
import Table, { TableColumn } from '../ui/Table';
import Button from '../ui/Button';

interface InvestmentTableProps {
  investments: InvestmentWithCurrentValue[];
  goals: Goal[];
  accounts: Account[];
  onEdit: (investment: any) => void;
  onDelete: (investment: any) => void;
  onViewDetails: (investment: any) => void;
  isLoading?: boolean;
  showSelection?: boolean;
  selectedInvestments?: any[];
  onSelectionChange?: (investment: any, selected: boolean) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
}

const InvestmentTable: React.FC<InvestmentTableProps> = ({
  investments,
  goals,
  accounts,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false,
  showSelection = false,
  selectedInvestments = [],
  onSelectionChange,
  onSort,
  sortKey,
  sortDirection
}) => {
  const getGoalName = (goalId?: string) => {
    if (!goalId) return 'No Goal';
    const goal = goals.find(g => g.id === goalId);
    return goal?.name || 'Unknown Goal';
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const getGainLossColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getInvestmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STOCK: 'Stock',
      MUTUAL_FUND: 'Mutual Fund',
      GOLD: 'Gold',
      JEWELRY: 'Jewelry',
      REAL_ESTATE: 'Real Estate',
      FD: 'Fixed Deposit',
      CRYPTO: 'Cryptocurrency',
      OTHER: 'Other',
    };
    return labels[type] || type;
  };

  const columns: TableColumn<InvestmentWithCurrentValue>[] = [
    {
      key: 'name',
      title: 'Investment',
      sortable: true,
      width: '20%',
      render: (_, item) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{item.investment.name}</div>
          <div className="text-sm text-gray-500 truncate">
            {getInvestmentTypeLabel(item.investment.type)}
            {item.investment.symbol && ` • ${item.investment.symbol}`}
          </div>
        </div>
      )
    },
    {
      key: 'currentValue',
      title: 'Current Value',
      sortable: true,
      className: 'text-right',
      width: '15%',
      render: (_, item) => (
        <div className="text-right min-w-0">
          <div className="font-medium text-gray-900">
            {formatCurrency(item.currentValue)}
          </div>
          {item.investment.units && item.investment.buyPrice && (
            <div className="text-sm text-gray-500 truncate">
              {item.investment.units.toLocaleString('en-IN', { maximumFractionDigits: 4 })} units
              {item.currentPrice && (
                <span className="block sm:inline"> @ {formatCurrency(item.currentPrice)}</span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'investedValue',
      title: 'Invested',
      sortable: true,
      className: 'text-right',
      width: '15%',
      render: (_, item) => {
        const investedValue = item.investment.units && item.investment.buyPrice
          ? item.investment.units * item.investment.buyPrice
          : item.investment.totalValue || 0;
        return (
          <div className="text-right min-w-0">
            <div className="font-medium text-gray-900">
              {formatCurrency(investedValue)}
            </div>
            {item.investment.units && item.investment.buyPrice && (
              <div className="text-sm text-gray-500 truncate">
                @ {formatCurrency(item.investment.buyPrice)}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'gainLoss',
      title: 'Gain/Loss',
      sortable: true,
      className: 'text-right',
      width: '15%',
      render: (_, item) => (
        <div className="text-right min-w-0">
          <div className={`font-medium ${getGainLossColor(item.gainLoss)}`}>
            {formatCurrency(item.gainLoss)}
          </div>
          <div className={`text-sm ${getGainLossColor(item.gainLossPercentage)}`}>
            {formatPercentage(item.gainLossPercentage)}
          </div>
        </div>
      )
    },
    {
      key: 'goal',
      title: 'Goal',
      sortable: true,
      mobileHidden: true,
      width: '12%',
      render: (_, item) => (
        <div className="min-w-0">
          <span className="text-sm text-gray-900 truncate block">
            {getGoalName(item.investment.goalId)}
          </span>
        </div>
      )
    },
    {
      key: 'account',
      title: 'Account',
      sortable: true,
      mobileHidden: true,
      width: '12%',
      render: (_, item) => (
        <div className="min-w-0">
          <span className="text-sm text-gray-900 truncate block">
            {getAccountName(item.investment.accountId)}
          </span>
        </div>
      )
    },
    {
      key: 'buyDate',
      title: 'Buy Date',
      sortable: true,
      mobileHidden: true,
      width: '11%',
      render: (_, item) => (
        <div className="min-w-0">
          <span className="text-sm text-gray-900">
            {new Date(item.investment.buyDate).toLocaleDateString('en-IN')}
          </span>
        </div>
      )
    }
  ];

  const actions = (item: InvestmentWithCurrentValue) => (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewDetails(item.investment)}
        className="text-xs"
      >
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(item.investment)}
        className="text-xs"
      >
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(item.investment)}
        className="text-xs text-red-600 hover:text-red-700 hover:border-red-300"
      >
        Delete
      </Button>
    </div>
  );

  return (
    <Table
      data={investments}
      columns={columns}
      rowKey={(item) => item.investment.id}
      onSort={onSort}
      sortKey={sortKey}
      sortDirection={sortDirection}
      loading={isLoading}
      emptyMessage="No investments found"
      selectable={showSelection}
      selectedItems={selectedInvestments}
      onSelectionChange={onSelectionChange}
      actions={actions}
      className="mt-4"
    />
  );
};

export default InvestmentTable;