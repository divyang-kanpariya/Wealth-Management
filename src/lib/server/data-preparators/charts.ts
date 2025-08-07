import { prisma } from '@/lib/prisma'
import { 
  calculateInvestmentsWithPrices, 
  calculatePortfolioSummary, 
  calculateGoalProgress,
  getTopPerformers,
  calculateSipValue,
  calculateSipSummary
} from '@/lib/calculations'
import { BaseDataPreparator, PageDataBase } from './base'
import { DashboardSummary, InvestmentWithCurrentValue, SIPWithCurrentValue, GoalProgress } from '@/types'
import { chartsCache } from '../performance/cache-manager'
import { parallelFetcher } from '../performance/parallel-fetcher'
import { performanceMonitor, withPerformanceTracking, trackPerformance } from '../performance/monitoring'

export interface TrendDataPoint {
  date: string
  value: number
  label: string
}

export interface PerformanceDataPoint {
  date: string
  totalValue: number
  totalInvested: number
  gainLoss: number
}

export interface ChartsPageData extends PageDataBase {
  dashboardData: DashboardSummary
  investments: InvestmentWithCurrentValue[]
  sips: SIPWithCurrentValue[]
  portfolioTrendData: TrendDataPoint[]
  investmentGrowthData: TrendDataPoint[]
  goalProgressTrendData: TrendDataPoint[]
  portfolioPerformanceData: {
    '1M': PerformanceDataPoint[]
    '3M': PerformanceDataPoint[]
    '6M': PerformanceDataPoint[]
    '1Y': PerformanceDataPoint[]
    'ALL': PerformanceDataPoint[]
  }
}

export class ChartsDataPreparator extends BaseDataPreparator {
  private readonly CACHE_KEY = 'charts-data'

  async prepare(): Promise<ChartsPageData> {
    return withPerformanceTracking('ChartsDataPreparator.prepare', async () => {
      return this.prepareInternal()
    }, {}, ['charts', 'data-preparation'])
  }

