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
import { DashboardSummary, PortfolioSummary, GoalProgress, InvestmentWithCurrentValue, SIPWithCurrentValue, SIPSummary } from '@/types'
import { unstable_cache } from 'next/cache'
import { dashboardCache, createOptimizedCache } from '../performance/cache-manager'
import { parallelFetcher } from '../performance/parallel-fetcher'
import { queryOptimizer } from '../performance/query-optimizer'
import { performanceMonitor, withPerformanceTracking, trackPerformance } from '../performance/monitoring'





export interface DashboardPageData extends PageDataBase {
  portfolioSummary: PortfolioSummary
  sipSummary: SIPSummary
  goalProgress: GoalProgress[]
  topPerformers: {
    topGainers: InvestmentWithCurrentValue[]
    topLosers: InvestmentWithCurrentValue[]
    topPercentageGainers: InvestmentWithCurrentValue[]
    topPercentageLosers: InvestmentWithCurrentValue[]
  }
  investmentsWithValues: InvestmentWithCurrentValue[]
  sipsWithValues: SIPWithCurrentValue[]
  totalInvestments: number
  totalSIPs: number
  totalGoals: number
}

export class DashboardDataPreparator extends BaseDataPreparator {
  private readonly CACHE_KEY = 'dashboard-data'

  async prepare(): Promise<DashboardPageData> {
    return withPerformanceTracking('DashboardDataPreparator.prepare', async () => {
      return this.prepareInternal()
    }, {}, ['dashboard', 'data-preparation'])
  }

  private async prepareInternal(): Promise<DashboardPageData> {
    const pageStartTime = performance.now()
    
    try {
      // Try to get fresh data from cache
      const cachedData = dashboardCache.get(this.CACHE_KEY)
      if (cachedData && typeof cachedData === 'object' && 'portfolioSummary' in cachedData) {
        const renderTime = performance.now() - pageStartTime
        performanceMonitor.trackPageGeneration('dashboard', 0, renderTime, true)
        console.log(`[DashboardDataPreparator] Cache HIT - served in ${renderTime.toFixed(2)}ms`)
        return cachedData as DashboardPageData
      }

      // Check if we have stale data while we fetch fresh data
      const staleData = dashboardCache.getStale(this.CACHE_KEY)
      
      // If we have stale data, return it immediately and refresh in background
      if (staleData && typeof staleData === 'object' && 'portfolioSummary' in staleData) {
        const renderTime = performance.now() - pageStartTime
        performanceMonitor.trackPageGeneration('dashboard', 0, renderTime, true)
        console.log(`[DashboardDataPreparator] Serving stale data while revalidating - served in ${renderTime.toFixed(2)}ms`)
        
        // Refresh in background (don't await)
        this.refreshDataInBackground().catch(error => {
          console.error('Background refresh failed:', error)
        })
        
        return staleData as DashboardPageData
      }

      // No cached data available, fetch fresh data
      console.log(`[DashboardDataPreparator] Cache MISS - fetching fresh data`)
      const dataStartTime = performance.now()
      const freshData = await this.fetchFreshData()
      const dataPreparationTime = performance.now() - dataStartTime
      
      // Cache the fresh data
      dashboardCache.set(this.CACHE_KEY, freshData)
      
      const totalTime = performance.now() - pageStartTime
      const renderTime = totalTime - dataPreparationTime
      performanceMonitor.trackPageGeneration('dashboard', dataPreparationTime, renderTime, false)
      
      console.log(`[DashboardDataPreparator] Fresh data fetched and cached in ${totalTime.toFixed(2)}ms (data: ${dataPreparationTime.toFixed(2)}ms, render: ${renderTime.toFixed(2)}ms)`)
      return freshData

    } catch (error) {
      console.error('Dashboard data preparation failed:', error)
      
      // Try to return stale data as fallback
      const staleData = dashboardCache.getStale(this.CACHE_KEY)
      if (staleData && typeof staleData === 'object' && 'portfolioSummary' in staleData) {
        const renderTime = performance.now() - pageStartTime
        performanceMonitor.trackPageGeneration('dashboard', 0, renderTime, true)
        console.log(`[DashboardDataPreparator] Error occurred, serving stale data as fallback`)
        return staleData as DashboardPageData
      }
      
      // Last resort: return minimal fallback data
      const fallbackData = await this.getFallbackData()
      const totalTime = performance.now() - pageStartTime
      performanceMonitor.trackPageGeneration('dashboard', totalTime, 0, false)
      return fallbackData
    }
  }

