'use client'

import React from 'react'
import { PortfolioSummary as PortfolioSummaryType } from '@/types'
import CompactCard from '../ui/CompactCard'
import DataGrid from '../ui/DataGrid'

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType
}

export default function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  const portfolioItems = [
    {
      label: 'Total Value',
      value: formatCurrency(summary.totalValue),
      color: 'info' as const
    },
    {
      label: 'Total Invested',
      value: formatCurrency(summary.totalInvested),
      color: 'default' as const
    },
    {
      label: `Total ${summary.totalGainLoss >= 0 ? 'Gain' : 'Loss'}`,
      value: formatCurrency(Math.abs(summary.totalGainLoss)),
      color: summary.totalGainLoss >= 0 ? 'success' as const : 'danger' as const
    },
    {
      label: 'Return %',
      value: formatPercentage(summary.totalGainLossPercentage),
      color: summary.totalGainLossPercentage >= 0 ? 'success' as const : 'danger' as const
    }
  ]

  return (
    <CompactCard title="Portfolio Summary">
      <DataGrid 
        items={portfolioItems}
        columns={4}
        variant="default"
      />
    </CompactCard>
  )
}