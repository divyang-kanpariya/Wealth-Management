'use client';

import React from 'react';

interface PerformanceDataPoint {
  name: string;
  type: string;
  investedValue: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  riskScore: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  className?: string;
  height?: number;
  showRiskBubbles?: boolean;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  className = '',
  height = 350,
  showRiskBubbles = true
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
          <p className="text-gray-600">No performance data available</p>
        </div>
      </div>
    );
  }

  const width = 700;
  const padding = 80;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Calculate ranges for scaling
  const maxInvested = Math.max(...data.map(d => d.investedValue));
  const minPerformance = Math.min(...data.map(d => d.gainLossPercentage), -10);
  const maxPerformance = Math.max(...data.map(d => d.gainLossPercentage), 10);
  const performanceRange = maxPerformance - minPerformance;

  // Zero line position
  const zeroY = padding + chartHeight - ((-minPerformance) / performanceRange) * chartHeight;

  const getPerformanceColor = (percentage: number) => {
    if (percentage > 10) return '#10B981'; // green-500
    if (percentage > 0) return '#84CC16'; // lime-500
    if (percentage > -10) return '#F59E0B'; // amber-500
    return '#EF4444'; // red-500
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 3) return '#10B981'; // green-500
    if (riskScore <= 6) return '#F59E0B'; // amber-500
    return '#EF4444'; // red-500
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  return (
    <div className={className}>
      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="perfGrid" width="60" height="40" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 40" fill="none" stroke="#F3F4F6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={chartWidth} height={chartHeight} x={padding} y={padding} fill="url(#perfGrid)" />
          
          {/* Zero line */}
          <line
            x1={padding}
            y1={zeroY}
            x2={padding + chartWidth}
            y2={zeroY}
            stroke="#6B7280"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
          
          {/* Performance bars */}
          {data.map((item, index) => {
            const barWidth = chartWidth / data.length * 0.7;
            const barSpacing = chartWidth / data.length * 0.3;
            const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
            
            const performanceHeight = Math.abs(item.gainLossPercentage / performanceRange) * chartHeight;
            const y = item.gainLossPercentage >= 0 
              ? zeroY - performanceHeight 
              : zeroY;
            
            return (
              <g key={index}>
                {/* Performance bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={performanceHeight}
                  fill={getPerformanceColor(item.gainLossPercentage)}
                  rx="3"
                  className="hover:opacity-80 transition-opacity duration-200"
                />
                
                {/* Risk bubble (if enabled) */}
                {showRiskBubbles && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={y - 15}
                    r={Math.max(4, Math.min(12, item.riskScore * 1.2))}
                    fill={getRiskColor(item.riskScore)}
                    opacity="0.7"
                    stroke="white"
                    strokeWidth="2"
                  />
                )}
                
                {/* Investment size indicator (width of bar base) */}
                <rect
                  x={x}
                  y={zeroY + 2}
                  width={barWidth * (item.investedValue / maxInvested)}
                  height="4"
                  fill="#6B7280"
                  opacity="0.5"
                  rx="2"
                />
                
                {/* Tooltip on hover */}
                <g className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <rect
                    x={x - 20}
                    y={y - 80}
                    width={barWidth + 40}
                    height="70"
                    fill="black"
                    fillOpacity="0.9"
                    rx="6"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 60}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {item.name}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={y - 45}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                  >
                    {formatPercentage(item.gainLossPercentage)}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={y - 30}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                  >
                    {formatCurrency(item.gainLoss)}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={y - 15}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                  >
                    Risk: {item.riskScore}/10
                  </text>
                </g>
              </g>
            );
          })}
          
          {/* Y-axis labels (performance) */}
          {[-20, -10, 0, 10, 20, 30].filter(val => val >= minPerformance && val <= maxPerformance).map(value => {
            const y = padding + chartHeight - ((value - minPerformance) / performanceRange) * chartHeight;
            return (
              <g key={value}>
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
                  {value}%
                </text>
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {data.map((item, index) => {
            const barWidth = chartWidth / data.length * 0.7;
            const barSpacing = chartWidth / data.length * 0.3;
            const x = padding + index * (barWidth + barSpacing) + barSpacing / 2 + barWidth / 2;
            
            return (
              <g key={index}>
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
                  fontSize="10"
                  fill="#6B7280"
                  transform={`rotate(-45, ${x}, ${padding + chartHeight + 20})`}
                >
                  {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
                </text>
              </g>
            );
          })}
          
          {/* Axis labels */}
          <text
            x={padding - 50}
            y={padding + chartHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#6B7280"
            transform={`rotate(-90, ${padding - 50}, ${padding + chartHeight / 2})`}
          >
            Performance (%)
          </text>
          
          <text
            x={padding + chartWidth / 2}
            y={padding + chartHeight + 50}
            textAnchor="middle"
            fontSize="12"
            fill="#6B7280"
          >
            Investments
          </text>
        </svg>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center mt-6 space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Excellent (&gt;10%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-lime-500 rounded"></div>
            <span className="text-sm text-gray-600">Good (0-10%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-sm text-gray-600">Poor (-10-0%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">Loss (&lt;-10%)</span>
          </div>
          {showRiskBubbles && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Risk Level (bubble size)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;