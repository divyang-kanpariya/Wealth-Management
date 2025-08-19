import React from 'react'
import { 
  PortfolioPerformanceChart,
  SIPPerformanceChart,
  GoalProgressChart,
  InvestmentComparisonChart,
  AssetAllocationPieChart,
  TrendChart,
  AnalyticsSummaryCard,
  RealInvestmentGrowthChart,
  RealGoalProgressTrendChart
} from '@/components/charts'
import { Layout } from '@/components/layout'
import { ChartsDataPreparator } from '@/lib/server/data-preparators/charts'

// Enable dynamic rendering to ensure fresh data after updates
export const dynamic = 'force-dynamic'

export default async function ChartsPage() {
  const preparator = new ChartsDataPreparator()
  const pageData = await preparator.prepare()

  const { dashboardData, investments, sips, portfolioTrendData, investmentGrowthData, goalProgressTrendData, portfolioPerformanceData } = pageData

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Investment Analytics</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive visualization of your portfolio performance and insights
        </p>
        
        <div className="mt-6">
          <AnalyticsSummaryCard summary={dashboardData} />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* Row 1: Portfolio Performance and Asset Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PortfolioPerformanceChart 
              performanceData={pageData.portfolioPerformanceData}
              height="400px"
            />
          </div>
          <div>
            <AssetAllocationPieChart 
              assetAllocation={dashboardData.portfolioSummary.assetAllocation}
              height="400px"
            />
          </div>
        </div>

        {/* Row 2: SIP Performance and Goal Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SIPPerformanceChart 
            sips={sips}
            height="400px"
          />
          <GoalProgressChart 
            goals={dashboardData.goalProgress}
            height="400px"
          />
        </div>

        {/* Row 3: Investment Comparison and Portfolio Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InvestmentComparisonChart 
            investments={investments}
            height="400px"
          />
          <TrendChart
            data={portfolioTrendData}
            title="Portfolio Value Trend"
            height="400px"
            color="#3B82F6"
            fillArea={true}
          />
        </div>

        {/* Row 4: Real Historical Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RealInvestmentGrowthChart data={investmentGrowthData} />
          <RealGoalProgressTrendChart data={goalProgressTrendData} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>Charts are updated in real-time based on your latest investment data</p>
        <p className="mt-1">
          Last updated: {pageData.timestamp.toLocaleString('en-IN')}
        </p>
      </div>
    </Layout>
  )
}