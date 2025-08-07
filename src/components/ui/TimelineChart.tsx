'use client';

import React from 'react';

interface TimelineDataPoint {
  date: Date;
  value: number;
  label?: string;
}

interface TimelineChartProps {
  data: TimelineDataPoint[];
  targetValue?: number;
  title?: string;
  className?: string;
  height?: number;
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  data,
  targetValue,
  title,
  className = '',
  height = 200
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center h-48 bg-gray-50 rounded-lg`}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-600">No timeline data available</p>
        </div>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  const minValue = Math.min(...sortedData.map(d => d.value), 0);
  const maxValue = Math.max(...sortedData.map(d => d.value), targetValue || 0);
  const valueRange = maxValue - minValue || 1;
  
  const minDate = sortedData[0].date.getTime();
  const maxDate = sortedData[sortedData.length - 1].date.getTime();
  const dateRange = maxDate - minDate || 1;

  const width = 600;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Generate path for the line
  const pathData = sortedData.map((point, index) => {
    const x = padding + ((point.date.getTime() - minDate) / dateRange) * chartWidth;
    const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate area path (filled area under the line)
  const areaData = [
    `M ${padding} ${padding + chartHeight}`,
    ...sortedData.map(point => {
      const x = padding + ((point.date.getTime() - minDate) / dateRange) * chartWidth;
      const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return `L ${x} ${y}`;
    }),
    `L ${padding + chartWidth} ${padding + chartHeight}`,
    'Z'
  ].join(' ');

  // Target line if provided
  const targetY = targetValue 
    ? padding + chartHeight - ((targetValue - minValue) / valueRange) * chartHeight
    : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      
      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 40" fill="none" stroke="#F3F4F6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={chartWidth} height={chartHeight} x={padding} y={padding} fill="url(#grid)" />
          
          {/* Area under the curve */}
          <path
            d={areaData}
            fill="url(#gradient)"
            opacity="0.3"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Main line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Target line */}
          {targetY && (
            <line
              x1={padding}
              y1={targetY}
              x2={padding + chartWidth}
              y2={targetY}
              stroke="#10B981"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
          
          {/* Data points */}
          {sortedData.map((point, index) => {
            const x = padding + ((point.date.getTime() - minDate) / dateRange) * chartWidth;
            const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
            
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#3B82F6"
                  stroke="white"
                  strokeWidth="2"
                  className="hover:r-6 transition-all duration-200"
                />
                {/* Tooltip on hover */}
                <g className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <rect
                    x={x - 40}
                    y={y - 35}
                    width="80"
                    height="25"
                    fill="black"
                    fillOpacity="0.8"
                    rx="4"
                  />
                  <text
                    x={x}
                    y={y - 20}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                  >
                    {formatCurrency(point.value)}
                  </text>
                </g>
              </g>
            );
          })}
          
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const value = minValue + ratio * valueRange;
            const y = padding + chartHeight - ratio * chartHeight;
            return (
              <g key={ratio}>
                <line
                  x1={padding - 5}
                  y1={y}
                  x2={padding}
                  y2={y}
                  stroke="#6B7280"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6B7280"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {sortedData.length > 1 && [0, 0.5, 1].map(ratio => {
            const dateTime = minDate + ratio * dateRange;
            const x = padding + ratio * chartWidth;
            const date = new Date(dateTime);
            return (
              <g key={ratio}>
                <line
                  x1={x}
                  y1={padding + chartHeight}
                  x2={x}
                  y2={padding + chartHeight + 5}
                  stroke="#6B7280"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={padding + chartHeight + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6B7280"
                >
                  {formatDate(date)}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="flex items-center justify-center mt-4 space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span className="text-sm text-gray-600">Progress</span>
          </div>
          {targetValue && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-green-500 border-dashed border-t"></div>
              <span className="text-sm text-gray-600">Target ({formatCurrency(targetValue)})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineChart;