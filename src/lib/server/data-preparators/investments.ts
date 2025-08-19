import { prisma } from '@/lib/prisma'
import { 
  calculateInvestmentsWithPrices,
  calculateInvestmentValue
} from '@/lib/calculations'
import { BaseDataPreparator, PageDataBase } from './base'
import { 
  InvestmentWithCurrentValue, 
  Investment, 
  Goal, 
  Account
} from '@/types'
import { OptimizedDataPreparator } from '../performance/optimized-preparators'
import { queryOptimizer } from '../performance/query-optimizer'
import { withPerformanceTracking } from '../performance/monitoring'

export interface InvestmentsPageData extends PageDataBase {
  investments: Investment[]
  investmentsWithValues: InvestmentWithCurrentValue[]
  goals: Goal[]
  accounts: Account[]
  totalInvestments: number
  priceData: Map<string, number>
  lastPriceUpdate: Date
}

export class InvestmentsDataPreparator extends BaseDataPreparator {
  private readonly CACHE_KEY = 'investments-list'

  async prepare(): Promise<InvestmentsPageData> {
    return withPerformanceTracking('InvestmentsDataPreparator.prepare', async () => {
      return this.prepareInternal()
    }, {}, ['investments', 'data-preparation'])
  }

  private async prepareInternal(): Promise<InvestmentsPageData> {
    const pageStartTime = performance.now()
    
    try {
      // Always fetch fresh user data from database - no caching for user CRUD operations
      console.log(`[InvestmentsDataPreparator] Fetching fresh user data (no cache)`)
      const dataStartTime = performance.now()
      const freshData = await this.fetchFreshData()
      const dataPreparationTime = performance.now() - dataStartTime
      
      const totalTime = performance.now() - pageStartTime
      const renderTime = totalTime - dataPreparationTime
      
      console.log(`[InvestmentsDataPreparator] Fresh data fetched in ${totalTime.toFixed(2)}ms (data: ${dataPreparationTime.toFixed(2)}ms, render: ${renderTime.toFixed(2)}ms)`)
      return freshData

    } catch (error) {
      console.error('Investments data preparation failed:', error)
      
      // Return minimal fallback data
      const fallbackData = await this.getFallbackData()
      const totalTime = performance.now() - pageStartTime
      return fallbackData
    }
  }

  private async fetchFreshData(): Promise<InvestmentsPageData> {
    // Always fetch fresh user data from database - no caching for user CRUD operations
    const [investments, goals, accounts] = await Promise.all([
      // Direct database queries without caching for user data
      prisma.investment.findMany({
        include: {
          goal: true,
          account: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.goal.findMany({
        include: {
          investments: true
        },
        orderBy: {
          targetDate: 'asc'
        }
      }),
      prisma.account.findMany({
        include: {
          investments: true
        },
        orderBy: {
          name: 'asc'
        }
      })
    ])

    // Check if force refresh is requested
    const forceRefresh = (global as any).forceRefreshPrices || false

    // Get price data for all investments
    let priceData: Map<string, number>
    try {
      priceData = await withPerformanceTracking('InvestmentsDataPreparator.fetchPriceData',
        () => this.fetchPriceData(investments, [], forceRefresh),
        { investmentCount: investments.length, forceRefresh },
        ['investments', 'price-fetch']
      )
    } catch (priceError) {
      console.error('Price data fetch failed, using empty price data:', priceError)
      priceData = new Map()
    }

    // Transform data to match TypeScript types
    const transformedInvestments = this.transformInvestments(investments)
    const transformedGoals = this.transformGoals(goals)
    const transformedAccounts = this.transformAccounts(accounts)

    // Calculate investment values with current prices
    const investmentsWithValues = await withPerformanceTracking('InvestmentsDataPreparator.calculateValues',
      () => Promise.resolve(calculateInvestmentsWithPrices(transformedInvestments, priceData)),
      { investmentCount: transformedInvestments.length },
      ['investments', 'calculation']
    )

    return {
      timestamp: new Date(),
      investments: transformedInvestments,
      investmentsWithValues,
      goals: transformedGoals,
      accounts: transformedAccounts,
      totalInvestments: investments.length,
      priceData,
      lastPriceUpdate: new Date()
    }
  }

  private transformAccounts(accounts: any[]) {
    return accounts.map(account => ({
      ...account,
      notes: account.notes ?? undefined,
      investments: account.investments?.map((investment: any) => ({
        ...investment,
        symbol: investment.symbol ?? undefined,
        units: investment.units ?? undefined,
        buyPrice: investment.buyPrice ?? undefined,
        quantity: investment.quantity ?? undefined,
        totalValue: investment.totalValue ?? undefined,
        goalId: investment.goalId ?? undefined,
        notes: investment.notes ?? undefined,
      })) || []
    }))
  }

  private async getFallbackData(): Promise<InvestmentsPageData> {
    return {
      timestamp: new Date(),
      investments: [],
      investmentsWithValues: [],
      goals: [],
      accounts: [],
      totalInvestments: 0,
      priceData: new Map(),
      lastPriceUpdate: new Date()
    }
  }

  // No cache invalidation needed - user data is always fetched fresh
  static invalidateCache(): void {
    console.log('[InvestmentsDataPreparator] No cache invalidation needed - user data always fresh')
  }
}