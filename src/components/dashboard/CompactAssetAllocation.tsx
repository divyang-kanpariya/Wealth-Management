'use client'

import React from 'react'
import { PortfolioSummary } from '@/types'
import { CompactCard, TabPanel, Tab, CompactTable, CompactTableColumn } from '@/components/ui'

interface CompactAssetAllocationProps {
  assetAllocation: PortfolioSummary['assetAllocation']
  accountDistribution: PortfolioSummary['accountDistribution']
}

interface AllocationItem {
  name: string
  value: number
  percentage: number
  type: 'asset' | 'account'
}

export default function CompactAssetAllocation({ 
  assetAllocation, 
  accountDistribution 
}: CompactAssetAllocationProps) {
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

  const getAssetIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      STOCK: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      MUTUAL_FUND: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      GOLD: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      default: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
    return icons[type] || icons.default
  }

  // Convert asset allocation to table data
  const assetData: AllocationItem[] = Object.entries(assetAllocation)
    .map(([type, data]) => ({
      name: getAssetTypeLabel(type),
      value: data.value,
      percentage: data.percentage,
      type: 'asset' as const
    }))
    .sort((a, b) => b.value - a.value)

  // Convert account distribution to table data
  const accountData: AllocationItem[] = Object.entries(accountDistribution)
    .map(([account, data]) => ({
      name: account,
      value: data.value,
      percentage: data.percentage,
      type: 'account' as const
    }))
    .sort((a, b) => b.value - a.value)

  const columns: CompactTableColumn<AllocationItem>[] = [
    {
      key: 'name',
      title: 'Name',
      width: '50%',
      render: (_, item) => (
        <div className="flex items-center space-x-2">
          {item.type === 'asset' && (
            <div className="text-gray-400 flex-shrink-0">
              {getAssetIcon(Object.keys(assetAllocation).find(key => 
                getAssetTypeLabel(key) === item.name
              ) || 'default')}
            </div>
          )}
          <span className="font-medium text-gray-900 truncate">
            {item.name}
          </span>
        </div>
      )
    },
    {
      key: 'value',
      title: 'Value',
      align: 'right',
      width: '30%',
      render: (_, item) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(item.value)}
        </span>
      )
    },
    {
      key: 'percentage',
      title: '%',
      align: 'right',
      width: '20%',
      render: (_, item) => (
        <div className="flex items-center justify-end space-x-2">
          <span className="text-sm text-gray-600">
            {item.percentage.toFixed(1)}%
          </span>
          <div className="w-12 bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(item.percentage, 100)}%` }}
            />
          </div>
        </div>
      )
    }
  ]

  const tabs: Tab[] = [
    {
      id: 'assets',
      label: 'Asset Types',
      badge: assetData.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      content: (
        <CompactTable
          data={assetData}
          columns={columns}
          rowKey={(item) => item.name}
          variant="minimal"
          showHeader={false}
          maxHeight="200px"
          emptyMessage="No asset allocation data"
        />
      )
    },
    {
      id: 'accounts',
      label: 'Accounts',
      badge: accountData.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      content: (
        <CompactTable
          data={accountData}
          columns={columns}
          rowKey={(item) => item.name}
          variant="minimal"
          showHeader={false}
          maxHeight="200px"
          emptyMessage="No account distribution data"
        />
      )
    }
  ]

  return (
    <CompactCard
      title="Portfolio Distribution"
      variant="default"
      className="mb-4"
    >
      <TabPanel
        tabs={tabs}
        variant="minimal"
        size="sm"
      />
    </CompactCard>
  )
}