  private async refreshDataInBackground(): Promise<void> {
    return withPerformanceTracking('DashboardDataPreparator.backgroundRefresh', async () => {
      const freshData = await this.fetchFreshData()
      dashboardCache.set(this.CACHE_KEY, freshData)
      console.log(`[DashboardDataPreparator] Background refresh completed`)
    }, {}, ['dashboard', 'background-refresh'])
  }

  private async fetchFreshData(): Promise<DashboardPageData> {
    return withPerformanceTracking('DashboardDataPreparator.fetchFreshData', async () => {
      return this.fetchFreshDataInternal()
    }, {}, ['dashboard', 'data-fetch'])
  }

  private async fetchFreshDataInternal(): Promise<DashboardPageData> {
    const context = this.createErrorContext('fetchFreshData')
    const errorMessages: string[] = []
    let hasErrors = false

    try {
      // Use optimized parallel fetching with error handling
      const fetchResults = await this.safeDbOperation(
        () => parallelFetcher.fetchDashboardData(),
        'fetchDashboardData',
        async () => {
          // Fallback: fetch data individually
          console.warn('Parallel fetch failed, falling back to individual queries')
          const [investments, goals, sips, accounts] = await Promise.allSettled([
            prisma.investment.findMany({ include: { account: true, goal: true } }),
            prisma.goal.findMany({ include: { investments: true } }),
            prisma.sIP.findMany({ include: { account: true, goal: true, transactions: true } }),
            prisma.account.findMany({ include: { investments: true } })
          ])
          
          return {
            investments: { data: investments.status === 'fulfilled' ? investments.value : [], error: investments.status === 'rejected' ? investments.reason : null, duration: 0 },
            goals: { data: goals.status === 'fulfilled' ? goals.value : [], error: goals.status === 'rejected' ? goals.reason : null, duration: 0 },
            sips: { data: sips.status === 'fulfilled' ? sips.value : [], error: sips.status === 'rejected' ? sips.reason : null, duration: 0 },
            accounts: { data: accounts.status === 'fulfilled' ? accounts.value : [], error: accounts.status === 'rejected' ? accounts.reason : null, duration: 0 }
          }
        }
      )
      
      // Check for any fetch errors
      const errors = Object.entries(fetchResults)
        .filter(([_, result]) => result.error)
        .map(([key, result]) => ({ key, error: result.error }))
      
      if (errors.length > 0) {
        hasErrors = true
        errors.forEach(({ key, error }) => {
          errorMessages.push(`Failed to load ${key} data`)
          if (error) {
            this.logger.logError(error, this.createErrorContext(`fetch${key}Data`))
          }
        })
        console.warn('[DashboardDataPreparator] Some data fetch operations failed:', errors)
      }

      // Extract successful results with proper type checking
      const investments = Array.isArray(fetchResults.investments.data) ? fetchResults.investments.data : []
      const goals = Array.isArray(fetchResults.goals.data) ? fetchResults.goals.data : []
      const sips = Array.isArray(fetchResults.sips.data) ? fetchResults.sips.data : []

      // Get price data for all investments and SIPs with graceful degradation
      const priceData = await this.safeCalculation(
        () => withPerformanceTracking('DashboardDataPreparator.fetchPriceData', 
          () => this.fetchPriceData(investments, sips),
          { investmentCount: investments.length, sipCount: sips.length },
          ['dashboard', 'price-fetch']
        ),
        'fetchPriceData',
        () => {
          hasErrors = true
          errorMessages.push('Price data temporarily unavailable')
          return new Map<string, number>()
        }
      )

      // Transform data to match TypeScript types with error handling
      const transformedInvestments = await this.safeCalculation(
        () => this.transformInvestments(investments),
        'transformInvestments',
        () => []
      )
      
      const transformedGoals = await this.safeCalculation(
        () => this.transformGoals(goals),
        'transformGoals',
        () => []
      )
      
      const transformedSips = await this.safeCalculation(
        () => this.transformSips(sips),
        'transformSips',
        () => []
      )

      // Calculate investment values with current prices
      const investmentsWithValues = await this.safeCalculation(
        () => calculateInvestmentsWithPrices(transformedInvestments, priceData),
        'calculateInvestmentsWithPrices',
        () => {
          hasErrors = true
          errorMessages.push('Investment value calculations failed')
          return []
        }
      )

      // Calculate SIP values with current prices
      const sipsWithValues = await this.safeCalculation(
        () => transformedSips.map(sip => {
          const currentPrice = sip.symbol ? priceData.get(sip.symbol) : undefined
          return calculateSipValue(sip, sip.transactions, currentPrice)
        }),
        'calculateSipValues',
        () => {
          hasErrors = true
          errorMessages.push('SIP value calculations failed')
          return []
        }
      )

      // Calculate portfolio summary including SIPs
      const portfolioSummary = await this.safeCalculation(
        () => calculatePortfolioSummary(investmentsWithValues),
        'calculatePortfolioSummary',
        () => ({
          totalValue: 0,
          totalInvested: 0,
          totalGainLoss: 0,
          totalGainLossPercentage: 0,
          assetAllocation: {},
          accountDistribution: {}
        })
      )

      const sipSummary = await this.safeCalculation(
        () => calculateSipSummary(sipsWithValues),
        'calculateSipSummary',
        () => ({
          totalSIPs: 0,
          activeSIPs: 0,
          totalMonthlyAmount: 0,
          totalInvested: 0,
          totalCurrentValue: 0,
          totalGainLoss: 0,
          totalGainLossPercentage: 0
        })
      )

      // Combine portfolio and SIP summaries
      const combinedPortfolioSummary = await this.safeCalculation(
        () => this.combinePortfolioAndSipSummaries(portfolioSummary, sipSummary),
        'combinePortfolioAndSipSummaries',
        () => portfolioSummary
      )

      // Calculate goal progress
      const goalProgress = await this.safeCalculation(
        () => transformedGoals.map(goal => calculateGoalProgress(goal, investmentsWithValues)),
        'calculateGoalProgress',
        () => {
          hasErrors = true
          errorMessages.push('Goal progress calculations failed')
          return []
        }
      )

      // Get top performers data
      const topPerformers = await this.safeCalculation(
        () => getTopPerformers(investmentsWithValues, 5),
        'getTopPerformers',
        () => ({
          topGainers: [],
          topLosers: [],
          topPercentageGainers: [],
          topPercentageLosers: []
        })
      )

      return {
        timestamp: new Date(),
        cacheKey: this.CACHE_KEY,
        hasErrors,
        errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
        degradedData: hasErrors,
        portfolioSummary: combinedPortfolioSummary,
        sipSummary,
        goalProgress,
        topPerformers: {
          topGainers: topPerformers.topGainers,
          topLosers: topPerformers.topLosers,
          topPercentageGainers: topPerformers.topPercentageGainers,
          topPercentageLosers: topPerformers.topPercentageLosers,
        },
        investmentsWithValues,
        sipsWithValues,
        totalInvestments: investments.length,
        totalSIPs: sips.length,
        totalGoals: goals.length,
      }
    } catch (error) {
      console.error('Fresh data fetch failed:', error)
      throw error
    }
  }

