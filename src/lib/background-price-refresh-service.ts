import { PrismaClient } from '@prisma/client'
import { 
  batchGetPrices,
  getAllTrackedSymbols 
} from './price-fetcher'

const prisma = new PrismaClient()

/**
 * Background Price Refresh Service
 * 
 * Handles scheduled price updates every hour with batch processing
 * to respect API rate limits and ensure all pricing data is stored
 * in the database PriceCache table only.
 */

export interface RefreshResult {
  success: number
  failed: number
  results: Array<{
    symbol: string
    success: boolean
    price?: number
    error?: string
    refreshTime: number
  }>
}

export interface BatchProcessingConfig {
  batchSize: number
  rateLimitDelay: number // milliseconds between batches
  maxRetries: number
  retryDelay: number // milliseconds between retries
}

export class BackgroundPriceRefreshService {
  private refreshInterval: NodeJS.Timeout | null = null
  private readonly DEFAULT_INTERVAL = 60 * 60 * 1000 // 1 hour
  private currentIntervalMs: number | null = null
  private readonly config: BatchProcessingConfig = {
    batchSize: 10,
    rateLimitDelay: 2000, // 2 seconds between batches
    maxRetries: 3,
    retryDelay: 1000 // 1 second between retries
  }
  private isRefreshing = false

  /**
   * Start scheduled price refresh service
   */
  async startScheduledRefresh(intervalMs: number = this.DEFAULT_INTERVAL): Promise<void> {
    if (this.refreshInterval) {
      console.log('[BackgroundPriceRefresh] Service already running')
      return
    }

    this.currentIntervalMs = intervalMs
    console.log(`[BackgroundPriceRefresh] Starting service with ${intervalMs / 1000 / 60} minute intervals`)

    // Run initial refresh
    await this.performScheduledRefresh()

    // Set up recurring refresh
    this.refreshInterval = setInterval(async () => {
      await this.performScheduledRefresh()
    }, intervalMs)
  }

