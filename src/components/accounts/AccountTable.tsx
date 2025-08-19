import React from 'react';
import { Account } from '@/types';
import Table, { TableColumn } from '../ui/Table';
import DropdownMenu, { DropdownMenuItem } from '../ui/DropdownMenu';

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

  // Create action items function - stable reference
  const getActionItems = (account: AccountWithTotals): DropdownMenuItem[] => [
    {
      id: 'view',
      label: 'View Details',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      onClick: () => onViewDetails(account)
    },
    {
      id: 'edit',
      label: 'Edit Account',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: () => onEdit(account)
    },
    {
      id: 'delete',
      label: 'Delete Account',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: () => onDelete(account),
      variant: 'danger' as const,
      disabled: account.investmentCount > 0,
      separator: true
    }
  ];

  const actions = (account: AccountWithTotals) => (
    <DropdownMenu
      items={getActionItems(account)}
      size="sm"
      placement="auto"
    />
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