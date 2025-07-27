import React from 'react';
import { Goal } from '@/types';
import Table, { TableColumn } from '../ui/Table';
import Button from '../ui/Button';

interface GoalTableProps {
  goals: Goal[];
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onViewDetails: (goal: Goal) => void;
  isLoading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
}

const GoalTable: React.FC<GoalTableProps> = ({
  goals,
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

  const calculateProgress = (goal: Goal) => {
    if (!goal.investments || goal.investments.length === 0) {
      return { currentValue: 0, progress: 0, remainingAmount: goal.targetAmount };
    }

    const currentValue = goal.investments.reduce((sum, investment) => {
      if (investment.units && investment.buyPrice) {
        return sum + (investment.units * investment.buyPrice);
      } else if (investment.totalValue) {
        return sum + investment.totalValue;
      }
      return sum;
    }, 0);

    const progress = (currentValue / goal.targetAmount) * 100;
    const remainingAmount = Math.max(0, goal.targetAmount - currentValue);

    return { currentValue, progress, remainingAmount };
  };

  const getDaysRemaining = (targetDate: Date) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const columns: TableColumn<Goal>[] = [
    {
      key: 'name',
      title: 'Goal',
      sortable: true,
      render: (_, goal) => (
        <div>
          <div className="font-medium text-gray-900">{goal.name}</div>
          {goal.description && (
            <div className="text-sm text-gray-500 truncate max-w-xs">
              {goal.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'progress',
      title: 'Progress',
      sortable: true,
      render: (_, goal) => {
        const { currentValue, progress } = calculateProgress(goal);
        return (
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 min-w-12">
                {progress.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {formatCurrency(currentValue)} of {formatCurrency(goal.targetAmount)}
            </div>
          </div>
        );
      }
    },
    {
      key: 'targetAmount',
      title: 'Target Amount',
      sortable: true,
      className: 'text-right',
      render: (value) => (
        <div className="text-right font-medium text-gray-900">
          {formatCurrency(value)}
        </div>
      )
    },
    {
      key: 'remaining',
      title: 'Remaining',
      sortable: false,
      className: 'text-right',
      mobileHidden: true,
      render: (_, goal) => {
        const { remainingAmount } = calculateProgress(goal);
        return (
          <div className="text-right text-gray-900">
            {formatCurrency(remainingAmount)}
          </div>
        );
      }
    },
    {
      key: 'targetDate',
      title: 'Target Date',
      sortable: true,
      mobileHidden: true,
      render: (value) => {
        const daysRemaining = getDaysRemaining(value);
        const isOverdue = daysRemaining < 0;
        const isUrgent = daysRemaining <= 30 && daysRemaining >= 0;
        
        return (
          <div>
            <div className="text-sm text-gray-900">
              {new Date(value).toLocaleDateString('en-IN')}
            </div>
            <div className={`text-xs ${
              isOverdue ? 'text-red-600' : 
              isUrgent ? 'text-orange-600' : 
              'text-gray-500'
            }`}>
              {isOverdue 
                ? `${Math.abs(daysRemaining)} days overdue`
                : `${daysRemaining} days left`
              }
            </div>
          </div>
        );
      }
    },
    {
      key: 'investments',
      title: 'Investments',
      sortable: false,
      className: 'text-center',
      mobileHidden: true,
      render: (_, goal) => (
        <div className="text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {goal.investments?.length || 0}
          </span>
        </div>
      )
    },
    {
      key: 'priority',
      title: 'Priority',
      sortable: true,
      className: 'text-center',
      mobileHidden: true,
      render: (value) => {
        const priority = value || 1;
        const priorityColors = {
          1: 'bg-red-100 text-red-800',
          2: 'bg-orange-100 text-orange-800',
          3: 'bg-yellow-100 text-yellow-800',
          4: 'bg-green-100 text-green-800',
          5: 'bg-gray-100 text-gray-800'
        };
        const priorityLabels = {
          1: 'High',
          2: 'Medium-High',
          3: 'Medium',
          4: 'Medium-Low',
          5: 'Low'
        };
        
        return (
          <div className="text-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              priorityColors[priority as keyof typeof priorityColors] || priorityColors[3]
            }`}>
              {priorityLabels[priority as keyof typeof priorityLabels] || 'Medium'}
            </span>
          </div>
        );
      }
    }
  ];

  const actions = (goal: Goal) => (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewDetails(goal)}
        className="text-xs"
      >
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(goal)}
        className="text-xs"
      >
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(goal)}
        className="text-xs text-red-600 hover:text-red-700 hover:border-red-300"
      >
        Delete
      </Button>
    </div>
  );

  return (
    <Table
      data={goals}
      columns={columns}
      rowKey={(goal) => goal.id}
      onSort={onSort}
      sortKey={sortKey}
      sortDirection={sortDirection}
      loading={isLoading}
      emptyMessage="No goals found"
      actions={actions}
      className="mt-4"
    />
  );
};

export default GoalTable;