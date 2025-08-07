'use client'

import React from 'react'
import { DashboardSummary } from '@/types'
import { CompactCard, DataGrid, DataGridItem, StatusIndicator } from '@/components/ui'

interface AnalyticsSummaryCardProps {
  summary: DashboardSummary
}

export default function AnalyticsSummaryCard({ summary }: AnalyticsSummaryCardProps) {
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

  const analyticsItems: DataGridItem[] = [
    {
      label: 'Total Portfolio',
      value: formatCurrency(summary.portfolioSummary.totalValue),
      subValue: 'Current market value',
      color: 'info',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      label: 'Total Return',
      value: (
        <div className="flex items-center space-x-2">
          <span className={summary.portfolioSummary.totalGainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatPercentage(summary.portfolioSummary.totalGainLossPercentage)}
          </span>
          <StatusIndicator 
            status={getReturnStatus(summary.portfolioSummary.totalGainLossPercentage)}
            variant="dot"
            size="sm"
          />
        </div>
      ),
      subValue: formatCurrency(Math.abs(summary.portfolioSummary.totalGainLoss)),
      color: summary.portfolioSummary.totalGainLossPercentage >= 0 ? 'success' : 'danger',
      icon: summary.portfolioSummary.totalGainLossPercentage >= 0 ? (
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
      label: 'Active Investments',
      value: summary.totalInvestments.toString(),
      subValue: 'Total positions',
      color: 'default',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      label: 'Active Goals',
      value: summary.totalGoals.toString(),
      subValue: 'Financial targets',
      color: 'default',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    }
  ]

  return (
    <CompactCard
      title="Analytics Overview"
      variant="default"
      actions={
        <div className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      }
    >
      <DataGrid 
        items={analyticsItems}
        columns={4}
        variant="compact"
      />
    </CompactCard>
  )
}