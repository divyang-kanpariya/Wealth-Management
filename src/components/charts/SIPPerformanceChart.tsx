'use client'

import React, { useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { SIPWithCurrentValue } from '@/types'
import ChartContainer from './ChartContainer'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface SIPPerformanceChartProps {
  sips: SIPWithCurrentValue[]
  className?: string
  height?: string
}

export default function SIPPerformanceChart({
  sips,
  className,
  height = '400px'
}: SIPPerformanceChartProps) {
  const [chartType, setChartType] = useState<'performance' | 'projection'>('performance')

  // Ensure sips is always an array
  const safeSips = Array.isArray(sips) ? sips : []

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Generate SIP performance data
  const generateSIPPerformanceData = () => {
    if (safeSips.length === 0) return { labels: [], datasets: [] }

    const sipNames = safeSips.map(sip => sip.sip.name.length > 15 
      ? sip.sip.name.substring(0, 15) + '...' 
      : sip.sip.name
    )

    return {
      labels: sipNames,
      datasets: [
        {
          label: 'Total Invested',
          data: safeSips.map(sip => sip.totalInvested),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10B981',
          borderWidth: 1
        },
        {
          label: 'Current Value',
          data: safeSips.map(sip => sip.currentValue),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: '#3B82F6',
          borderWidth: 1
        }
      ]
    }
  }

  // Generate SIP projection data (future value estimation)
  const generateSIPProjectionData = () => {
    if (safeSips.length === 0) return { labels: [], datasets: [] }

    // Generate next 12 months projection for active SIPs
    const activeSips = safeSips.filter(sip => sip.sip.status === 'ACTIVE')
    if (activeSips.length === 0) return { labels: [], datasets: [] }

    const months = []
    const projectedValues = []
    const investedValues = []

    for (let i = 0; i < 12; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() + i)
      months.push(date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }))

      let totalProjectedValue = 0
      let totalInvestedValue = 0

      activeSips.forEach(sip => {
        const monthlyAmount = sip.sip.amount
        const currentValue = sip.currentValue
        const totalInvested = sip.totalInvested
        
        // Simple projection assuming 12% annual return
        const monthlyReturn = 0.01 // 1% monthly return (12% annual)
        const additionalInvestment = monthlyAmount * i
        const projectedGrowth = (currentValue + additionalInvestment) * Math.pow(1 + monthlyReturn, i)
        
        totalProjectedValue += projectedGrowth
        totalInvestedValue += totalInvested + additionalInvestment
      })

      projectedValues.push(totalProjectedValue)
      investedValues.push(totalInvestedValue)
    }

    return {
      labels: months,
      datasets: [
        {
          label: 'Projected Investment',
          data: investedValues,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          borderDash: [5, 5]
        },
        {
          label: 'Projected Value',
          data: projectedValues,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    }
  }

  const performanceData = generateSIPPerformanceData()
  const projectionData = generateSIPProjectionData()

  const barOptions: ChartOptions<'bar'> = {
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
            if (tooltipItems.length === 2) {
              const invested = tooltipItems[0].parsed.y
              const current = tooltipItems[1].parsed.y
              const gainLoss = current - invested
              const percentage = invested > 0 ? ((gainLoss / invested) * 100).toFixed(2) : '0.00'
              return [
                `Gain/Loss: ${formatCurrency(gainLoss)}`,
                `Return: ${gainLoss >= 0 ? '+' : ''}${percentage}%`
              ]
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
    }
  }

  const lineOptions: ChartOptions<'line'> = {
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

  const actions = (
    <div className="flex space-x-1">
      <button
        onClick={() => setChartType('performance')}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          chartType === 'performance'
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Performance
      </button>
      <button
        onClick={() => setChartType('projection')}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          chartType === 'projection'
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Projection
      </button>
    </div>
  )

  if (safeSips.length === 0) {
    return (
      <ChartContainer
        title="SIP Performance & Projections"
        className={className}
        height={height}
        actions={actions}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">No SIP data available</p>
          </div>
        </div>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer
      title="SIP Performance & Projections"
      className={className}
      height={height}
      actions={actions}
    >
      {chartType === 'performance' ? (
        <Bar data={performanceData} options={barOptions} />
      ) : (
        <Line data={projectionData} options={lineOptions} />
      )}
    </ChartContainer>
  )
}