'use client'

import React from 'react'
import { InvestmentWithCurrentValue } from '@/types'
import { CompactCard, TabPanel, Tab, CompactTable, CompactTableColumn, StatusIndicator } from '@/components/ui'
import Link from 'next/link'

interface CompactTopPerformersProps {
  investments: InvestmentWithCurrentValue[]
}

export default function CompactTopPerformers({ investments }: CompactTopPerformersProps) {
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

  const getPerformanceStatus = (percentage: number) => {
    if (percentage >= 10) return 'success'
    if (percentage >= 5) return 'info'
    if (percentage >= 0) return 'neutral'
    if (percentage >= -5) return 'warning'
    return 'danger'
  }

  // Sort by absolute gain/loss for top gainers and losers
  const topGainers = investments
    .filter(inv => inv.gainLoss > 0)
    .sort((a, b) => b.gainLoss - a.gainLoss)
    .slice(0, 5)

  const topLosers = investments
    .filter(inv => inv.gainLoss < 0)
    .sort((a, b) => a.gainLoss - b.gainLoss)
    .slice(0, 5)

  // Sort by percentage for best and worst performers
  const bestPerformers = investments
    .filter(inv => inv.gainLossPercentage > 0)
    .sort((a, b) => b.gainLossPercentage - a.gainLossPercentage)
    .slice(0, 5)

  const worstPerformers = investments
    .filter(inv => inv.gainLossPercentage < 0)
    .sort((a, b) => a.gainLossPercentage - b.gainLossPercentage)
    .slice(0, 5)

  const performanceColumns: CompactTableColumn<InvestmentWithCurrentValue>[] = [
    {
      key: 'name',
      title: 'Investment',
      width: '50%',
      render: (_, item) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate text-sm">
            {item.investment.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {item.investment.type.replace('_', ' ')}
            {item.investment.symbol && ` • ${item.investment.symbol}`}
          </div>
        </div>
      )
    },
    {
      key: 'performance',
      title: 'Performance',
      align: 'right',
      width: '50%',
      render: (_, item) => (
        <div className="text-right space-y-1">
          <div className="flex items-center justify-end space-x-2">
            <span className={`text-sm font-semibold ${
              item.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(Math.abs(item.gainLoss))}
            </span>
            <StatusIndicator
              status={getPerformanceStatus(item.gainLossPercentage)}
              variant="dot"
              size="sm"
            />
          </div>
          <div className={`text-xs ${
            item.gainLossPercentage >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {formatPercentage(item.gainLossPercentage)}
          </div>
        </div>
      )
    }
  ]

  const percentageColumns: CompactTableColumn<InvestmentWithCurrentValue>[] = [
    {
      key: 'name',
      title: 'Investment',
      width: '60%',
      render: (_, item) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate text-sm">
            {item.investment.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {item.investment.type.replace('_', ' ')}
          </div>
        </div>
      )
    },
    {
      key: 'percentage',
      title: 'Return %',
      align: 'right',
      width: '40%',
      render: (_, item) => (
        <div className="flex items-center justify-end space-x-2">
          <span className={`text-sm font-semibold ${
            item.gainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatPercentage(item.gainLossPercentage)}
          </span>
          <StatusIndicator
            status={getPerformanceStatus(item.gainLossPercentage)}
            variant="dot"
            size="sm"
          />
        </div>
      )
    }
  ]

  const tabs: Tab[] = [
    {
      id: 'gainers',
      label: 'Top Gainers',
      badge: topGainers.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      content: (
        <CompactTable
          data={topGainers}
          columns={performanceColumns}
          rowKey={(item) => item.investment.id}
          variant="minimal"
          showHeader={false}
          maxHeight="200px"
          emptyMessage="No gainers found"
        />
      )
    },
    {
      id: 'losers',
      label: 'Top Losers',
      badge: topLosers.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
      content: (
        <CompactTable
          data={topLosers}
          columns={performanceColumns}
          rowKey={(item) => item.investment.id}
          variant="minimal"
          showHeader={false}
          maxHeight="200px"
          emptyMessage="No losers found"
        />
      )
    },
    {
      id: 'best-returns',
      label: 'Best Returns',
      badge: bestPerformers.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      content: (
        <CompactTable
          data={bestPerformers}
          columns={percentageColumns}
          rowKey={(item) => item.investment.id}
          variant="minimal"
          showHeader={false}
          maxHeight="200px"
          emptyMessage="No positive returns found"
        />
      )
    },
    {
      id: 'worst-returns',
      label: 'Worst Returns',
      badge: worstPerformers.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      content: (
        <CompactTable
          data={worstPerformers}
          columns={percentageColumns}
          rowKey={(item) => item.investment.id}
          variant="minimal"
          showHeader={false}
          maxHeight="200px"
          emptyMessage="No negative returns found"
        />
      )
    }
  ]

  if (investments.length === 0) {
    return (
      <CompactCard
        title="Top Performers"
        variant="default"
        className="mb-4"
      >
        <div className="text-center py-6">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-3">No performance data available</p>
          <Link 
            href="/investments" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Add investments to see performance →
          </Link>
        </div>
      </CompactCard>
    )
  }

  return (
    <CompactCard
      title="Top Performers"
      variant="default"
      className="mb-4"
      collapsible
      actions={
        <Link 
          href="/investments" 
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          View All →
        </Link>
      }
    >
      <TabPanel
        tabs={tabs}
        variant="minimal"
        size="sm"
      />
    </CompactCard>
  )
}