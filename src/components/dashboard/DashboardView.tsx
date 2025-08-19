'use client'

import Link from 'next/link'
import { DashboardPageData } from '@/lib/server/data-preparators'
import { 
  CompactPortfolioSummary, 
  CompactAssetAllocation, 
  CompactGoalProgress, 
  CompactTopPerformers,
  CompactQuickStats
} from '@/components/dashboard'
import { RefreshButton } from '@/components/dashboard/RefreshButton'
import { CompactCard, DataGrid } from '@/components/ui'
import Layout from '@/components/layout/Layout'

interface DashboardViewProps {
  data: DashboardPageData
}

export function DashboardView({ data }: DashboardViewProps) {
  // Check if we have any data to display
  const hasData = data.totalInvestments > 0 || data.totalSIPs > 0

  if (!hasData) {
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
        <CompactPortfolioSummary summary={data.portfolioSummary} />
        
        {/* Quick Stats */}
        <CompactQuickStats dashboardData={{
          portfolioSummary: data.portfolioSummary,
          goalProgress: data.goalProgress,
          totalInvestments: data.totalInvestments,
          totalGoals: data.totalGoals
        }} />
        
        {/* Asset Allocation and Account Distribution */}
        {data.portfolioSummary && (
          <CompactAssetAllocation 
            assetAllocation={data.portfolioSummary.assetAllocation}
            accountDistribution={data.portfolioSummary.accountDistribution}
          />
        )}

        {/* Goal Progress */}
        <CompactGoalProgress goals={data.goalProgress} />

        {/* Top Performers */}
        <CompactTopPerformers investments={data.investmentsWithValues} />
        
        {/* Performance Insights */}
        <CompactCard
          title="Performance Insights"
          variant="minimal"
          collapsible
          defaultCollapsed={false}
        >
          <DataGrid
            items={[
              {
                label: 'Profitable Investments',
                value: (
                  <span className="text-2xl font-bold">
                    {data.investmentsWithValues.filter(inv => inv.gainLoss > 0).length}
                  </span>
                ),
                color: 'success'
              },
              {
                label: 'Loss-making Investments',
                value: (
                  <span className="text-2xl font-bold">
                    {data.investmentsWithValues.filter(inv => inv.gainLoss < 0).length}
                  </span>
                ),
                color: 'danger'
              }
            ]}
            columns={2}
            variant="default"
          />
        </CompactCard>

        {/* Cache Info and Refresh Buttons */}
        <CompactCard
          title="Data Status"
          variant="minimal"
          collapsible
          defaultCollapsed={true}
        >
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <div>Last updated: {data.timestamp.toLocaleString()}</div>
              {data.cacheKey && (
                <div className="text-xs text-gray-500 mt-1">
                  Cache key: {data.cacheKey}
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <RefreshButton />
            </div>
          </div>
        </CompactCard>

        {/* Floating Refresh Button */}
        <div className="fixed bottom-6 right-6">
          <RefreshButton />
        </div>
      </div>
    </Layout>
  )
}