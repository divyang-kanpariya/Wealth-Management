'use client'

import React from 'react'
import { PortfolioSummary as PortfolioSummaryType } from '@/types'
import { CompactCard, DataGrid, DataGridItem, StatusIndicator } from '@/components/ui'

interface CompactPortfolioSummaryProps {
  summary: PortfolioSummaryType
}

export default function CompactPortfolioSummary({ summary }: CompactPortfolioSummaryProps) {
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

  const getReturnStatus = (percentage: number) => {
    if (percentage >= 10) return 'success'
    if (percentage >= 5) return 'info'
    if (percentage >= 0) return 'neutral'
    if (percentage >= -5) return 'warning'
    return 'danger'
  }

  const portfolioItems: DataGridItem[] = [
    {
      label: 'Portfolio Value',
      value: formatCurrency(summary.totalValue),
      subValue: 'Current market value',
      color: 'info',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      label: 'Total Invested',
      value: formatCurrency(summary.totalInvested),
      subValue: 'Amount invested',
      color: 'default',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: summary.totalGainLoss >= 0 ? 'Total Gain' : 'Total Loss',
      value: formatCurrency(Math.abs(summary.totalGainLoss)),
      subValue: formatPercentage(summary.totalGainLossPercentage),
      color: summary.totalGainLoss >= 0 ? 'success' : 'danger',
      icon: summary.totalGainLoss >= 0 ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      )
    },
    {
      label: 'Return Rate',
      value: (
        <div className="flex items-center space-x-2">
          <span>{formatPercentage(summary.totalGainLossPercentage)}</span>
          <StatusIndicator 
            status={getReturnStatus(summary.totalGainLossPercentage)}
            variant="dot"
            size="sm"
          />
        </div>
      ),
      subValue: summary.totalGainLoss >= 0 ? 'Positive return' : 'Negative return',
      color: summary.totalGainLossPercentage >= 0 ? 'success' : 'danger'
    }
  ]

  return (
    <CompactCard
      title="Portfolio Overview"
      variant="default"
      className="mb-4"
      actions={
        <div className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      }
    >
      <DataGrid 
        items={portfolioItems}
        columns={4}
        variant="compact"
      />
    </CompactCard>
  )
}