  private async prepareInternal(): Promise<ChartsPageData> {
    const pageStartTime = performance.now()
    
    try {
      // Try to get cached data first
      const cachedData = chartsCache.get(this.CACHE_KEY)
      if (cachedData && typeof cachedData === 'object' && 'dashboardData' in cachedData) {
        const renderTime = performance.now() - pageStartTime
        performanceMonitor.trackPageGeneration('charts', 0, renderTime, true)
        console.log(`[ChartsDataPreparator] Cache HIT - served in ${renderTime.toFixed(2)}ms`)
        return cachedData as ChartsPageData
      }

      const dataStartTime = performance.now()

      // Use optimized parallel fetching for dashboard data
      const dashboardResults = await parallelFetcher.fetchDashboardData()
      const chartsResults = await parallelFetcher.fetchChartsData()

      // Extract data from results with proper type checking
      const investments = Array.isArray(dashboardResults.investments.data) ? dashboardResults.investments.data : []
      const goals = Array.isArray(dashboardResults.goals.data) ? dashboardResults.goals.data : []
      const sips = Array.isArray(dashboardResults.sips.data) ? dashboardResults.sips.data : []
      const portfolioHistory = Array.isArray(chartsResults.portfolioHistory.data) ? chartsResults.portfolioHistory.data : []
      const goalHistory = Array.isArray(chartsResults.goalHistory.data) ? chartsResults.goalHistory.data : []

      // Get price data for all investments and SIPs
      const priceData = await withPerformanceTracking('ChartsDataPreparator.fetchPriceData',
        () => this.fetchPriceData(investments, sips),
        { investmentCount: investments.length, sipCount: sips.length },
        ['charts', 'price-fetch']
      )

      // Transform data to match TypeScript types
      const transformedInvestments = this.transformInvestments(investments)
      const transformedGoals = this.transformGoals(goals)
      const transformedSips = this.transformSips(sips)

      // Calculate investment values with current prices
      const investmentsWithValues = calculateInvestmentsWithPrices(transformedInvestments, priceData)

      // Calculate SIP values with current prices
      const sipsWithValues = transformedSips.map(sip => {
        const currentPrice = sip.symbol ? priceData.get(sip.symbol) : undefined
        return calculateSipValue(sip, sip.transactions, currentPrice)
      })

      // Calculate portfolio summary including SIPs
      const portfolioSummary = calculatePortfolioSummary(investmentsWithValues)
      const sipSummary = calculateSipSummary(sipsWithValues)

      // Combine portfolio and SIP summaries
      const combinedPortfolioSummary = this.combinePortfolioAndSipSummaries(portfolioSummary, sipSummary)

      // Calculate goal progress
      const goalProgress = transformedGoals.map(goal => calculateGoalProgress(goal, investmentsWithValues))

      // Create dashboard summary data
      const dashboardData: DashboardSummary = {
        portfolioSummary: combinedPortfolioSummary,
        goalProgress,
        totalInvestments: investments.length,
        totalGoals: goals.length,
      }

      // Process portfolio trend data
      const portfolioTrendData = this.processPortfolioTrendData(portfolioHistory)
      
      // Process investment growth data (total invested over time)
      const investmentGrowthData = this.processInvestmentGrowthData(portfolioHistory)
      
      // Process goal progress trend data
      const goalProgressTrendData = this.processGoalProgressTrendData(goalHistory, goalProgress)
      
      // Process portfolio performance data for different time ranges
      const portfolioPerformanceData = await withPerformanceTracking('ChartsDataPreparator.processPortfolioPerformanceData',
        () => this.processPortfolioPerformanceData(portfolioHistory, investmentsWithValues),
        { historyCount: portfolioHistory.length },
        ['charts', 'performance-data']
      )

      const result: ChartsPageData = {
        timestamp: new Date(),
        dashboardData,
        investments: investmentsWithValues,
        sips: sipsWithValues,
        portfolioTrendData,
        investmentGrowthData,
        goalProgressTrendData,
        portfolioPerformanceData,
      }

      // Cache the result
      chartsCache.set(this.CACHE_KEY, result)

      const dataPreparationTime = performance.now() - dataStartTime
      const totalTime = performance.now() - pageStartTime
      const renderTime = totalTime - dataPreparationTime
      performanceMonitor.trackPageGeneration('charts', dataPreparationTime, renderTime, false)

      console.log(`[ChartsDataPreparator] Fresh data prepared in ${totalTime.toFixed(2)}ms (data: ${dataPreparationTime.toFixed(2)}ms, render: ${renderTime.toFixed(2)}ms)`)
      return result

    } catch (error) {
      console.error('Charts data preparation failed:', error)
      
      // Try to return stale data as fallback
      const staleData = chartsCache.getStale(this.CACHE_KEY)
      if (staleData && typeof staleData === 'object' && 'dashboardData' in staleData) {
        const renderTime = performance.now() - pageStartTime
        performanceMonitor.trackPageGeneration('charts', 0, renderTime, true)
        console.log(`[ChartsDataPreparator] Error occurred, serving stale data as fallback`)
        return staleData as ChartsPageData
      }
      
      const fallbackData = await this.getFallbackData()
      const totalTime = performance.now() - pageStartTime
      performanceMonitor.trackPageGeneration('charts', totalTime, 0, false)
      return fallbackData
    }
  }

  // Method to invalidate cache when data changes
  static invalidateCache(): void {
    const stats = chartsCache.getStats()
    chartsCache.invalidate()
    console.log(`[ChartsDataPreparator] Cache invalidated (${stats.totalEntries} entries removed, hit rate: ${stats.hitRate.toFixed(2)}%)`)
  }

  // Get performance statistics
  static getPerformanceStats() {
    return {
      cache: chartsCache.getStats(),
      performance: performanceMonitor.getPageMetrics({ pageName: 'charts', limit: 10 })
    }
  }

