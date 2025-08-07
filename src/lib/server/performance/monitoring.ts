export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: Date
  metadata?: Record<string, any>
  tags?: string[]
}

export interface PageGenerationMetrics {
  pageName: string
  totalDuration: number
  dataPreparationDuration: number
  renderDuration: number
  cacheHit: boolean
  timestamp: Date
  userAgent?: string
  requestId?: string
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
  timestamp: Date
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private pageMetrics: PageGenerationMetrics[] = []
  private systemMetrics: SystemMetrics[] = []
  private readonly maxMetricsHistory = 10000
  private readonly maxPageMetricsHistory = 1000
  private readonly maxSystemMetricsHistory = 100

  // Track individual operations
  startTimer(name: string, metadata?: Record<string, any>, tags?: string[]): () => void {
    const startTime = performance.now()
    const startTimestamp = new Date()

    return () => {
      const duration = performance.now() - startTime
      this.recordMetric({
        name,
        duration,
        timestamp: startTimestamp,
        metadata,
        tags
      })
    }
  }

  // Track page generation performance
  trackPageGeneration(
    pageName: string,
    dataPreparationDuration: number,
    renderDuration: number,
    cacheHit: boolean,
    requestId?: string,
    userAgent?: string
  ): void {
    const metric: PageGenerationMetrics = {
      pageName,
      totalDuration: dataPreparationDuration + renderDuration,
      dataPreparationDuration,
      renderDuration,
      cacheHit,
      timestamp: new Date(),
      requestId,
      userAgent
    }

    this.pageMetrics.push(metric)

    // Keep only recent metrics
    if (this.pageMetrics.length > this.maxPageMetricsHistory) {
      this.pageMetrics = this.pageMetrics.slice(-this.maxPageMetricsHistory)
    }

    // Log slow page generations
    if (metric.totalDuration > 2000) {
      console.warn(`[PerformanceMonitor] Slow page generation: ${pageName} took ${metric.totalDuration.toFixed(2)}ms`)
    }

    // Log performance breakdown for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PerformanceMonitor] ${pageName}: Data=${dataPreparationDuration.toFixed(2)}ms, Render=${renderDuration.toFixed(2)}ms, Cache=${cacheHit ? 'HIT' : 'MISS'}`)
    }
  }

  // Track system metrics
  recordSystemMetrics(): void {
    const metric: SystemMetrics = {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date()
    }

    this.systemMetrics.push(metric)

    // Keep only recent metrics
    if (this.systemMetrics.length > this.maxSystemMetricsHistory) {
      this.systemMetrics = this.systemMetrics.slice(-this.maxSystemMetricsHistory)
    }

    // Log memory warnings
    const memoryUsageMB = metric.memoryUsage.heapUsed / 1024 / 1024
    if (memoryUsageMB > 500) { // 500MB threshold
      console.warn(`[PerformanceMonitor] High memory usage: ${memoryUsageMB.toFixed(2)}MB`)
    }
  }

  // Get performance statistics
  getMetrics(options: {
    name?: string
    tags?: string[]
    since?: Date
    limit?: number
  } = {}): PerformanceMetric[] {
    let filteredMetrics = [...this.metrics]

    if (options.name) {
      filteredMetrics = filteredMetrics.filter(m => m.name === options.name)
    }

    if (options.tags && options.tags.length > 0) {
      filteredMetrics = filteredMetrics.filter(m => 
        m.tags && options.tags!.some(tag => m.tags!.includes(tag))
      )
    }

    if (options.since) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= options.since!)
    }

    if (options.limit) {
      filteredMetrics = filteredMetrics.slice(-options.limit)
    }

    return filteredMetrics
  }

  getPageMetrics(options: {
    pageName?: string
    since?: Date
    limit?: number
  } = {}): PageGenerationMetrics[] {
    let filteredMetrics = [...this.pageMetrics]

    if (options.pageName) {
      filteredMetrics = filteredMetrics.filter(m => m.pageName === options.pageName)
    }

    if (options.since) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= options.since!)
    }

    if (options.limit) {
      filteredMetrics = filteredMetrics.slice(-options.limit)
    }

    return filteredMetrics
  }

  getSystemMetrics(options: {
    since?: Date
    limit?: number
  } = {}): SystemMetrics[] {
    let filteredMetrics = [...this.systemMetrics]

    if (options.since) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= options.since!)
    }

    if (options.limit) {
      filteredMetrics = filteredMetrics.slice(-options.limit)
    }

    return filteredMetrics
  }

  // Performance analysis methods
  getAveragePageLoadTime(pageName?: string): number {
    const relevantMetrics = pageName 
      ? this.pageMetrics.filter(m => m.pageName === pageName)
      : this.pageMetrics

    if (relevantMetrics.length === 0) return 0

    const totalTime = relevantMetrics.reduce((sum, metric) => sum + metric.totalDuration, 0)
    return totalTime / relevantMetrics.length
  }

  getCacheHitRate(pageName?: string): number {
    const relevantMetrics = pageName 
      ? this.pageMetrics.filter(m => m.pageName === pageName)
      : this.pageMetrics

    if (relevantMetrics.length === 0) return 0

    const cacheHits = relevantMetrics.filter(m => m.cacheHit).length
    return (cacheHits / relevantMetrics.length) * 100
  }

  getSlowPages(threshold: number = 2000): PageGenerationMetrics[] {
    return this.pageMetrics.filter(metric => metric.totalDuration > threshold)
  }

  getPerformanceSummary(): {
    totalRequests: number
    averagePageLoadTime: number
    cacheHitRate: number
    slowPagesCount: number
    memoryUsage: number
    topSlowPages: { pageName: string; averageTime: number }[]
  } {
    const totalRequests = this.pageMetrics.length
    const averagePageLoadTime = this.getAveragePageLoadTime()
    const cacheHitRate = this.getCacheHitRate()
    const slowPagesCount = this.getSlowPages().length
    
    const latestSystemMetric = this.systemMetrics[this.systemMetrics.length - 1]
    const memoryUsage = latestSystemMetric 
      ? latestSystemMetric.memoryUsage.heapUsed / 1024 / 1024 
      : 0

    // Get top slow pages
    const pageStats = new Map<string, { totalTime: number; count: number }>()
    this.pageMetrics.forEach(metric => {
      const existing = pageStats.get(metric.pageName) || { totalTime: 0, count: 0 }
      existing.totalTime += metric.totalDuration
      existing.count += 1
      pageStats.set(metric.pageName, existing)
    })

    const topSlowPages = Array.from(pageStats.entries())
      .map(([pageName, stats]) => ({
        pageName,
        averageTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5)

    return {
      totalRequests,
      averagePageLoadTime,
      cacheHitRate,
      slowPagesCount,
      memoryUsage,
      topSlowPages
    }
  }

  // Utility methods
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }

    // Log slow operations
    if (metric.duration > 1000) {
      console.warn(`[PerformanceMonitor] Slow operation: ${metric.name} took ${metric.duration.toFixed(2)}ms`)
    }
  }

  clearMetrics(): void {
    this.metrics = []
    this.pageMetrics = []
    this.systemMetrics = []
  }

  // Start periodic system monitoring
  startSystemMonitoring(intervalMs: number = 30000): () => void {
    const interval = setInterval(() => {
      this.recordSystemMetrics()
    }, intervalMs)

    return () => clearInterval(interval)
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Utility function for easy performance tracking
export function withPerformanceTracking<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>,
  tags?: string[]
): Promise<T> {
  const stopTimer = performanceMonitor.startTimer(name, metadata, tags)
  
  return fn().finally(() => {
    stopTimer()
  })
}

// Decorator for tracking method performance
export function trackPerformance(name?: string, tags?: string[]) {
  return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      // Handle case where descriptor is undefined
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {
        value: target[propertyKey],
        writable: true,
        enumerable: true,
        configurable: true
      }
    }

    const originalMethod = descriptor.value
    if (typeof originalMethod !== 'function') {
      return descriptor
    }

    const methodName = name || `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: any[]) {
      return withPerformanceTracking(
        methodName,
        () => originalMethod.apply(this, args),
        { args: args.length },
        tags
      )
    }

    return descriptor
  }
}