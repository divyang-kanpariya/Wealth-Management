'use client'

import React from 'react'
import { PortfolioSummary as PortfolioSummaryType } from '@/types'

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Portfolio Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600 mb-1">Total Value</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(summary.totalValue)}
          </div>
        </div>

        {/* Total Invested */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 mb-1">Total Invested</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.totalInvested)}
          </div>
        </div>

        {/* Total Gain/Loss */}
        <div className={`rounded-lg p-4 ${
          summary.totalGainLoss >= 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className={`text-sm font-medium mb-1 ${
            summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            Total {summary.totalGainLoss >= 0 ? 'Gain' : 'Loss'}
          </div>
          <div className={`text-2xl font-bold ${
            summary.totalGainLoss >= 0 ? 'text-green-900' : 'text-red-900'
          }`}>
            {formatCurrency(Math.abs(summary.totalGainLoss))}
          </div>
        </div>

        {/* Total Gain/Loss Percentage */}
        <div className={`rounded-lg p-4 ${
          summary.totalGainLossPercentage >= 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className={`text-sm font-medium mb-1 ${
            summary.totalGainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            Return %
          </div>
          <div className={`text-2xl font-bold ${
            summary.totalGainLossPercentage >= 0 ? 'text-green-900' : 'text-red-900'
          }`}>
            {formatPercentage(summary.totalGainLossPercentage)}
          </div>
        </div>
      </div>
    </div>
  )
}