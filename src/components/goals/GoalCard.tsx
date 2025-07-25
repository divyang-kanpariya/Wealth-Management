import React from 'react';
import { Goal } from '@/types';
import Button from '../ui/Button';
import GoalProgress from './GoalProgress';

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  isLoading?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false,
}) => {
  // Calculate days remaining until target date
  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate years and months remaining for display
  const yearsRemaining = Math.floor(daysRemaining / 365);
  const monthsRemaining = Math.floor((daysRemaining % 365) / 30);
  
  // Format target date
  const targetDate = new Date(goal.targetDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  // Calculate current progress (this would normally come from the sum of linked investments)
  // For now, we'll use a placeholder calculation
  const currentAmount = goal.investments?.reduce((sum, investment) => {
    // If the investment has a current value, use that, otherwise calculate from units and price
    if (investment.totalValue) {
      return sum + investment.totalValue;
    } else if (investment.units && investment.buyPrice) {
      return sum + (investment.units * investment.buyPrice);
    }
    return sum;
  }, 0) || 0;
  
  const progressPercentage = Math.min(Math.round((currentAmount / goal.targetAmount) * 100), 100);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Priority indicator
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return { label: 'Highest', color: 'bg-red-100 text-red-800' };
      case 2: return { label: 'High', color: 'bg-orange-100 text-orange-800' };
      case 3: return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
      case 4: return { label: 'Low', color: 'bg-blue-100 text-blue-800' };
      case 5: return { label: 'Lowest', color: 'bg-green-100 text-green-800' };
      default: return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    }
  };
  
  const priorityInfo = getPriorityLabel(goal.priority || 3);
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{goal.name}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${priorityInfo.color}`}>
            {priorityInfo.label}
          </span>
        </div>
        
        <div className="mt-4">
          <GoalProgress 
            currentAmount={currentAmount} 
            targetAmount={goal.targetAmount} 
            percentage={progressPercentage} 
          />
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Current</span>
            <span className="font-medium">{formatCurrency(currentAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Target</span>
            <span className="font-medium">{formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Target Date</span>
            <span className="font-medium">{targetDate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Time Remaining</span>
            <span className="font-medium">
              {daysRemaining <= 0 ? (
                <span className="text-red-600">Overdue</span>
              ) : (
                <>
                  {yearsRemaining > 0 && `${yearsRemaining}y `}
                  {monthsRemaining > 0 && `${monthsRemaining}m`}
                  {yearsRemaining === 0 && monthsRemaining === 0 && `${daysRemaining}d`}
                </>
              )}
            </span>
          </div>
          {goal.investments && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Linked Investments</span>
              <span className="font-medium">{goal.investments.length}</span>
            </div>
          )}
        </div>
        
        {goal.description && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600 line-clamp-2">{goal.description}</p>
          </div>
        )}
      </div>
      
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
        <Button
          variant="text"
          size="sm"
          onClick={onViewDetails}
          disabled={isLoading}
        >
          View Details
        </Button>
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
            className="text-red-600 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GoalCard;