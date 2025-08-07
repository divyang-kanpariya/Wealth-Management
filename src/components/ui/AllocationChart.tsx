'use client';

import React from 'react';

interface AllocationItem {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

interface AllocationChartProps {
  data: AllocationItem[];
  title?: string;
  className?: string;
  showLegend?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const AllocationChart: React.FC<AllocationChartProps> = ({
  data,
  title,
  className = '',
  showLegend = true,
  size = 'md'
}) => {
  const radius = size === 'sm' ? 50 : size === 'md' ? 70 : 90;
  const strokeWidth = size === 'sm' ? 20 : size === 'md' ? 25 : 30;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // Default colors for different segments
  const defaultColors = [
    '#3B82F6', // blue-500
    '#10B981', // green-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#F97316', // orange-500
    '#06B6D4', // cyan-500
    '#84CC16', // lime-500
    '#EC4899', // pink-500
    '#6B7280', // gray-500
  ];

  // Assign colors to data items
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || defaultColors[index % defaultColors.length]
  }));

  // Calculate cumulative percentages for positioning
  let cumulativePercentage = 0;
  const segments = dataWithColors.map(item => {
    const startPercentage = cumulativePercentage;
    cumulativePercentage += item.percentage;
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((startPercentage / 100) * circumference);
    
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={`${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              stroke="#F3F4F6"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            
            {/* Allocation segments */}
            {segments.map((segment, index) => (
              <circle
                key={index}
                stroke={segment.color}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={segment.strokeDasharray}
                style={{ strokeDashoffset: segment.strokeDashoffset }}
                strokeLinecap="butt"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-500 ease-in-out"
              />
            ))}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`font-bold text-gray-900 ${
              size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl'
            }`}>
              {formatCurrency(totalValue)}
            </div>
            {size !== 'sm' && (
              <div className={`text-gray-500 ${
                size === 'md' ? 'text-xs' : 'text-sm'
              }`}>
                Total
              </div>
            )}
          </div>
        </div>
        
        {showLegend && (
          <div className="ml-6 space-y-2">
            {dataWithColors.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-gray-500">
                    {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllocationChart;