import React from 'react';
import { Account } from '@/types';
import Table, { TableColumn } from '../ui/Table';
import Button from '../ui/Button';

interface AccountWithTotals extends Account {
  totalValue: number;
  investmentCount: number;
}

interface AccountTableProps {
  accounts: AccountWithTotals[];
  onEdit: (account: AccountWithTotals) => void;
  onDelete: (account: AccountWithTotals) => void;
  onViewDetails: (account: AccountWithTotals) => void;
  isLoading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
}

const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false,
  onSort,
  sortKey,
  sortDirection
}) => {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'BROKER':
        return 'bg-blue-100 text-blue-800';
      case 'DEMAT':
        return 'bg-green-100 text-green-800';
      case 'BANK':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'BROKER':
        return 'Broker';
      case 'DEMAT':
        return 'Demat';
      case 'BANK':
        return 'Bank';
      default:
        return 'Other';
    }
  };

  const columns: TableColumn<AccountWithTotals>[] = [
    {
      key: 'name',
      title: 'Account Name',
      sortable: true,
      render: (_, account) => (
        <div>
          <div className="font-medium text-gray-900">{account.name}</div>
          {account.notes && (
            <div className="text-sm text-gray-500 truncate max-w-xs">
              {account.notes}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'type',
      title: 'Type',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(value)}`}>
          {getAccountTypeLabel(value)}
        </span>
      )
    },
    {
      key: 'totalValue',
      title: 'Total Value',
      sortable: true,
      className: 'text-right',
      render: (value) => (
        <div className="text-right font-medium text-gray-900">
          {formatCurrency(value)}
        </div>
      )
    },
    {
      key: 'investmentCount',
      title: 'Investments',
      sortable: true,
      className: 'text-center',
      render: (value) => (
        <div className="text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {value}
          </span>
        </div>
      )
    },
    {
      key: 'averageInvestment',
      title: 'Avg Investment',
      sortable: false,
      className: 'text-right',
      mobileHidden: true,
      render: (_, account) => {
        const average = account.investmentCount > 0 
          ? account.totalValue / account.investmentCount 
          : 0;
        return (
          <div className="text-right text-gray-900">
            {formatCurrency(average)}
          </div>
        );
      }
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      mobileHidden: true,
      render: (value) => (
        <div className="text-sm text-gray-900">
          {new Date(value).toLocaleDateString('en-IN')}
        </div>
      )
    }
  ];

  const actions = (account: AccountWithTotals) => (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewDetails(account)}
        className="text-xs"
      >
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(account)}
        className="text-xs"
      >
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(account)}
        className={`text-xs ${
          account.investmentCount > 0
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-red-600 hover:text-red-700 hover:border-red-300'
        }`}
        disabled={account.investmentCount > 0}
        title={account.investmentCount > 0 ? 'Cannot delete account with linked investments' : 'Delete account'}
      >
        Delete
      </Button>
    </div>
  );

  return (
    <Table
      data={accounts}
      columns={columns}
      rowKey={(account) => account.id}
      onSort={onSort}
      sortKey={sortKey}
      sortDirection={sortDirection}
      loading={isLoading}
      emptyMessage="No accounts found"
      actions={actions}
      className="mt-4"
    />
  );
};

export default AccountTable;