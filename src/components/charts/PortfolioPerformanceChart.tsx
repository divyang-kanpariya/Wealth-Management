'use client'

import React, { useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import ChartContainer from './ChartContainer'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface PerformanceDataPoint {
  date: string
  totalValue: number
  totalInvested: number
  gainLoss: number
}

interface PortfolioPerformanceChartProps {
  performanceData: {
    '1M': PerformanceDataPoint[]
    '3M': PerformanceDataPoint[]
    '6M': PerformanceDataPoint[]
    '1Y': PerformanceDataPoint[]
    'ALL': PerformanceDataPoint[]
  }
  className?: string
  height?: string
}

export default function PortfolioPerformanceChart({
  performanceData,
  className,
  height = '400px'
}: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get data for the selected time range
  const historicalData = performanceData[timeRange] || []

  const data = {
    labels: historicalData.map(point => {
      const date = new Date(point.date)
      return date.toLocaleDateString('en-IN', { 
        month: 'short', 
        year: timeRange === '1M' ? undefined : '2-digit' 
      })
    }),
    datasets: [
      {
        label: 'Portfolio Value',
        data: historicalData.map(point => point.totalValue),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      },
      {
        label: 'Total Invested',
        data: historicalData.map(point => point.totalInvested),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderDash: [5, 5]
      }
    ]
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${formatCurrency(value)}`
          },
          afterBody: function(tooltipItems) {
            if (tooltipItems.length > 0) {
              const index = tooltipItems[0].dataIndex
              const point = historicalData[index]
              if (point) {
                const percentage = point.totalInvested > 0 
                  ? ((point.gainLoss / point.totalInvested) * 100).toFixed(2)
                  : '0.00'
                return [
                  `Gain/Loss: ${formatCurrency(point.gainLoss)}`,
                  `Return: ${point.gainLoss >= 0 ? '+' : ''}${percentage}%`
                ]
              }
            }
            return []
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return formatCurrency(value as number)
          },
          font: {
            size: 11
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  }

  const timeRangeButtons = [
    { key: '1M' as const, label: '1M' },
    { key: '3M' as const, label: '3M' },
    { key: '6M' as const, label: '6M' },
    { key: '1Y' as const, label: '1Y' },
    { key: 'ALL' as const, label: 'ALL' }
  ]

  const actions = (
    <div className="flex space-x-1">
      {timeRangeButtons.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setTimeRange(key)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            timeRange === key
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )

  if (historicalData.length === 0) {
    return (
      <ChartContainer
        title="Portfolio Performance"
        className={className}
        height={height}
        actions={actions}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p className="text-sm">No performance data available</p>
          </div>
        </div>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer
      title="Portfolio Performance"
      className={className}
      height={height}
      actions={actions}
    >
      <Line data={data} options={options} />
    </ChartContainer>
  )
}