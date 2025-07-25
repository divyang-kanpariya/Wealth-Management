import React from 'react';
import { Account } from '@/types';
import Button from '../ui/Button';

interface AccountCardProps {
  account: Account;
  totalValue: number;
  investmentCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  isLoading?: boolean;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  totalValue,
  investmentCount,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false,
}) => {
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

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {account.name}
          </h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(account.type)}`}>
            {getAccountTypeLabel(account.type)}
          </span>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={isLoading}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700 hover:border-red-300"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Investment Summary */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Value:</span>
          <span className="text-lg font-semibold text-gray-900">
            ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Investments:</span>
          <span className="text-sm font-medium text-gray-700">
            {investmentCount} investment{investmentCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Notes */}
      {account.notes && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-2">
            {account.notes}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetails}
          disabled={isLoading}
          className="w-full"
        >
          View Details
        </Button>
      </div>

      {/* Created Date */}
      <div className="mt-3 text-xs text-gray-500">
        Created {new Date(account.createdAt).toLocaleDateString('en-IN')}
      </div>
    </div>
  );
};

export default AccountCard;