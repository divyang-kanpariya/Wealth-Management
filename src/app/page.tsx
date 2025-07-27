'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardSummary, InvestmentWithCurrentValue } from '@/types'
import { PortfolioSummary, AssetAllocation, GoalProgress, TopPerformers } from '@/components/dashboard'
import { LoadingState, ErrorState } from '@/components/ui'
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
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">No Data Available</h1>
            <p className="text-gray-600 mb-6">Start by adding your first investment to see your dashboard.</p>
            <Link 
              href="/investments" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Add Investment
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showBreadcrumbs={false}>
      {/* Portfolio Summary */}
      <div className="mb-8">
        <PortfolioSummary summary={dashboardData.portfolioSummary} />
      </div>

      {/* Asset Allocation and Account Distribution */}
      <div className="mb-8">
        <AssetAllocation 
          assetAllocation={dashboardData.portfolioSummary.assetAllocation}
          accountDistribution={dashboardData.portfolioSummary.accountDistribution}
        />
      </div>

      {/* Goal Progress and Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GoalProgress goals={dashboardData.goalProgress} />
        <div className="lg:col-span-1">
          <TopPerformers investments={investmentsWithValues} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {dashboardData.totalInvestments}
            </div>
            <div className="text-sm text-gray-600">Total Investments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {dashboardData.totalGoals}
            </div>
            <div className="text-sm text-gray-600">Active Goals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(dashboardData.portfolioSummary.assetAllocation).length}
            </div>
            <div className="text-sm text-gray-600">Asset Types</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Object.keys(dashboardData.portfolioSummary.accountDistribution).length}
            </div>
            <div className="text-sm text-gray-600">Accounts</div>
          </div>
        </div>
      </div>
    </Layout>
  )
}