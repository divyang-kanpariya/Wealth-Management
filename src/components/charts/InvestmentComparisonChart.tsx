'use client'

import React, { useState } from 'react'
import { Bar, Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { InvestmentWithCurrentValue, InvestmentType } from '@/types'
import ChartContainer from './ChartContainer'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
)

interface InvestmentComparisonChartProps {
  investments: InvestmentWithCurrentValue[]
  className?: string
  height?: string
}

export default function InvestmentComparisonChart({
  investments,
  className,
  height = '400px'
}: InvestmentComparisonChartProps) {
  const [chartType, setChartType] = useState<'returns' | 'allocation' | 'risk'>('returns')
  const [filterType, setFilterType] = useState<InvestmentType | 'ALL'>('ALL')

  // Ensure investments is always an array
  const safeInvestments = Array.isArray(investments) ? investments : []

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

  // Filter investments based on selected type
  const filteredInvestments = filterType === 'ALL' 
    ? safeInvestments 
    : safeInvestments.filter(inv => inv.investment.type === filterType)

  // Generate returns comparison data
  const generateReturnsData = () => {
    if (filteredInvestments.length === 0) return { labels: [], datasets: [] }

    // Sort by gain/loss percentage and take top 10
    const sortedInvestments = [...filteredInvestments]
      .sort((a, b) => b.gainLossPercentage - a.gainLossPercentage)
      .slice(0, 10)

    return {
      labels: sortedInvestments.map(inv => 
        inv.investment.name.length > 15 
          ? inv.investment.name.substring(0, 15) + '...'
          : inv.investment.name
      ),
      datasets: [
        {
          label: 'Return %',
          data: sortedInvestments.map(inv => inv.gainLossPercentage),
          backgroundColor: sortedInvestments.map(inv => 
            inv.gainLossPercentage >= 0 
              ? 'rgba(16, 185, 129, 0.6)' 
              : 'rgba(239, 68, 68, 0.6)'
          ),
          borderColor: sortedInvestments.map(inv => 
            inv.gainLossPercentage >= 0 
              ? '#10B981' 
              : '#EF4444'
          ),
          borderWidth: 1
        }
      ]
    }
  }

  // Generate allocation comparison data
  const generateAllocationData = () => {
    if (filteredInvestments.length === 0) return { labels: [], datasets: [] }

    // Group by asset type and sum values
    const allocationMap = new Map<string, number>()
    filteredInvestments.forEach(inv => {
      const type = getAssetTypeLabel(inv.investment.type)
      const current = allocationMap.get(type) || 0
      allocationMap.set(type, current + inv.currentValue)
    })

    const sortedAllocation = Array.from(allocationMap.entries())
      .sort((a, b) => b[1] - a[1])

    return {
      labels: sortedAllocation.map(([type]) => type),
      datasets: [
        {
          label: 'Current Value',
          data: sortedAllocation.map(([, value]) => value),
          backgroundColor: [
            'rgba(59, 130, 246, 0.6)',
            'rgba(16, 185, 129, 0.6)',
            'rgba(245, 158, 11, 0.6)',
            'rgba(239, 68, 68, 0.6)',
            'rgba(139, 92, 246, 0.6)',
            'rgba(249, 115, 22, 0.6)',
            'rgba(6, 182, 212, 0.6)',
            'rgba(132, 204, 22, 0.6)'
          ],
          borderColor: [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#F97316',
            '#06B6D4',
            '#84CC16'
          ],
          borderWidth: 1
        }
      ]
    }
  }

  // Generate risk analysis radar data
  const generateRiskData = () => {
    if (filteredInvestments.length === 0) return { labels: [], datasets: [] }

    // Calculate risk metrics by asset type
    const riskMetrics = new Map<string, {
      volatility: number,
      returns: number,
      allocation: number,
      liquidity: number,
      diversification: number
    }>()

    // Group investments by type
    const typeGroups = new Map<string, InvestmentWithCurrentValue[]>()
    filteredInvestments.forEach(inv => {
      const type = getAssetTypeLabel(inv.investment.type)
      if (!typeGroups.has(type)) {
        typeGroups.set(type, [])
      }
      typeGroups.get(type)!.push(inv)
    })

    // Calculate metrics for each type
    typeGroups.forEach((investments, type) => {
      const avgReturn = investments.reduce((sum, inv) => sum + inv.gainLossPercentage, 0) / investments.length
      const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0)
      const totalPortfolioValue = filteredInvestments.reduce((sum, inv) => sum + inv.currentValue, 0)
      
      // Simple risk scoring (0-100)
      const riskScores = {
        STOCK: { volatility: 80, liquidity: 90, diversification: 70 },
        MUTUAL_FUND: { volatility: 60, liquidity: 85, diversification: 90 },
        GOLD: { volatility: 40, liquidity: 70, diversification: 30 },
        JEWELRY: { volatility: 30, liquidity: 40, diversification: 20 },
        REAL_ESTATE: { volatility: 35, liquidity: 30, diversification: 40 },
        FD: { volatility: 10, liquidity: 60, diversification: 20 },
        CRYPTO: { volatility: 95, liquidity: 80, diversification: 50 },
        OTHER: { volatility: 50, liquidity: 50, diversification: 50 }
      }

      const typeKey = Object.keys(riskScores).find(key => 
        getAssetTypeLabel(key) === type
      ) as keyof typeof riskScores || 'OTHER'

      riskMetrics.set(type, {
        volatility: riskScores[typeKey].volatility,
        returns: Math.min(Math.max(avgReturn + 50, 0), 100), // Normalize to 0-100
        allocation: (totalValue / totalPortfolioValue) * 100,
        liquidity: riskScores[typeKey].liquidity,
        diversification: riskScores[typeKey].diversification
      })
    })

    const labels = ['Volatility', 'Returns', 'Allocation', 'Liquidity', 'Diversification']
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'
    ]

    const datasets = Array.from(riskMetrics.entries()).slice(0, 5).map(([type, metrics], index) => ({
      label: type,
      data: [
        metrics.volatility,
        metrics.returns,
        metrics.allocation,
        metrics.liquidity,
        metrics.diversification
      ],
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + '20',
      borderWidth: 2,
      pointBackgroundColor: colors[index % colors.length],
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: colors[index % colors.length]
    }))

    return { labels, datasets }
  }

  const returnsData = generateReturnsData()
  const allocationData = generateAllocationData()
  const riskData = generateRiskData()

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y
            return chartType === 'returns' 
              ? `Return: ${value.toFixed(2)}%`
              : `Value: ${formatCurrency(value)}`
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
            size: 10
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
            return chartType === 'returns' 
              ? `${value}%`
              : formatCurrency(value as number)
          },
          font: {
            size: 11
          }
        }
      }
    }
  }

  const radarOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  }

  const investmentTypes = Array.from(new Set(safeInvestments.map(inv => inv.investment.type)))

  const actions = (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        <button
          onClick={() => setChartType('returns')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            chartType === 'returns'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Returns
        </button>
        <button
          onClick={() => setChartType('allocation')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            chartType === 'allocation'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Allocation
        </button>
        <button
          onClick={() => setChartType('risk')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            chartType === 'risk'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Risk
        </button>
      </div>
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value as InvestmentType | 'ALL')}
        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
      >
        <option value="ALL">All Types</option>
        {investmentTypes.map(type => (
          <option key={type} value={type}>
            {getAssetTypeLabel(type)}
          </option>
        ))}
      </select>
    </div>
  )

  if (filteredInvestments.length === 0) {
    return (
      <ChartContainer
        title="Investment Analysis"
        className={className}
        height={height}
        actions={actions}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">No investment data for comparison</p>
          </div>
        </div>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer
      title="Investment Analysis"
      className={className}
      height={height}
      actions={actions}
    >
      {chartType === 'risk' ? (
        <Radar data={riskData} options={radarOptions} />
      ) : (
        <Bar 
          data={chartType === 'returns' ? returnsData : allocationData} 
          options={barOptions} 
        />
      )}
    </ChartContainer>
  )
}