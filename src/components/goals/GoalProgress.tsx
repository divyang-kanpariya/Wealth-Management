import React from 'react';

interface GoalProgressProps {
  currentAmount: number;
  targetAmount: number;
  percentage: number;
  className?: string;
}

const GoalProgress: React.FC<GoalProgressProps> = ({
  currentAmount,
  targetAmount,
  percentage,
  className = '',
}) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Determine progress color based on percentage
  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 75) return 'bg-emerald-500';
    if (percent >= 50) return 'bg-blue-500';
    if (percent >= 25) return 'bg-amber-500';
    return 'bg-red-500';
  };
  
  const progressColor = getProgressColor(percentage);
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{formatCurrency(currentAmount)}</span>
        <span className="text-gray-500">{percentage}%</span>
        <span className="font-medium">{formatCurrency(targetAmount)}</span>
      </div>
      
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${progressColor} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>Current</span>
        <span>Target</span>
      </div>
    </div>
  );
};

export default GoalProgress;