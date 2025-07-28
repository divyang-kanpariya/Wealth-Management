'use client'

import React from 'react'
import { InvestmentWithCurrentValue } from '@/types'
import Link from 'next/link'
import CompactCard from '../ui/CompactCard'

interface TopPerformersProps {
  investments: InvestmentWithCurrentValue[]
}

export default function TopPerformers({ investments }: TopPerformersProps) {
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

  // Sort by absolute gain/loss for top gainers and losers
  const topGainers = investments
    .filter(inv => inv.gainLoss > 0)
    .sort((a, b) => b.gainLoss - a.gainLoss)
    .slice(0, 3)

  const topLosers = investments
    .filter(inv => inv.gainLoss < 0)
    .sort((a, b) => a.gainLoss - b.gainLoss)
    .slice(0, 3)

  // Sort by percentage for best and worst performers
  const bestPerformers = investments
    .filter(inv => inv.gainLossPercentage > 0)
    .sort((a, b) => b.gainLossPercentage - a.gainLossPercentage)
    .slice(0, 3)

  const worstPerformers = investments
    .filter(inv => inv.gainLossPercentage < 0)
    .sort((a, b) => a.gainLossPercentage - b.gainLossPercentage)
    .slice(0, 3)

  const InvestmentItem = ({ investmentData, showGainLoss = true }: { 
    investmentData: InvestmentWithCurrentValue
    showGainLoss?: boolean 
  }) => {
    const { investment, gainLoss, gainLossPercentage } = investmentData
    
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {investment.name}
          </div>
          <div className="text-xs text-gray-500">
            {investment.type.replace('_', ' ')}
          </div>
        </div>
        <div className="text-right ml-2">
          {showGainLoss ? (
            <>
              <div className={`text-sm font-semibold ${
                gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(gainLoss))}
              </div>
              <div className={`text-xs ${
                gainLossPercentage >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatPercentage(gainLossPercentage)}
              </div>
            </>
          ) : (
            <div className={`text-sm font-semibold ${
              gainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(gainLossPercentage)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Gainers/Losers by Amount */}
      <CompactCard 
        title="Top Performers (Amount)"
        actions={
          <Link 
            href="/investments" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All
          </Link>
        }
      >
        {/* Top Gainers */}
        {topGainers.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Top Gainers
            </h4>
            <div className="space-y-1">
              {topGainers.map((investmentData) => (
                <InvestmentItem 
                  key={investmentData.investment.id} 
                  investmentData={investmentData} 
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Top Losers */}
        {topLosers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              Top Losers
            </h4>
            <div className="space-y-1">
              {topLosers.map((investmentData) => (
                <InvestmentItem 
                  key={investmentData.investment.id} 
                  investmentData={investmentData} 
                />
              ))}
            </div>
          </div>
        )}
        
        {topGainers.length === 0 && topLosers.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            No performance data available
          </div>
        )}
      </CompactCard>

      {/* Best/Worst Performers by Percentage */}
      <CompactCard 
        title="Top Performers (%)"
        actions={
          <Link 
            href="/investments" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All
          </Link>
        }
      >
        {/* Best Performers */}
        {bestPerformers.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Best Returns
            </h4>
            <div className="space-y-1">
              {bestPerformers.map((investmentData) => (
                <InvestmentItem 
                  key={investmentData.investment.id} 
                  investmentData={investmentData}
                  showGainLoss={false}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Worst Performers */}
        {worstPerformers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              Worst Returns
            </h4>
            <div className="space-y-1">
              {worstPerformers.map((investmentData) => (
                <InvestmentItem 
                  key={investmentData.investment.id} 
                  investmentData={investmentData}
                  showGainLoss={false}
                />
              ))}
            </div>
          </div>
        )}
        
        {bestPerformers.length === 0 && worstPerformers.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            No performance data available
          </div>
        )}
      </CompactCard>
    </div>
  )
}