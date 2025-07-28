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
import { LoadingState, ErrorState, CompactCard, TabPanel, Tab } from '@/components/ui'
import Layout from '@/components/layout/Layout'

export default function CompactDashboard() {
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
      <Layout showBreadcrumbs={false}>
        <LoadingState message="Loading dashboard..." />
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout showBreadcrumbs={false}>
        <ErrorState 
          message={error}
          onRetry={fetchDashboardData}
        />
      </Layout>
    )
  }

  if (!dashboardData) {
    return (
      <Layout showBreadcrumbs={false}>
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

  const overviewTab: Tab = {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    content: (
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
      </div>
    )
  }

  const performanceTab: Tab = {
    id: 'performance',
    label: 'Performance',
    badge: investmentsWithValues.length,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    content: (
      <div className="space-y-4">
        {/* Top Performers */}
        <CompactTopPerformers investments={investmentsWithValues} />
        
        {/* Additional performance metrics could go here */}
        <CompactCard
          title="Performance Insights"
          variant="minimal"
          collapsible
          defaultCollapsed={true}
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
      </div>
    )
  }

  const goalsTab: Tab = {
    id: 'goals',
    label: 'Goals',
    badge: dashboardData.totalGoals,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    content: (
      <div className="space-y-4">
        {/* Goal Progress */}
        <CompactGoalProgress goals={dashboardData.goalProgress} />
      </div>
    )
  }

  const tabs: Tab[] = [overviewTab, performanceTab, goalsTab]

  return (
    <Layout showBreadcrumbs={false}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wealth Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Compact view • Last updated: {new Date().toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Standard View
            </Link>
            <button
              onClick={fetchDashboardData}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <TabPanel
          tabs={tabs}
          variant="default"
          size="md"
          defaultTab="overview"
        />
      </div>
    </Layout>
  )
}