'use client'

import React from 'react';
import { SIPWithCurrentValue, SIPStatus } from '@/types';
import Table, { TableColumn } from '../ui/Table';
import DropdownMenu, { DropdownMenuItem } from '../ui/DropdownMenu';

interface SipTableProps {
  sips: SIPWithCurrentValue[];
  onEdit: (sip: SIPWithCurrentValue) => void;
  onDelete: (sipId: string) => void;
  onViewDetails: (sip: SIPWithCurrentValue) => void;
  onStatusChange: (sipId: string, status: SIPStatus) => void;
  isLoading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
}

const SipTable: React.FC<SipTableProps> = ({
  sips,
  onEdit,
  onDelete,
  onViewDetails,
  onStatusChange,
  isLoading = false,
  onSort,
  sortKey,
  sortDirection
}) => {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: SIPStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'MONTHLY':
        return 'Monthly';
      case 'QUARTERLY':
        return 'Quarterly';
      case 'YEARLY':
        return 'Yearly';
      default:
        return frequency;
    }
  };

  const columns: TableColumn<SIPWithCurrentValue>[] = [
    {
      key: 'name',
      title: 'SIP Details',
      sortable: true,
      render: (_, sipWithValue) => (
        <div>
          <div className="font-medium text-gray-900">{sipWithValue.sip.name}</div>
          <div className="text-sm text-gray-500">
            {sipWithValue.sip.symbol} • {getFrequencyText(sipWithValue.sip.frequency)}
          </div>
          {sipWithValue.sip.goal && (
            <div className="text-xs text-blue-600 mt-1">
              Goal: {sipWithValue.sip.goal.name}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      className: 'text-right',
      render: (_, sipWithValue) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">
            {formatCurrency(sipWithValue.sip.amount)}
          </div>
          <div className="text-sm text-gray-500">
            {getFrequencyText(sipWithValue.sip.frequency)}
          </div>
        </div>
      )
    },
    {
      key: 'invested',
      title: 'Invested',
      sortable: true,
      className: 'text-right',
      mobileHidden: true,
      render: (_, sipWithValue) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">
            {formatCurrency(sipWithValue.totalInvested)}
          </div>
          <div className="text-sm text-gray-500">
            {sipWithValue.totalUnits.toFixed(3)} units
          </div>
        </div>
      )
    },
    {
      key: 'currentValue',
      title: 'Current Value',
      sortable: true,
      className: 'text-right',
      render: (_, sipWithValue) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">
            {formatCurrency(sipWithValue.currentValue)}
          </div>
          <div className={`text-sm ${
            sipWithValue.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {sipWithValue.gainLoss >= 0 ? '+' : ''}
            {formatCurrency(sipWithValue.gainLoss)} ({sipWithValue.gainLossPercentage.toFixed(2)}%)
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      className: 'text-center',
      mobileHidden: true,
      render: (_, sipWithValue) => (
        <div className="text-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sipWithValue.sip.status)}`}>
            {sipWithValue.sip.status}
          </span>
        </div>
      )
    },
    {
      key: 'dates',
      title: 'Dates',
      sortable: false,
      mobileHidden: true,
      render: (_, sipWithValue) => (
        <div>
          <div className="text-sm text-gray-900">
            Start: {formatDate(sipWithValue.sip.startDate)}
          </div>
          <div className="text-sm text-gray-500">
            {sipWithValue.nextTransactionDate 
              ? `Next: ${formatDate(sipWithValue.nextTransactionDate)}`
              : sipWithValue.sip.endDate 
                ? `End: ${formatDate(sipWithValue.sip.endDate)}`
                : 'No end date'
            }
          </div>
        </div>
      )
    },
    {
      key: 'account',
      title: 'Account',
      sortable: false,
      className: 'text-center',
      mobileHidden: true,
      render: (_, sipWithValue) => (
        <div className="text-center text-sm text-gray-900">
          {sipWithValue.sip.account?.name || 'Unknown'}
        </div>
      )
    }
  ];

  // Create action items function - stable reference
  const getActionItems = (sipWithValue: SIPWithCurrentValue): DropdownMenuItem[] => {
    const items: DropdownMenuItem[] = [
      {
        id: 'view',
        label: 'View Details',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
        onClick: () => onViewDetails(sipWithValue)
      },
      {
        id: 'edit',
        label: 'Edit SIP',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        onClick: () => onEdit(sipWithValue)
      }
    ];

    // Add status change options
    if (sipWithValue.sip.status === 'ACTIVE') {
      items.push({
        id: 'pause',
        label: 'Pause SIP',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        onClick: () => onStatusChange(sipWithValue.sip.id, 'PAUSED'),
        separator: true
      });
    }

    if (sipWithValue.sip.status === 'PAUSED') {
      items.push({
        id: 'resume',
        label: 'Resume SIP',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V4a2 2 0 00-2-2H5a2 2 0 00-2 2v16l3-2 3 2 3-2 3 2V4z" />
          </svg>
        ),
        onClick: () => onStatusChange(sipWithValue.sip.id, 'ACTIVE'),
        separator: true
      });
    }

    // Add delete option
    items.push({
      id: 'delete',
      label: 'Delete SIP',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: () => onDelete(sipWithValue.sip.id),
      variant: 'danger' as const,
      separator: true
    });

    return items;
  };

  const actions = (sipWithValue: SIPWithCurrentValue) => (
    <DropdownMenu
      items={getActionItems(sipWithValue)}
      size="sm"
      placement="auto"
    />
  );

  return (
    <Table
      data={sips}
      columns={columns}
      rowKey={(sipWithValue) => sipWithValue.sip.id}
      onSort={onSort}
      sortKey={sortKey}
      sortDirection={sortDirection}
      loading={isLoading}
      emptyMessage="No SIPs found"
      actions={actions}
      className="mt-4"
    />
  );
};

export default SipTable;