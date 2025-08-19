import { prisma } from '@/lib/prisma'
import { 
  calculateInvestmentsWithPrices, 
  calculatePortfolioSummary, 
  calculateGoalProgress,
  getTopPerformers,
  calculateSipValue,
  calculateSipSummary
} from '@/lib/calculations'
import { batchGetPrices } from '@/lib/price-fetcher'
import { 
  withErrorHandling, 
  withGracefulDegradation,
  ServerErrorContext,
  DataPreparationError,
  ExternalServiceError,
  DatabaseError,
  ServerErrorLogger
} from '../error-handling'

export interface PageDataBase {
  timestamp: Date
  cacheKey?: string
  hasErrors?: boolean
  errorMessages?: string[]
  degradedData?: boolean
}

export abstract class BaseDataPreparator {
  protected readonly logger = ServerErrorLogger.getInstance()

  protected createErrorContext(operation: string, metadata?: Record<string, any>): ServerErrorContext {
    return {
      operation: `${this.constructor.name}.${operation}`,
      timestamp: new Date(),
      metadata
    }
  }

  protected async fetchPriceData(investments: any[], sips: any[] = [], forceRefresh: boolean = false): Promise<Map<string, number>> {
    const context = this.createErrorContext('fetchPriceData', {
      investmentCount: investments.length,
      sipCount: sips.length,
      forceRefresh
    })

    return withErrorHandling(
      async () => {
        // Get all investments with symbols for price fetching (unified approach)
        const investmentsWithSymbols = investments.filter(inv => 
          inv.symbol && ['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(inv.type)
        )

        // Add SIP symbols for price fetching
        const sipSymbols = sips.filter(sip => sip.symbol).map(sip => sip.symbol)
        
        // Combine all symbols for unified price fetching
        const allSymbols = [
          ...investmentsWithSymbols.map(inv => inv.symbol!),
          ...sipSymbols
        ]
        const uniqueSymbols = [...new Set(allSymbols)]

        const priceData = new Map<string, number>()

        if (forceRefresh) {
          console.log('[FORCE REFRESH] Fetching fresh prices from unified API, bypassing cache')
          
          // Force refresh: Always fetch fresh data from unified API
          if (uniqueSymbols.length > 0) {
            await withGracefulDegradation(
              () => batchGetPrices(uniqueSymbols).then(results => {
                results.forEach(result => {
                  if (result.price !== null) {
                    priceData.set(result.symbol, result.price)
                  }
                })
              }),
              async () => {
                console.warn('Unified price fetching failed during force refresh')
              },
              this.createErrorContext('forceRefreshUnifiedPrices', { symbolCount: uniqueSymbols.length })
            )
          }
          
          console.log(`[FORCE REFRESH] Fetched ${priceData.size} fresh prices from unified API`)
          return priceData
        }

        // Normal flow: Use cache-first approach
        // Get cached price data first with error handling
        const priceCache = await withErrorHandling(
          () => prisma.priceCache.findMany(),
          this.createErrorContext('fetchPriceCache'),
          async () => {
            console.warn('Price cache unavailable, using empty cache')
            return []
          }
        )

        priceCache.forEach(cache => {
          priceData.set(cache.symbol, cache.price)
        })

        // Identify symbols that need fresh price data (not in cache or stale)
        const CACHE_VALIDITY = 60 * 60 * 1000 // 1 hour
        const now = Date.now()
        
        const staleSymbols = uniqueSymbols.filter(symbol => {
          const cached = priceCache.find(cache => cache.symbol === symbol)
          return !cached || (now - cached.lastUpdated.getTime()) > CACHE_VALIDITY
        })

        // Fetch fresh prices for stale data with graceful degradation using unified API
        if (staleSymbols.length > 0) {
          await withGracefulDegradation(
            () => batchGetPrices(staleSymbols).then(results => {
              results.forEach(result => {
                if (result.price !== null) {
                  priceData.set(result.symbol, result.price)
                }
              })
            }),
            async () => {
              console.warn('Unified price fetching failed, using cached prices only')
            },
            this.createErrorContext('fetchUnifiedPrices', { symbolCount: staleSymbols.length })
          )
        }

        return priceData
      },
      context,
      async () => {
        // Fallback: return empty price data
        console.warn('Price data fetching completely failed, using empty price data')
        return new Map<string, number>()
      }
    )
  }

  protected transformInvestments(investments: any[]) {
    return investments.map(investment => ({
      ...investment,
      symbol: investment.symbol ?? undefined,
      units: investment.units ?? undefined,
      buyPrice: investment.buyPrice ?? undefined,
      quantity: investment.quantity ?? undefined,
      totalValue: investment.totalValue ?? undefined,
      goalId: investment.goalId ?? undefined,
      notes: investment.notes ?? undefined,
      goal: investment.goal ? {
        ...investment.goal,
        priority: investment.goal.priority ?? undefined,
        description: investment.goal.description ?? undefined,
      } : undefined,
      account: investment.account ? {
        ...investment.account,
        notes: investment.account.notes ?? undefined,
      } : investment.account,
    }))
  }

  protected transformGoals(goals: any[]) {
    return goals.map(goal => ({
      ...goal,
      priority: goal.priority ?? undefined,
      description: goal.description ?? undefined,
      investments: goal.investments?.map((investment: any) => ({
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

  protected transformSips(sips: any[]) {
    return sips.map(sip => {
      const { transactions, ...sipWithoutTransactions } = sip
      return {
        ...sipWithoutTransactions,
        endDate: sip.endDate ?? undefined,
        goalId: sip.goalId ?? undefined,
        notes: sip.notes ?? undefined,
        goal: sip.goal ? {
          ...sip.goal,
          priority: sip.goal.priority ?? undefined,
          description: sip.goal.description ?? undefined,
        } : undefined,
        account: sip.account ? {
          ...sip.account,
          notes: sip.account.notes ?? undefined,
        } : sip.account,
        transactions: sip.transactions?.map((txn: any) => ({
          ...txn,
          errorMessage: txn.errorMessage ?? undefined
        })) || []
      }
    })
  }

  protected async handleError<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    const context = this.createErrorContext('handleError', { errorMessage })
    
    return withErrorHandling(
      operation,
      context,
      fallback
    )
  }

  // Enhanced error handling methods
  protected async safeDbOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const context = this.createErrorContext(`safeDbOperation.${operationName}`)
    
    return withErrorHandling(
      operation,
      context,
      fallback
    )
  }

  protected async safeCalculation<T>(
    calculation: () => T | Promise<T>,
    calculationName: string,
    fallback: () => T | Promise<T>
  ): Promise<T> {
    const context = this.createErrorContext(`safeCalculation.${calculationName}`)
    
    try {
      return await calculation()
    } catch (error) {
      this.logger.logError(
        error instanceof Error ? error : new Error('Calculation failed'),
        context
      )
      console.warn(`[${calculationName}] Calculation failed, using fallback`)
      return await fallback()
    }
  }

  // Utility to create fallback data with error indicators
  protected createFallbackPageData<T extends PageDataBase>(
    baseData: Omit<T, keyof PageDataBase>,
    errorMessages: string[] = ['Some data could not be loaded']
  ): T {
    return {
      ...baseData,
      timestamp: new Date(),
      hasErrors: true,
      errorMessages,
      degradedData: true
    } as T
  }
}