  /**
   * Stop scheduled price refresh service
   */
  stopScheduledRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
      this.currentIntervalMs = null
      console.log('[BackgroundPriceRefresh] Service stopped')
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    running: boolean
    isRefreshing: boolean
    intervalMs: number | null
    config: BatchProcessingConfig
  } {
    return {
      running: this.refreshInterval !== null,
      isRefreshing: this.isRefreshing,
      intervalMs: this.currentIntervalMs,
      config: this.config
    }
  }

  /**
   * Perform scheduled refresh with comprehensive error handling
   */
  private async performScheduledRefresh(): Promise<void> {
    if (this.isRefreshing) {
      console.log('[BackgroundPriceRefresh] Refresh already in progress, skipping')
      return
    }

    this.isRefreshing = true
    const startTime = Date.now()

    try {
      console.log('[BackgroundPriceRefresh] Starting scheduled refresh...')
      
      const symbols = await getAllTrackedSymbols()
      console.log(`[BackgroundPriceRefresh] Found ${symbols.length} symbols to refresh`)

      if (symbols.length === 0) {
        console.log('[BackgroundPriceRefresh] No symbols to refresh')
        return
      }

      const result = await this.batchRefreshPrices(symbols)
      const duration = Date.now() - startTime

      console.log(`[BackgroundPriceRefresh] Completed in ${duration}ms: ${result.success} success, ${result.failed} failed`)

      if (result.failed > 0) {
        console.warn(`[BackgroundPriceRefresh] ${result.failed} symbols failed to refresh`)
        // Log first few errors for debugging
        const errors = result.results.filter(r => !r.success).slice(0, 5)
        errors.forEach(error => {
          console.warn(`[BackgroundPriceRefresh] ${error.symbol}: ${error.error}`)
        })
      }

    } catch (error) {
      console.error('[BackgroundPriceRefresh] Scheduled refresh failed:', error)
    } finally {
      this.isRefreshing = false
    }
  }

  /**
   * Batch refresh prices with rate limiting and retry logic
   */
  async batchRefreshPrices(symbols: string[]): Promise<RefreshResult> {
    const results: RefreshResult = { success: 0, failed: 0, results: [] }

    // Use unified price fetching for all symbols (stocks and mutual funds)
    console.log(`[BackgroundPriceRefresh] Processing ${symbols.length} symbols using unified API`)

    // Process all symbols in batches using unified approach
    if (symbols.length > 0) {
      await this.processBatchedSymbols(symbols, results)
    }

    return results
  }

  /**
   * Process symbols in batches with rate limiting using unified API
   */
  private async processBatchedSymbols(
    symbols: string[], 
    results: RefreshResult
  ): Promise<void> {
    const { batchSize, rateLimitDelay } = this.config

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      
      console.log(`[BackgroundPriceRefresh] Processing unified batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)} (${batch.length} symbols)`)

      await this.processUnifiedBatch(batch, results)

      // Rate limiting delay between batches (except for the last batch)
      if (i + batchSize < symbols.length) {
        console.log(`[BackgroundPriceRefresh] Rate limiting delay: ${rateLimitDelay}ms`)
        await this.delay(rateLimitDelay)
      }
    }
  }

  /**
   * Process a batch of symbols using unified price fetching (stocks and mutual funds)
   */
  private async processUnifiedBatch(symbols: string[], results: RefreshResult): Promise<void> {
    try {
      const batchResults = await this.executeWithRetry(() => batchGetPrices(symbols))

      // Process each result from the unified batch
      for (const result of batchResults) {
        const refreshTime = Date.now()

        if (result.price !== null && result.price > 0) {
          try {
            // Update cache and save history (cache update is already handled by batchGetPrices)
            results.success++
            results.results.push({
              symbol: result.symbol,
              success: true,
              price: result.price,
              refreshTime
            })
          } catch (error) {
            results.failed++
            results.results.push({
              symbol: result.symbol,
              success: false,
              error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              refreshTime
            })
          }
        } else {
          results.failed++
          results.results.push({
            symbol: result.symbol,
            success: false,
            error: result.error || 'Price not available or invalid',
            refreshTime
          })
        }
      }

    } catch (error) {
      // If entire batch fails, mark all symbols as failed
      symbols.forEach(symbol => {
        results.failed++
        results.results.push({
          symbol,
          success: false,
          error: `Unified batch fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          refreshTime: Date.now()
        })
      })
    }
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * attempt // Linear backoff
          console.warn(`[BackgroundPriceRefresh] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms: ${lastError.message}`)
          await this.delay(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get refresh statistics from database
   */
  async getRefreshStatistics(): Promise<{
    totalCachedPrices: number
    freshPrices: number
    stalePrices: number
    lastRefreshTime?: Date
    priceHistoryCount: number
    uniqueSymbolsTracked: number
  }> {
    try {
      const [cacheStats, historyStats, uniqueSymbols] = await Promise.all([
        prisma.priceCache.aggregate({
          _count: true,
          _max: { lastUpdated: true }
        }),
        prisma.priceHistory.aggregate({
          _count: true
        }),
        prisma.priceCache.findMany({
          select: { symbol: true },
          distinct: ['symbol']
        })
      ])

      // Calculate fresh vs stale prices
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const freshCount = await prisma.priceCache.count({
        where: { lastUpdated: { gte: oneHourAgo } }
      })

      return {
        totalCachedPrices: cacheStats._count,
        freshPrices: freshCount,
        stalePrices: cacheStats._count - freshCount,
        lastRefreshTime: cacheStats._max.lastUpdated || undefined,
        priceHistoryCount: historyStats._count,
        uniqueSymbolsTracked: uniqueSymbols.length
      }
    } catch (error) {
      console.error('[BackgroundPriceRefresh] Error getting statistics:', error)
      return {
        totalCachedPrices: 0,
        freshPrices: 0,
        stalePrices: 0,
        priceHistoryCount: 0,
        uniqueSymbolsTracked: 0
      }
    }
  }

  /**
   * Manual refresh for specific symbols (used by UI refresh buttons)
   */
  async refreshSpecificSymbols(symbols: string[]): Promise<RefreshResult> {
    console.log(`[BackgroundPriceRefresh] Manual refresh requested for ${symbols.length} symbols`)
    return await this.batchRefreshPrices(symbols)
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    running: boolean
    lastRefreshTime?: Date
    issues: string[]
  }> {
    const issues: string[] = []
    let status: 'healthy' | 'unhealthy' = 'healthy'

    try {
      // Check if service is running
      const serviceStatus = this.getServiceStatus()
      
      // Check database connectivity
      await prisma.priceCache.count()

      // Check if we have recent price data
      const stats = await this.getRefreshStatistics()
      
      if (!serviceStatus.running) {
        issues.push('Background refresh service is not running')
        status = 'unhealthy'
      }

      if (stats.totalCachedPrices === 0) {
        issues.push('No cached price data available')
        status = 'unhealthy'
      }

      if (stats.freshPrices === 0 && stats.totalCachedPrices > 0) {
        issues.push('All cached prices are stale (older than 1 hour)')
        status = 'unhealthy'
      }

      return {
        status,
        running: serviceStatus.running,
        lastRefreshTime: stats.lastRefreshTime,
        issues
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        running: false,
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }
}

// Export singleton instance
export const backgroundPriceRefreshService = new BackgroundPriceRefreshService()