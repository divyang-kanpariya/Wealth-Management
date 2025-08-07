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

interface TrendDataPoint {
  date: string
  value: number
  label?: string
}

interface TrendChartProps {
  data: TrendDataPoint[]
  title: string
  className?: string
  height?: string
  color?: string
  fillArea?: boolean
  showPoints?: boolean
  currency?: boolean
}

export default function TrendChart({
  data,
  title,
  className,
  height = '300px',
  color = '#3B82F6',
  fillArea = true,
  showPoints = true,
  currency = true
}: TrendChartProps) {
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M')

  const formatValue = (value: number) => {
    if (currency) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    }
    return value.toLocaleString()
  }

  // Filter data based on time range
  const filterDataByTimeRange = (data: TrendDataPoint[]) => {
    if (timeRange === 'ALL' || data.length === 0) return data

    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case '1M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case '3M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case '6M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        break
      case '1Y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      default:
        return data
    }

    return data.filter(point => new Date(point.date) >= startDate)
  }

  const filteredData = filterDataByTimeRange(data)

  const chartData = {
    labels: filteredData.map(point => {
      const date = new Date(point.date)
      return date.toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric',
        year: timeRange === '1M' ? undefined : '2-digit' 
      })
    }),
    datasets: [
      {
        label: title,
        data: filteredData.map(point => point.value),
        borderColor: color,
        backgroundColor: fillArea ? color + '20' : 'transparent',
        borderWidth: 2,
        fill: fillArea,
        tension: 0.4,
        pointRadius: showPoints ? 3 : 0,
        pointHoverRadius: showPoints ? 5 : 0,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
      }
    ]
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
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
            const value = context.parsed.y
            const point = filteredData[context.dataIndex]
            return [
              `${title}: ${formatValue(value)}`,
              ...(point.label ? [point.label] : [])
            ]
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
          },
          maxTicksLimit: 8
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return formatValue(value as number)
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
    },
    elements: {
      point: {
        hoverRadius: 8
      }
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

  if (data.length === 0) {
    return (
      <ChartContainer
        title={title}
        className={className}
        height={height}
        actions={actions}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p className="text-sm">No trend data available</p>
          </div>
        </div>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer
      title={title}
      className={className}
      height={height}
      actions={actions}
    >
      <Line data={chartData} options={options} />
    </ChartContainer>
  )
}