  private async fetchInvestments() {
    return await prisma.investment.findMany({
      include: {
        goal: true,
        account: true,
      },
    })
  }

  private async fetchGoals() {
    return await prisma.goal.findMany({
      include: {
        investments: true,
      },
    })
  }

  private async fetchSIPs() {
    return await prisma.sIP.findMany({
      include: {
        goal: true,
        account: true,
        transactions: {
          orderBy: {
            transactionDate: 'desc'
          }
        }
      }
    })
  }

  private async fetchPortfolioHistory() {
    try {
      // Get 6 months of portfolio history for trend chart
      const now = new Date()
      const fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())

      return await prisma.portfolioSnapshot.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: now
          }
        },
        orderBy: {
          date: 'asc'
        }
      })
    } catch (error) {
      console.warn('Portfolio snapshots table not found, returning empty array:', error)
      return []
    }
  }

  private async fetchGoalHistory() {
    try {
      // Get 6 months of goal history for trend chart
      const now = new Date()
      const fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())

      return await prisma.goalProgressHistory.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: now
          }
        },
        include: {
          goal: true
        },
        orderBy: {
          date: 'asc'
        }
      })
    } catch (error) {
      console.warn('Goal progress history table not found, returning empty array:', error)
      return []
    }
  }

  private processPortfolioTrendData(portfolioHistory: any[]): TrendDataPoint[] {
    return portfolioHistory.map(snapshot => ({
      date: snapshot.date.toISOString().split('T')[0],
      value: snapshot.totalValue,
      label: `Portfolio value on ${new Date(snapshot.date).toLocaleDateString('en-IN')}: ${new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(snapshot.totalValue)}`
    }))
  }

  private processInvestmentGrowthData(portfolioHistory: any[]): TrendDataPoint[] {
    return portfolioHistory.map(snapshot => ({
      date: snapshot.date.toISOString().split('T')[0],
      value: snapshot.totalInvested || 0,
      label: `Total invested on ${new Date(snapshot.date).toLocaleDateString('en-IN')}: ${new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(snapshot.totalInvested || 0)}`
    }))
  }

  private processGoalProgressTrendData(goalHistory: any[], currentGoalProgress: GoalProgress[]): TrendDataPoint[] {
    if (goalHistory.length === 0) {
      // Fallback to current goal progress if no historical data
      return currentGoalProgress.map((goal, index) => ({
        date: new Date(Date.now() - (currentGoalProgress.length - index) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: goal.progress,
        label: `${goal.name}: ${goal.progress.toFixed(1)}% complete`
      }))
    }

    // Calculate average progress across all goals over time
    const dateProgressMap = new Map<string, { totalProgress: number; goalCount: number }>()
    
    goalHistory.forEach((snapshot: any) => {
      const date = snapshot.date.toISOString().split('T')[0]
      if (!dateProgressMap.has(date)) {
        dateProgressMap.set(date, { totalProgress: 0, goalCount: 0 })
      }
      const current = dateProgressMap.get(date)!
      current.totalProgress += snapshot.progress || 0
      current.goalCount += 1
    })

    // Convert to trend data format
    return Array.from(dateProgressMap.entries())
      .map(([date, data]) => ({
        date,
        value: data.goalCount > 0 ? data.totalProgress / data.goalCount : 0, // Average progress
        label: `Average goal progress on ${new Date(date).toLocaleDateString('en-IN')}: ${data.goalCount > 0 ? (data.totalProgress / data.goalCount).toFixed(1) : '0.0'}%`
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  private async processPortfolioPerformanceData(
    portfolioHistory: any[], 
    investments: InvestmentWithCurrentValue[]
  ): Promise<{
    '1M': PerformanceDataPoint[]
    '3M': PerformanceDataPoint[]
    '6M': PerformanceDataPoint[]
    '1Y': PerformanceDataPoint[]
    'ALL': PerformanceDataPoint[]
  }> {
    const now = new Date()
    
    // Define time ranges
    const timeRanges = {
      '1M': new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
      '3M': new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
      '6M': new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
      '1Y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      'ALL': new Date(2020, 0, 1) // Start from a reasonable date
    }

    const result: any = {}

    // Process each time range
    for (const [range, startDate] of Object.entries(timeRanges)) {
      const filteredHistory = portfolioHistory.filter(snapshot => 
        new Date(snapshot.date) >= startDate
      )

      if (filteredHistory.length > 0) {
        // Use historical data if available
        result[range] = filteredHistory.map(snapshot => ({
          date: snapshot.date.toISOString().split('T')[0],
          totalValue: snapshot.totalValue || 0,
          totalInvested: snapshot.totalInvested || 0,
          gainLoss: (snapshot.totalValue || 0) - (snapshot.totalInvested || 0)
        }))
      } else {
        // Generate fallback data if no historical data
        result[range] = this.generateFallbackPerformanceData(investments, startDate, now)
      }
    }

    return result
  }

  private generateFallbackPerformanceData(
    investments: InvestmentWithCurrentValue[], 
    startDate: Date, 
    endDate: Date
  ): PerformanceDataPoint[] {
    if (!investments || investments.length === 0) return []

    const sortedInvestments = [...investments].sort((a, b) => 
      new Date(a.investment.buyDate).getTime() - new Date(b.investment.buyDate).getTime()
    )

    const dataPoints: PerformanceDataPoint[] = []
    const currentDate = new Date(Math.max(startDate.getTime(), new Date(sortedInvestments[0]?.investment.buyDate || startDate).getTime()))
    
    // Generate monthly data points as fallback
    while (currentDate <= endDate) {
      let totalInvested = 0
      let totalValue = 0

      // Calculate portfolio value at this point in time
      sortedInvestments.forEach(({ investment, currentValue }) => {
        if (new Date(investment.buyDate) <= currentDate) {
          const investedAmount = investment.units && investment.buyPrice 
            ? investment.units * investment.buyPrice 
            : investment.totalValue || 0
          
          totalInvested += investedAmount
          // Use current value as approximation for fallback
          totalValue += currentValue
        }
      })

      if (totalInvested > 0) {
        dataPoints.push({
          date: currentDate.toISOString().split('T')[0],
          totalValue,
          totalInvested,
          gainLoss: totalValue - totalInvested
        })
      }

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return dataPoints
  }

  private combinePortfolioAndSipSummaries(portfolioSummary: any, sipSummary: any) {
    return {
      ...portfolioSummary,
      totalValue: portfolioSummary.totalValue + sipSummary.totalCurrentValue,
      totalInvested: portfolioSummary.totalInvested + sipSummary.totalInvested,
      totalGainLoss: portfolioSummary.totalGainLoss + sipSummary.totalGainLoss,
      totalGainLossPercentage: (portfolioSummary.totalInvested + sipSummary.totalInvested) > 0 
        ? ((portfolioSummary.totalGainLoss + sipSummary.totalGainLoss) / (portfolioSummary.totalInvested + sipSummary.totalInvested)) * 100 
        : 0
    }
  }

  private async getFallbackData(): Promise<ChartsPageData> {
    // Return minimal fallback data in case of errors
    return {
      timestamp: new Date(),
      dashboardData: {
        portfolioSummary: {
          totalValue: 0,
          totalInvested: 0,
          totalGainLoss: 0,
          totalGainLossPercentage: 0,
          assetAllocation: {},
          accountDistribution: {}
        },
        goalProgress: [],
        totalInvestments: 0,
        totalGoals: 0
      },
      investments: [],
      sips: [],
      portfolioTrendData: [],
      investmentGrowthData: [],
      goalProgressTrendData: [],
      portfolioPerformanceData: {
        '1M': [],
        '3M': [],
        '6M': [],
        '1Y': [],
        'ALL': []
      }
    }
  }
}