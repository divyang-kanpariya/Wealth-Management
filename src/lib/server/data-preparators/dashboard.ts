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
      // Always fetch fresh user data from database - no caching for user CRUD operations
      // Only pricing data will be cached separately
      console.log(`[DashboardDataPreparator] Fetching fresh user data (no cache)`)
      const dataStartTime = performance.now()
      const freshData = await this.fetchFreshData()
      const dataPreparationTime = performance.now() - dataStartTime
      
      const totalTime = performance.now() - pageStartTime
      const renderTime = totalTime - dataPreparationTime
      performanceMonitor.trackPageGeneration('dashboard', dataPreparationTime, renderTime, false)
      
      console.log(`[DashboardDataPreparator] Fresh data fetched in ${totalTime.toFixed(2)}ms (data: ${dataPreparationTime.toFixed(2)}ms, render: ${renderTime.toFixed(2)}ms)`)
      return freshData

    } catch (error) {
      console.error('Dashboard data preparation failed:', error)
      
      // Return minimal fallback data
      const fallbackData = await this.getFallbackData()
      const totalTime = performance.now() - pageStartTime
      performanceMonitor.trackPageGeneration('dashboard', totalTime, 0, false)
      return fallbackData
    }
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
      // Always fetch fresh user data from database - no caching for user CRUD operations
      const fetchResults = await this.safeDbOperation(
        async () => {
          const [investments, goals, sips, accounts] = await Promise.allSettled([
            prisma.investment.findMany({ 
              include: { account: true, goal: true },
              orderBy: { createdAt: 'desc' }
            }),
            prisma.goal.findMany({ 
              include: { investments: true },
              orderBy: { targetDate: 'asc' }
            }),
            prisma.sIP.findMany({ 
              include: { account: true, goal: true, transactions: true },
              orderBy: { createdAt: 'desc' }
            }),
            prisma.account.findMany({ 
              include: { investments: true },
              orderBy: { name: 'asc' }
            })
          ])
          
          return {
            investments: { data: investments.status === 'fulfilled' ? investments.value : [], error: investments.status === 'rejected' ? investments.reason : null, duration: 0 },
            goals: { data: goals.status === 'fulfilled' ? goals.value : [], error: goals.status === 'rejected' ? goals.reason : null, duration: 0 },
            sips: { data: sips.status === 'fulfilled' ? sips.value : [], error: sips.status === 'rejected' ? sips.reason : null, duration: 0 },
            accounts: { data: accounts.status === 'fulfilled' ? accounts.value : [], error: accounts.status === 'rejected' ? accounts.reason : null, duration: 0 }
          }
        },
        'fetchDashboardData',
        async () => {
          // Fallback: return empty data
          console.warn('Dashboard data fetch failed, returning empty data')
          return {
            investments: { data: [], error: null, duration: 0 },
            goals: { data: [], error: null, duration: 0 },
            sips: { data: [], error: null, duration: 0 },
            accounts: { data: [], error: null, duration: 0 }
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

      // Check if force refresh is requested
      const forceRefresh = (global as any).forceRefreshPrices || false

      // Get price data for all investments and SIPs with graceful degradation
      const priceData = await this.safeCalculation(
        () => withPerformanceTracking('DashboardDataPreparator.fetchPriceData', 
          () => this.fetchPriceData(investments, sips, forceRefresh),
          { investmentCount: investments.length, sipCount: sips.length, forceRefresh },
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

  // No cache invalidation needed - user data is always fetched fresh
  static invalidateCache(): void {
    console.log(`[DashboardDataPreparator] No cache invalidation needed - user data always fresh`)
  }

  // Method to force refresh (only affects pricing data)
  async forceRefresh(): Promise<DashboardPageData> {
    // Set global flag to force refresh pricing data
    ;(global as any).forceRefreshPrices = true
    const result = await this.prepare()
    // Reset flag after use
    ;(global as any).forceRefreshPrices = false
    return result
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