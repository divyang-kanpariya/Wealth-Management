'use client'

import React from 'react'
import { PortfolioSummary } from '@/types'

interface AssetAllocationProps {
  assetAllocation: PortfolioSummary['assetAllocation']
  accountDistribution: PortfolioSummary['accountDistribution']
}

export default function AssetAllocation({ assetAllocation, accountDistribution }: AssetAllocationProps) {
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

  const getAssetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      STOCK: 'bg-blue-500',
      MUTUAL_FUND: 'bg-green-500',
      GOLD: 'bg-yellow-500',
      JEWELRY: 'bg-purple-500',
      REAL_ESTATE: 'bg-red-500',
      FD: 'bg-indigo-500',
      CRYPTO: 'bg-orange-500',
      OTHER: 'bg-gray-500'
    }
    return colors[type] || 'bg-gray-500'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Asset Allocation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Asset Allocation</h3>
        
        {Object.keys(assetAllocation).length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No investments found
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(assetAllocation)
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([type, data]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getAssetTypeColor(type)}`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {getAssetTypeLabel(type)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(data.value)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {data.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Account Distribution */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Distribution</h3>
        
        {Object.keys(accountDistribution).length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No accounts found
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(accountDistribution)
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([account, data], index) => (
                <div key={account} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${
                      index % 6 === 0 ? 'from-blue-400 to-blue-600' :
                      index % 6 === 1 ? 'from-green-400 to-green-600' :
                      index % 6 === 2 ? 'from-purple-400 to-purple-600' :
                      index % 6 === 3 ? 'from-red-400 to-red-600' :
                      index % 6 === 4 ? 'from-yellow-400 to-yellow-600' :
                      'from-indigo-400 to-indigo-600'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {account}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(data.value)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {data.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}