'use client'

import React from 'react'
import { Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { PortfolioSummary } from '@/types'
import ChartContainer from './ChartContainer'

ChartJS.register(ArcElement, Tooltip, Legend)

interface AssetAllocationPieChartProps {
  assetAllocation: PortfolioSummary['assetAllocation']
  className?: string
  height?: string
}

export default function AssetAllocationPieChart({
  assetAllocation,
  className,
  height = '300px'
}: AssetAllocationPieChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STOCK: 'Stocks',
      MUTUAL_FUND: 'Mutual Funds',
      GOLD: 'Gold',
      JEWELRY: 'Jewelry',
      REAL_ESTATE: 'Real Estate',
      FD: 'Fixed Deposits',
      CRYPTO: 'Cryptocurrency',
      OTHER: 'Other'
    }
    return labels[type] || type
  }

  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280'  // Gray
  ]

  const data = {
    labels: Object.keys(assetAllocation).map(getAssetTypeLabel),
    datasets: [
      {
        data: Object.values(assetAllocation).map(item => item.value),
        backgroundColor: colors.slice(0, Object.keys(assetAllocation).length),
        borderColor: colors.slice(0, Object.keys(assetAllocation).length).map(color => color + '80'),
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 4
      }
    ]
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          },
          generateLabels: (chart) => {
            const data = chart.data
            if (data.labels && data.datasets.length > 0) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i] as number
                const percentage = Object.values(assetAllocation)[i]?.percentage || 0
                const backgroundColor = Array.isArray(data.datasets[0].backgroundColor) 
                  ? data.datasets[0].backgroundColor[i] as string
                  : data.datasets[0].backgroundColor as string
                const borderColor = Array.isArray(data.datasets[0].borderColor)
                  ? data.datasets[0].borderColor[i] as string
                  : data.datasets[0].borderColor as string
                return {
                  text: `${label} (${percentage.toFixed(1)}%)`,
                  fillStyle: backgroundColor,
                  strokeStyle: borderColor,
                  lineWidth: 2,
                  hidden: false,
                  index: i
                }
              })
            }
            return []
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed
            const percentage = Object.values(assetAllocation)[context.dataIndex]?.percentage || 0
            return `${label}: ${formatCurrency(value)} (${percentage.toFixed(1)}%)`
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    interaction: {
      intersect: false
    }
  }

  if (Object.keys(assetAllocation).length === 0) {
    return (
      <ChartContainer
        title="Asset Allocation"
        className={className}
        height={height}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">No asset allocation data</p>
          </div>
        </div>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer
      title="Asset Allocation"
      className={className}
      height={height}
    >
      <Pie data={data} options={options} />
    </ChartContainer>
  )
}