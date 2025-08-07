'use client';

import React from 'react';

interface TrendDataPoint {
  date: Date;
  value: number;
  invested: number;
  milestone?: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  targetValue?: number;
  title?: string;
  className?: string;
  height?: number;
  showProjection?: boolean;
  projectedCompletionDate?: Date | null;
}

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  targetValue,
  title,
  className = '',
  height = 250,
  showProjection = false,
  projectedCompletionDate
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center h-48 bg-gray-50 rounded-lg`}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-gray-600">No trend data available</p>
        </div>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Add projection data if enabled
  let allData = [...sortedData];
  if (showProjection && projectedCompletionDate && targetValue) {
    const lastPoint = sortedData[sortedData.length - 1];
    if (lastPoint && projectedCompletionDate > lastPoint.date) {
      allData.push({
        date: projectedCompletionDate,
        value: targetValue,
        invested: lastPoint.invested + (targetValue - lastPoint.value),
        milestone: 'Projected Completion'
      });
    }
  }

  const minValue = Math.min(...allData.map(d => Math.min(d.value, d.invested)), 0);
  const maxValue = Math.max(...allData.map(d => Math.max(d.value, d.invested)), targetValue || 0);
  const valueRange = maxValue - minValue || 1;
  
  const minDate = allData[0].date.getTime();
  const maxDate = allData[allData.length - 1].date.getTime();
  const dateRange = maxDate - minDate || 1;

  const width = 700;
  const padding = 50;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Generate paths for both lines
  const valuePath = allData.map((point, index) => {
    const x = padding + ((point.date.getTime() - minDate) / dateRange) * chartWidth;
    const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const investedPath = sortedData.map((point, index) => {
    const x = padding + ((point.date.getTime() - minDate) / dateRange) * chartWidth;
    const y = padding + chartHeight - ((point.invested - minValue) / valueRange) * chartHeight;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Projection path (dashed)
  const projectionStartIndex = sortedData.length - 1;
  const projectionPath = showProjection && projectedCompletionDate ? 
    allData.slice(projectionStartIndex).map((point, index) => {
      const x = padding + ((point.date.getTime() - minDate) / dateRange) * chartWidth;
      const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') : '';

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
            <pattern id="trendGrid" width="60" height="50" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 50" fill="none" stroke="#F3F4F6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={chartWidth} height={chartHeight} x={padding} y={padding} fill="url(#trendGrid)" />
          
          {/* Area between invested and current value */}
          <defs>
            <linearGradient id="gainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.1"/>
            </linearGradient>
            <linearGradient id="lossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Target line */}
          {targetY && (
            <line
              x1={padding}
              y1={targetY}
              x2={padding + chartWidth}
              y2={targetY}
              stroke="#10B981"
              strokeWidth="2"
              strokeDasharray="8,4"
            />
          )}
          
          {/* Invested amount line */}
          <path
            d={investedPath}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Current value line */}
          <path
            d={valuePath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Projection line */}
          {projectionPath && (
            <path
              d={projectionPath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="6,3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
            />
          )}
          
          {/* Data points for actual data */}
          {sortedData.map((point, index) => {
            const x = padding + ((point.date.getTime() - minDate) / dateRange) * chartWidth;
            const valueY = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
            const investedY = padding + chartHeight - ((point.invested - minValue) / valueRange) * chartHeight;
            
            return (
              <g key={index}>
                {/* Invested point */}
                <circle
                  cx={x}
                  cy={investedY}
                  r="3"
                  fill="#F59E0B"
                  stroke="white"
                  strokeWidth="2"
                />
                {/* Current value point */}
                <circle
                  cx={x}
                  cy={valueY}
                  r="4"
                  fill="#3B82F6"
                  stroke="white"
                  strokeWidth="2"
                  className="hover:r-6 transition-all duration-200"
                />
                
                {/* Milestone marker */}
                {point.milestone && (
                  <g>
                    <circle
                      cx={x}
                      cy={valueY - 15}
                      r="6"
                      fill="#10B981"
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={valueY - 25}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#10B981"
                      fontWeight="bold"
                    >
                      M
                    </text>
                  </g>
                )}
                
                {/* Tooltip on hover */}
                <g className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <rect
                    x={x - 50}
                    y={valueY - 55}
                    width="100"
                    height="40"
                    fill="black"
                    fillOpacity="0.8"
                    rx="4"
                  />
                  <text
                    x={x}
                    y={valueY - 40}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                  >
                    {formatDate(point.date)}
                  </text>
                  <text
                    x={x}
                    y={valueY - 25}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                  >
                    {formatCurrency(point.value)}
                  </text>
                </g>
              </g>
            );
          })}
          
          {/* Projection point */}
          {showProjection && projectedCompletionDate && targetValue && (
            <g>
              <circle
                cx={padding + chartWidth}
                cy={targetY || 0}
                r="4"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="3,2"
                opacity="0.7"
              />
            </g>
          )}
          
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
                  fontSize="11"
                  fill="#6B7280"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {allData.length > 1 && [0, 0.33, 0.66, 1].map(ratio => {
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
                  fontSize="11"
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
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span className="text-sm text-gray-600">Current Value</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-amber-500"></div>
            <span className="text-sm text-gray-600">Invested Amount</span>
          </div>
          {targetValue && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-green-500 border-dashed border-t-2"></div>
              <span className="text-sm text-gray-600">Target ({formatCurrency(targetValue)})</span>
            </div>
          )}
          {showProjection && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-blue-400 border-dashed border-t-2"></div>
              <span className="text-sm text-gray-600">Projection</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendChart;