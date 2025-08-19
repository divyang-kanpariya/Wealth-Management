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
    const { pageName } = this.options
    
    try {
      // Always fetch fresh user data from database - no caching for user CRUD operations
      console.log(`[${this.constructor.name}] Fetching fresh user data (no cache)`)
      const dataStartTime = performance.now()
      const freshData = await this.fetchFreshData(...args)
      const dataPreparationTime = performance.now() - dataStartTime

      // No caching for user data - always serve fresh data

      const totalTime = performance.now() - pageStartTime
      const renderTime = totalTime - dataPreparationTime
      performanceMonitor.trackPageGeneration(pageName, dataPreparationTime, renderTime, false)

      console.log(`[${this.constructor.name}] Fresh data prepared in ${totalTime.toFixed(2)}ms (data: ${dataPreparationTime.toFixed(2)}ms, render: ${renderTime.toFixed(2)}ms)`)
      return freshData

    } catch (error) {
      console.error(`[${this.constructor.name}] Data preparation failed:`, error)
      
      // Return fallback data - no stale cache fallback for user data
      const fallbackData = await this.getFallbackData()
      const totalTime = performance.now() - pageStartTime
      performanceMonitor.trackPageGeneration(pageName, totalTime, 0, false)
      return fallbackData
    }
  }

  // Background refresh not needed - user data is always fetched fresh
  private async refreshInBackground(args: any[]): Promise<void> {
    console.log(`[${this.constructor.name}] Background refresh not needed - user data always fresh`)
  }

  // Abstract methods to be implemented by subclasses
  protected abstract fetchFreshData(...args: any[]): Promise<T>
  protected abstract getFallbackData(): Promise<T>

  // No cache invalidation needed - user data is always fetched fresh
  invalidateCache(): void {
    console.log(`[${this.constructor.name}] No cache invalidation needed - user data always fresh`)
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