import { prisma } from '@/lib/prisma'
import { 
  calculateInvestmentsWithPrices,
  calculateInvestmentValue
} from '@/lib/calculations'
import { PageDataBase } from './base'
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

export class InvestmentsDataPreparator extends OptimizedDataPreparator<InvestmentsPageData> {
  constructor() {
    super({
      cacheKey: 'investments-list',
      pageName: 'investments',
      cacheType: 'list',
      enableStaleWhileRevalidate: true
    })
  }

  protected async fetchFreshData(): Promise<InvestmentsPageData> {
    // Use optimized database queries
    const [investments, goals, accounts] = await Promise.all([
      this.executeOptimizedQuery('fetchInvestments', () => 
        queryOptimizer.getOptimizedInvestments({
          includeGoal: true,
          includeAccount: true
        })
      ),
      this.executeOptimizedQuery('fetchGoals', () => 
        queryOptimizer.getOptimizedGoals({
          includeInvestments: true
        })
      ),
      this.executeOptimizedQuery('fetchAccounts', () => 
        queryOptimizer.getOptimizedAccounts({
          includeInvestments: true
        })
      )
    ])

    // Get price data for all investments
    let priceData: Map<string, number>
    try {
      priceData = await withPerformanceTracking('InvestmentsDataPreparator.fetchPriceData',
        () => this.fetchPriceData(investments),
        { investmentCount: investments.length },
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

  protected async getFallbackData(): Promise<InvestmentsPageData> {
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

  // Method to invalidate cache when data changes
  static invalidateCache(): void {
    const preparator = new InvestmentsDataPreparator()
    preparator.invalidateCache()
    console.log('[InvestmentsDataPreparator] Cache invalidated')
  }
}