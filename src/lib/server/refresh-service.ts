/**
 * Enhanced Refresh Service for Real-Time Price Updates
 * 
 * This service provides enhanced refresh functionality with:
 * - Real-time progress tracking
 * - Better error handling and fallbacks
 * - Immediate API calls with database updates
 * - Detailed refresh status and results
 */

import { RefreshStatus, RefreshResult, RefreshProgress, RefreshOptions } from '@/types'
import { 
  batchGetPrices, 
  updatePriceCache,
  getAllTrackedSymbols 
} from '@/lib/price-fetcher'

export class RealTimeRefreshService {
  private activeRefreshes = new Map<string, RefreshStatus>()
  private static instance: RealTimeRefreshService | null = null

  static getInstance(): RealTimeRefreshService {
    if (!this.instance) {
      this.instance = new RealTimeRefreshService()
    }
    return this.instance
  }

  /**
   * Start a real-time refresh operation with progress tracking
   */
  async startRefresh(options: RefreshOptions = {}): Promise<string> {
    const requestId = this.generateRequestId()
    
    // Get symbols to refresh
    const symbols = options.symbols || await getAllTrackedSymbols()
    
    // Filter symbols based on options
    const filteredSymbols = this.filterSymbols(symbols, options)
    
    const status: RefreshStatus = {
      requestId,
      status: 'pending',
      progress: { 
        total: filteredSymbols.length, 
        completed: 0, 
        failed: 0,
        percentage: 0
      },
      startTime: new Date()
    }
    
    this.activeRefreshes.set(requestId, status)
    
    // Start async refresh process with a small delay to allow status checking
    setTimeout(() => {
      this.performRefreshWithUpdates(requestId, filteredSymbols, options)
        .catch(error => {
          const currentStatus = this.activeRefreshes.get(requestId)
          if (currentStatus) {
            currentStatus.status = 'failed'
            currentStatus.error = error.message
            currentStatus.endTime = new Date()
          }
        })
    }, 10) // Small delay to allow initial status check
    
    return requestId
  }

  /**
   * Get refresh status for progress tracking
   */
  getRefreshStatus(requestId: string): RefreshStatus | null {
    return this.activeRefreshes.get(requestId) || null
  }

  /**
   * Cancel an ongoing refresh operation
   */
  cancelRefresh(requestId: string): boolean {
    const status = this.activeRefreshes.get(requestId)
    if (status && status.status === 'in-progress') {
      status.status = 'cancelled'
      status.endTime = new Date()
      return true
    }
    return false
  }

  /**
   * Get all active refresh operations
   */
  getActiveRefreshes(): RefreshStatus[] {
    return Array.from(this.activeRefreshes.values())
      .filter(status => status.status === 'in-progress' || status.status === 'pending')
  }

  /**
   * Clean up completed refresh operations older than 1 hour
   */
  cleanupOldRefreshes(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    for (const [requestId, status] of this.activeRefreshes.entries()) {
      if (status.endTime && status.endTime < oneHourAgo) {
        this.activeRefreshes.delete(requestId)
      }
    }
  }

  private async performRefreshWithUpdates(
    requestId: string, 
    symbols: string[], 
    options: RefreshOptions
  ): Promise<void> {
    const status = this.activeRefreshes.get(requestId)!
    status.status = 'in-progress'
    
    const results: RefreshResult = { 
      success: 0, 
      failed: 0, 
      duration: 0,
      results: [] 
    }
    
    const startTime = Date.now()
    const batchSize = options.batchSize || 10
    const timeout = options.timeout || 30000 // 30 seconds default timeout
    
    try {
      // Process symbols in batches to avoid overwhelming APIs
      for (let i = 0; i < symbols.length; i += batchSize) {
        const currentStatus = this.activeRefreshes.get(requestId)
        if (currentStatus?.status === 'cancelled') break
        
        const batch = symbols.slice(i, i + batchSize)
        await this.processBatch(batch, results, status, timeout)
        
        // Update progress
        status.progress.completed = Math.min(results.success + results.failed, symbols.length)
        status.progress.failed = results.failed
        status.progress.percentage = Math.round((status.progress.completed / symbols.length) * 100)
        
        // Small delay between batches to avoid rate limiting
        const delayStatus = this.activeRefreshes.get(requestId)
        if (i + batchSize < symbols.length && delayStatus?.status !== 'cancelled') {
          await this.delay(1000)
        }
      }
      
      results.duration = Date.now() - startTime
      const finalStatus = this.activeRefreshes.get(requestId)
      if (finalStatus) {
        finalStatus.status = finalStatus.status === 'cancelled' ? 'cancelled' : 'completed'
        finalStatus.results = results
        finalStatus.endTime = new Date()
      }
      
      console.log(`[RefreshService] Refresh ${requestId} completed: ${results.success} success, ${results.failed} failed in ${results.duration}ms`)
      
    } catch (error) {
      results.duration = Date.now() - startTime
      status.status = 'failed'
      status.error = error instanceof Error ? error.message : 'Unknown error'
      status.results = results
      status.endTime = new Date()
      
      console.error(`[RefreshService] Refresh ${requestId} failed:`, error)
    }
  }

  private async processBatch(
    symbols: string[], 
    results: RefreshResult, 
    status: RefreshStatus,
    timeout: number
  ): Promise<void> {
    // Use unified price fetching for all symbols (stocks and mutual funds)
    await this.processUnifiedBatch(symbols, results, status, timeout)
  }

  private async processUnifiedBatch(
    symbols: string[], 
    results: RefreshResult, 
    status: RefreshStatus,
    timeout: number
  ): Promise<void> {
    try {
      // Set timeout for the entire batch using unified price fetching
      const batchPromise = batchGetPrices(symbols)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Batch timeout')), timeout)
      )
      
      const batchResults = await Promise.race([batchPromise, timeoutPromise])
      
      for (const result of batchResults) {
        if (status.status === 'cancelled') break
        
        status.progress.currentSymbol = result.symbol
        
        if (result.price !== null) {
          // Update database cache
          try {
            await updatePriceCache(result.symbol, result.price, 'GOOGLE_SCRIPT')
            results.success++
            results.results.push({
              symbol: result.symbol,
              success: true,
              price: result.price,
              source: 'GOOGLE_SCRIPT',
              refreshTime: Date.now()
            })
          } catch (cacheError) {
            console.warn(`Failed to cache price for ${result.symbol}:`, cacheError)
            // Still count as success if we got the price, just failed to cache
            results.success++
            results.results.push({
              symbol: result.symbol,
              success: true,
              price: result.price,
              source: 'GOOGLE_SCRIPT',
              error: `Cache update failed: ${cacheError instanceof Error ? cacheError.message : 'Unknown error'}`,
              refreshTime: Date.now()
            })
          }
        } else {
          results.failed++
          results.results.push({
            symbol: result.symbol,
            success: false,
            error: result.error || 'Price not available',
            refreshTime: Date.now()
          })
        }
      }
    } catch (error) {
      // If entire batch fails, mark all symbols as failed
      for (const symbol of symbols) {
        results.failed++
        results.results.push({
          symbol,
          success: false,
          error: error instanceof Error ? error.message : 'Batch processing failed',
          refreshTime: Date.now()
        })
      }
    }
  }

  private filterSymbols(symbols: string[], options: RefreshOptions): string[] {
    let filtered = symbols
    
    // With unified price fetching, we can still filter by type if needed
    if (options.includeStocks === false) {
      filtered = filtered.filter(s => s.match(/^\d+$/)) // Only mutual funds (numeric scheme codes)
    }
    
    if (options.includeMutualFunds === false) {
      filtered = filtered.filter(s => !s.match(/^\d+$/)) // Only stocks (non-numeric symbols)
    }
    
    return filtered
  }

  private generateRequestId(): string {
    return `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const realTimeRefreshService = RealTimeRefreshService.getInstance()

/**
 * Convenience function for quick refresh operations
 */
export async function quickRefresh(symbols?: string[]): Promise<RefreshResult> {
  const service = RealTimeRefreshService.getInstance()
  const requestId = await service.startRefresh({ symbols, forceRefresh: true })
  
  // Poll for completion
  return new Promise((resolve, reject) => {
    let attempts = 0
    const maxAttempts = 600 // 5 minutes at 500ms intervals
    
    const pollInterval = setInterval(() => {
      attempts++
      const status = service.getRefreshStatus(requestId)
      
      if (!status) {
        clearInterval(pollInterval)
        reject(new Error('Refresh status not found'))
        return
      }
      
      if (status.status === 'completed') {
        clearInterval(pollInterval)
        resolve(status.results!)
      } else if (status.status === 'failed') {
        clearInterval(pollInterval)
        reject(new Error(status.error || 'Refresh failed'))
      } else if (status.status === 'cancelled') {
        clearInterval(pollInterval)
        reject(new Error('Refresh was cancelled'))
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval)
        service.cancelRefresh(requestId)
        reject(new Error('Refresh timeout'))
      }
    }, 500) // Poll every 500ms
  })
}