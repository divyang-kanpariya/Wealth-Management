'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardSummary, InvestmentWithCurrentValue } from '@/types'
import { 
  CompactPortfolioSummary, 
  CompactAssetAllocation, 
  CompactGoalProgress, 
  CompactTopPerformers,
  CompactQuickStats
} from '@/components/dashboard'
import { LoadingState, ErrorState, CompactCard } from '@/components/ui'
import Layout from '@/components/layout/Layout'

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null)
  const [investmentsWithValues, setInvestmentsWithValues] = useState<InvestmentWithCurrentValue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/summary')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const data = await response.json()
      setDashboardData(data)
      setInvestmentsWithValues(data.investmentsWithValues || [])
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Loading dashboard..." />
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <ErrorState 
          message={error}
          onRetry={fetchDashboardData}
        />
      </Layout>
    )
  }

  if (!dashboardData) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <CompactCard variant="minimal" className="max-w-md">
            <div className="text-center py-6">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h1>
              <p className="text-gray-600 mb-4 text-sm">Start by adding your first investment to see your dashboard.</p>
              <Link 
                href="/investments" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
              >
                Add Investment
              </Link>
            </div>
          </CompactCard>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Portfolio Summary */}
        <CompactPortfolioSummary summary={dashboardData.portfolioSummary} />
        
        {/* Quick Stats */}
        <CompactQuickStats dashboardData={dashboardData} />
        
        {/* Asset Allocation and Account Distribution */}
        <CompactAssetAllocation 
          assetAllocation={dashboardData.portfolioSummary.assetAllocation}
          accountDistribution={dashboardData.portfolioSummary.accountDistribution}
        />

        {/* Goal Progress */}
        <CompactGoalProgress goals={dashboardData.goalProgress} />

        {/* Top Performers */}
        <CompactTopPerformers investments={investmentsWithValues} />
        
        {/* Performance Insights */}
        <CompactCard
          title="Performance Insights"
          variant="minimal"
          collapsible
          defaultCollapsed={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {investmentsWithValues.filter(inv => inv.gainLoss > 0).length}
              </div>
              <div className="text-sm text-green-700">Profitable Investments</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {investmentsWithValues.filter(inv => inv.gainLoss < 0).length}
              </div>
              <div className="text-sm text-red-700">Loss-making Investments</div>
            </div>
          </div>
        </CompactCard>

        {/* Refresh Button - Fixed at bottom right */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 px-4 rounded-full shadow-lg transition-colors flex items-center space-x-2"
            title="Refresh Dashboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </Layout>
  )
}