  // Method to invalidate cache when data changes
  static invalidateCache(): void {
    const stats = dashboardCache.getStats()
    dashboardCache.invalidate() // Clear all cache entries to ensure fresh data
    console.log(`[DashboardDataPreparator] Cache invalidated (${stats.totalEntries} entries removed, hit rate: ${stats.hitRate.toFixed(2)}%)`)
  }

  // Method to force refresh
  async forceRefresh(): Promise<DashboardPageData> {
    dashboardCache.invalidate(this.CACHE_KEY)
    return this.prepare()
  }

  // Get performance statistics
  static getPerformanceStats() {
    return {
      cache: dashboardCache.getStats(),
      performance: performanceMonitor.getPageMetrics({ pageName: 'dashboard', limit: 10 }),
      queries: queryOptimizer.getQueryMetrics().filter(m => m.query.includes('dashboard')).slice(-10)
    }
  }

  private combinePortfolioAndSipSummaries(portfolioSummary: PortfolioSummary, sipSummary: SIPSummary): PortfolioSummary {
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

  private async getFallbackData(): Promise<DashboardPageData> {
    // Return minimal fallback data in case of critical errors
    return {
      timestamp: new Date(),
      hasErrors: true,
      errorMessages: ['Dashboard data is temporarily unavailable'],
      degradedData: true,
      portfolioSummary: {
        totalValue: 0,
        totalInvested: 0,
        totalGainLoss: 0,
        totalGainLossPercentage: 0,
        assetAllocation: {},
        accountDistribution: {}
      },
      sipSummary: {
        totalSIPs: 0,
        activeSIPs: 0,
        totalMonthlyAmount: 0,
        totalInvested: 0,
        totalCurrentValue: 0,
        totalGainLoss: 0,
        totalGainLossPercentage: 0
      },
      goalProgress: [],
      topPerformers: {
        topGainers: [],
        topLosers: [],
        topPercentageGainers: [],
        topPercentageLosers: []
      },
      investmentsWithValues: [],
      sipsWithValues: [],
      totalInvestments: 0,
      totalSIPs: 0,
      totalGoals: 0
    }
  }
}