'use client';

import React from 'react';

interface RiskDataPoint {
  label: string;
  riskScore: number;
  allocation: number;
  value: number;
}

interface RiskChartProps {
  data: RiskDataPoint[];
  overallRiskScore: number;
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  diversificationScore: number;
  className?: string;
  height?: number;
}

const RiskChart: React.FC<RiskChartProps> = ({
  data,
  overallRiskScore,
  riskLevel,
  diversificationScore,
  className = '',
  height = 300
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center h-48 bg-gray-50 rounded-lg`}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-gray-600">No risk data available</p>
        </div>
      </div>
    );
  }

  const width = 600;
  const padding = 60;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Sort data by risk score for better visualization
  const sortedData = [...data].sort((a, b) => a.riskScore - b.riskScore);
  
  const maxAllocation = Math.max(...sortedData.map(d => d.allocation));
  const maxRiskScore = 10; // Risk scores are 1-10

  // Calculate bar positions
  const barWidth = chartWidth / sortedData.length * 0.8;
  const barSpacing = chartWidth / sortedData.length * 0.2;

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 3) return '#10B981'; // green-500
    if (riskScore <= 6) return '#F59E0B'; // amber-500
    return '#EF4444'; // red-500
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CONSERVATIVE': return '#10B981';
      case 'MODERATE': return '#F59E0B';
      case 'AGGRESSIVE': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Overall Risk Score */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div 
            className="text-3xl font-bold mb-2"
            style={{ color: getRiskLevelColor(riskLevel) }}
          >
            {overallRiskScore.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 mb-2">Overall Risk Score</div>
          <div 
            className="inline-block px-3 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${getRiskLevelColor(riskLevel)}20`,
              color: getRiskLevelColor(riskLevel)
            }}
          >
            {riskLevel}
          </div>
        </div>

        {/* Diversification Score */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div 
            className="text-3xl font-bold mb-2"
            style={{ 
              color: diversificationScore >= 70 ? '#10B981' : 
                     diversificationScore >= 40 ? '#F59E0B' : '#EF4444'
            }}
          >
            {diversificationScore.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 mb-2">Diversification</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${diversificationScore}%`,
                backgroundColor: diversificationScore >= 70 ? '#10B981' : 
                                diversificationScore >= 40 ? '#F59E0B' : '#EF4444'
              }}
            />
          </div>
        </div>

        {/* Asset Types */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold mb-2 text-blue-600">
            {data.length}
          </div>
          <div className="text-sm text-gray-600">Asset Types</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.length >= 5 ? 'Well Diversified' : 
             data.length >= 3 ? 'Moderately Diversified' : 'Limited Diversification'}
          </div>
        </div>
      </div>

      {/* Risk vs Allocation Chart */}
      <div className="relative">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Risk vs Allocation Analysis</h4>
        
        <svg width={width} height={height} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="riskGrid" width="50" height="30" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 30" fill="none" stroke="#F3F4F6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={chartWidth} height={chartHeight} x={padding} y={padding} fill="url(#riskGrid)" />
          
          {/* Risk score bars (background) */}
          {sortedData.map((item, index) => {
            const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
            const riskHeight = (item.riskScore / maxRiskScore) * chartHeight;
            const y = padding + chartHeight - riskHeight;
            
            return (
              <rect
                key={`risk-${index}`}
                x={x}
                y={y}
                width={barWidth}
                height={riskHeight}
                fill={getRiskColor(item.riskScore)}
                opacity="0.3"
                rx="2"
              />
            );
          })}
          
          {/* Allocation bars (foreground) */}
          {sortedData.map((item, index) => {
            const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
            const allocationHeight = (item.allocation / maxAllocation) * chartHeight;
            const y = padding + chartHeight - allocationHeight;
            
            return (
              <g key={`allocation-${index}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={allocationHeight}
                  fill={getRiskColor(item.riskScore)}
                  rx="2"
                  className="hover:opacity-80 transition-opacity duration-200"
                />
                
                {/* Value label on hover */}
                <g className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <rect
                    x={x - 10}
                    y={y - 45}
                    width={barWidth + 20}
                    height="35"
                    fill="black"
                    fillOpacity="0.8"
                    rx="4"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 30}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                  >
                    {item.allocation.toFixed(1)}%
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={y - 15}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                  >
                    {formatCurrency(item.value)}
                  </text>
                </g>
              </g>
            );
          })}
          
          {/* Y-axis labels (left - allocation) */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const value = ratio * maxAllocation;
            const y = padding + chartHeight - ratio * chartHeight;
            return (
              <g key={`alloc-${ratio}`}>
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
                  {value.toFixed(0)}%
                </text>
              </g>
            );
          })}
          
          {/* Y-axis labels (right - risk score) */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const value = ratio * maxRiskScore;
            const y = padding + chartHeight - ratio * chartHeight;
            return (
              <g key={`risk-${ratio}`}>
                <line
                  x1={padding + chartWidth}
                  y1={y}
                  x2={padding + chartWidth + 5}
                  y2={y}
                  stroke="#6B7280"
                  strokeWidth="1"
                />
                <text
                  x={padding + chartWidth + 10}
                  y={y + 4}
                  textAnchor="start"
                  fontSize="11"
                  fill="#6B7280"
                >
                  {value.toFixed(0)}
                </text>
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {sortedData.map((item, index) => {
            const x = padding + index * (barWidth + barSpacing) + barSpacing / 2 + barWidth / 2;
            return (
              <g key={`label-${index}`}>
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
                  {item.label.replace('_', ' ')}
                </text>
              </g>
            );
          })}
          
          {/* Axis labels */}
          <text
            x={padding - 35}
            y={padding + chartHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#6B7280"
            transform={`rotate(-90, ${padding - 35}, ${padding + chartHeight / 2})`}
          >
            Allocation (%)
          </text>
          
          <text
            x={padding + chartWidth + 35}
            y={padding + chartHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#6B7280"
            transform={`rotate(90, ${padding + chartWidth + 35}, ${padding + chartHeight / 2})`}
          >
            Risk Score (1-10)
          </text>
        </svg>
        
        {/* Legend */}
        <div className="flex items-center justify-center mt-6 space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Low Risk (1-3)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-sm text-gray-600">Medium Risk (4-6)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">High Risk (7-10)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskChart;