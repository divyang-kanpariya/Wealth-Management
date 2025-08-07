import { BaseDataPreparator, PageDataBase } from '../data-preparators/base'
import { listCache, detailCache } from './cache-manager'
import { queryOptimizer } from './query-optimizer'
import { performanceMonitor, withPerformanceTracking, trackPerformance } from './monitoring'

export interface OptimizedPreparatorOptions {
  cacheKey: string
  pageName: string
  cacheType: 'list' | 'detail'
  enableStaleWhileRevalidate?: boolean
}

export abstract class OptimizedDataPreparator<T extends PageDataBase> extends BaseDataPreparator {
  protected readonly options: OptimizedPreparatorOptions
  private get cache() {
    return this.options.cacheType === 'list' ? listCache : detailCache
  }

  constructor(options: OptimizedPreparatorOptions) {
    super()
    this.options = options
  }

  async prepare(...args: any[]): Promise<T> {
    const pageStartTime = performance.now()
    const { cacheKey, pageName, enableStaleWhileRevalidate = true } = this.options
    
    try {
      // Try to get cached data first
      const cachedData = this.cache.get(cacheKey)
      if (cachedData) {
        const renderTime = performance.now() - pageStartTime
        performanceMonitor.trackPageGeneration(pageName, 0, renderTime, true)
        console.log(`[${this.constructor.name}] Cache HIT - served in ${renderTime.toFixed(2)}ms`)
        return cachedData as T
      }

      // Check for stale data if enabled
      if (enableStaleWhileRevalidate) {
        const staleData = this.cache.getStale(cacheKey)
        if (staleData) {
          const renderTime = performance.now() - pageStartTime
          performanceMonitor.trackPageGeneration(pageName, 0, renderTime, true)
          console.log(`[${this.constructor.name}] Serving stale data while revalidating - served in ${renderTime.toFixed(2)}ms`)
          
          // Refresh in background
          this.refreshInBackground(args).catch(error => {
            console.error(`[${this.constructor.name}] Background refresh failed:`, error)
          })
          
          return staleData as T
        }
      }

      // Fetch fresh data
      const dataStartTime = performance.now()
      const freshData = await this.fetchFreshData(...args)
      const dataPreparationTime = performance.now() - dataStartTime

      // Cache the result
      this.cache.set(cacheKey, freshData)

      const totalTime = performance.now() - pageStartTime
      const renderTime = totalTime - dataPreparationTime
      performanceMonitor.trackPageGeneration(pageName, dataPreparationTime, renderTime, false)

      console.log(`[${this.constructor.name}] Fresh data prepared in ${totalTime.toFixed(2)}ms (data: ${dataPreparationTime.toFixed(2)}ms, render: ${renderTime.toFixed(2)}ms)`)
      return freshData

    } catch (error) {
      console.error(`[${this.constructor.name}] Data preparation failed:`, error)
      
      // Try to return stale data as fallback
      const staleData = this.cache.getStale(cacheKey)
      if (staleData) {
        const renderTime = performance.now() - pageStartTime
        performanceMonitor.trackPageGeneration(pageName, 0, renderTime, true)
        console.log(`[${this.constructor.name}] Error occurred, serving stale data as fallback`)
        return staleData as T
      }
      
      // Last resort: return fallback data
      const fallbackData = await this.getFallbackData()
      const totalTime = performance.now() - pageStartTime
      performanceMonitor.trackPageGeneration(pageName, totalTime, 0, false)
      return fallbackData
    }
  }

  private async refreshInBackground(args: any[]): Promise<void> {
    return withPerformanceTracking(`${this.constructor.name}.backgroundRefresh`, async () => {
      const freshData = await this.fetchFreshData(...args)
      this.cache.set(this.options.cacheKey, freshData)
      console.log(`[${this.constructor.name}] Background refresh completed`)
    }, {}, [this.options.pageName, 'background-refresh'])
  }

  // Abstract methods to be implemented by subclasses
  protected abstract fetchFreshData(...args: any[]): Promise<T>
  protected abstract getFallbackData(): Promise<T>

  // Utility methods
  invalidateCache(): void {
    const stats = this.cache.getStats()
    this.cache.invalidate(this.options.cacheKey)
    console.log(`[${this.constructor.name}] Cache invalidated (hit rate: ${stats.hitRate.toFixed(2)}%)`)
  }

  getPerformanceStats() {
    return {
      cache: this.cache.getStats(),
      performance: performanceMonitor.getPageMetrics({ 
        pageName: this.options.pageName, 
        limit: 10 
      })
    }
  }

  // Helper method for optimized database queries
  protected async executeOptimizedQuery<R>(
    queryName: string,
    queryFn: () => Promise<R>,
    metadata?: Record<string, any>
  ): Promise<R> {
    return withPerformanceTracking(
      `${this.constructor.name}.${queryName}`,
      queryFn,
      metadata,
      [this.options.pageName, 'database-query']
    )
  }
}

// Utility function to create optimized preparators
export function createOptimizedPreparator<T extends PageDataBase>(
  options: OptimizedPreparatorOptions,
  fetchFreshData: (...args: any[]) => Promise<T>,
  getFallbackData: () => Promise<T>
) {
  return class extends OptimizedDataPreparator<T> {
    constructor() {
      super(options)
    }

    protected async fetchFreshData(...args: any[]): Promise<T> {
      return fetchFreshData(...args)
    }

    protected async getFallbackData(): Promise<T> {
      return getFallbackData()
    }
  }
}

// Performance monitoring utilities for data preparators
export class PreparatorPerformanceMonitor {
  static logSlowOperations(threshold: number = 1000): void {
    const slowPages = performanceMonitor.getSlowPages(threshold)
    if (slowPages.length > 0) {
      console.warn(`[PreparatorPerformanceMonitor] Found ${slowPages.length} slow page generations:`)
      slowPages.forEach(page => {
        console.warn(`  - ${page.pageName}: ${page.totalDuration.toFixed(2)}ms (data: ${page.dataPreparationDuration.toFixed(2)}ms)`)
      })
    }
  }

  static getOverallStats() {
    const summary = performanceMonitor.getPerformanceSummary()
    const cacheStats = {
      dashboard: listCache.getStats(),
      charts: listCache.getStats(),
      list: listCache.getStats(),
      detail: detailCache.getStats()
    }

    return {
      performance: summary,
      cache: cacheStats,
      queries: {
        slow: queryOptimizer.getSlowQueries(),
        average: queryOptimizer.getAverageQueryTime()
      }
    }
  }

  static startPeriodicReporting(intervalMs: number = 60000): () => void {
    const interval = setInterval(() => {
      const stats = this.getOverallStats()
      console.log('[PreparatorPerformanceMonitor] Performance Summary:', {
        totalRequests: stats.performance.totalRequests,
        averagePageLoadTime: `${stats.performance.averagePageLoadTime.toFixed(2)}ms`,
        cacheHitRate: `${stats.performance.cacheHitRate.toFixed(2)}%`,
        memoryUsage: `${stats.performance.memoryUsage.toFixed(2)}MB`,
        slowQueries: stats.queries.slow.length
      })
      
      // Log slow operations
      this.logSlowOperations()
    }, intervalMs)

    return () => clearInterval(interval)
  }
}