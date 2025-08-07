'use client';

import React from 'react';

interface ProgressChartProps {
  currentAmount: number;
  targetAmount: number;
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ProgressChart: React.FC<ProgressChartProps> = ({
  currentAmount,
  targetAmount,
  className = '',
  showLabels = true,
  size = 'md'
}) => {
  const percentage = Math.min((currentAmount / targetAmount) * 100, 100);
  const radius = size === 'sm' ? 40 : size === 'md' ? 60 : 80;
  const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 8 : 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#10B981'; // green-500
    if (percentage >= 75) return '#3B82F6'; // blue-500
    if (percentage >= 50) return '#F59E0B'; // amber-500
    if (percentage >= 25) return '#EF4444'; // red-500
    return '#6B7280'; // gray-500
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            stroke="#E5E7EB"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            stroke={getProgressColor(percentage)}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-bold text-gray-900 ${
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl'
          }`}>
            {Math.round(percentage)}%
          </div>
          {showLabels && size !== 'sm' && (
            <div className={`text-gray-500 ${
              size === 'md' ? 'text-xs' : 'text-sm'
            }`}>
              Complete
            </div>
          )}
        </div>
      </div>
      
      {showLabels && (
        <div className="ml-6 space-y-1">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Current:</span> {formatCurrency(currentAmount)}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Target:</span> {formatCurrency(targetAmount)}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Remaining:</span> {formatCurrency(Math.max(0, targetAmount - currentAmount))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressChart;