import { ServerError, ServerErrorLogger } from './error-handling'

export interface ErrorMetrics {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsByPage: Record<string, number>
  criticalErrors: number
  retryableErrors: number
  averageErrorRate: number
  recentErrors: Array<{
    timestamp: Date
    error: string
    page: string
    type: string
    isRetryable: boolean
  }>
}

export interface PerformanceMetrics {
  averagePageLoadTime: number
  slowPages: Array<{
    page: string
    averageTime: number
    slowestTime: number
  }>
  cacheHitRate: number
  databaseQueryTime: number
  externalServiceTime: number
}

export class ServerMonitoring {
  private static instance: ServerMonitoring
  private errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    errorsByPage: {},
    criticalErrors: 0,
    retryableErrors: 0,
    averageErrorRate: 0,
    recentErrors: []
  }
  private performanceData: Array<{
    timestamp: Date
    page: string
    loadTime: number
    cacheHit: boolean
  }> = []

  static getInstance(): ServerMonitoring {
    if (!ServerMonitoring.instance) {
      ServerMonitoring.instance = new ServerMonitoring()
    }
    return ServerMonitoring.instance
  }

  recordError(error: Error | ServerError, page?: string): void {
    this.errorMetrics.totalErrors++
    
    const errorType = error instanceof ServerError ? error.code : 'UNKNOWN_ERROR'
    const isRetryable = error instanceof ServerError ? error.isRetryable : false
    const isCritical = error instanceof ServerError ? error.statusCode >= 500 : true

    // Update error counts
    this.errorMetrics.errorsByType[errorType] = (this.errorMetrics.errorsByType[errorType] || 0) + 1
    
    if (page) {
      this.errorMetrics.errorsByPage[page] = (this.errorMetrics.errorsByPage[page] || 0) + 1
    }

    if (isCritical) {
      this.errorMetrics.criticalErrors++
    }

    if (isRetryable) {
      this.errorMetrics.retryableErrors++
    }

    // Add to recent errors (keep last 100)
    this.errorMetrics.recentErrors.unshift({
      timestamp: new Date(),
      error: error.message,
      page: page || 'unknown',
      type: errorType,
      isRetryable
    })

    if (this.errorMetrics.recentErrors.length > 100) {
      this.errorMetrics.recentErrors = this.errorMetrics.recentErrors.slice(0, 100)
    }

    // Calculate error rate (errors per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentErrorCount = this.errorMetrics.recentErrors.filter(
      e => e.timestamp > oneHourAgo
    ).length
    this.errorMetrics.averageErrorRate = recentErrorCount

    // Log critical errors immediately
    if (isCritical) {
      console.error('[CRITICAL ERROR DETECTED]', {
        error: error.message,
        page,
        type: errorType,
        timestamp: new Date().toISOString()
      })
    }
  }

  recordPageLoad(page: string, loadTime: number, cacheHit: boolean): void {
    this.performanceData.unshift({
      timestamp: new Date(),
      page,
      loadTime,
      cacheHit
    })

    // Keep only last 1000 entries
    if (this.performanceData.length > 1000) {
      this.performanceData = this.performanceData.slice(0, 1000)
    }
  }

  getErrorMetrics(): ErrorMetrics {
    return { ...this.errorMetrics }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const recentData = this.performanceData.slice(0, 100) // Last 100 requests
    
    const averagePageLoadTime = recentData.length > 0 
      ? recentData.reduce((sum, data) => sum + data.loadTime, 0) / recentData.length
      : 0

    const pageGroups = recentData.reduce((groups, data) => {
      if (!groups[data.page]) {
        groups[data.page] = []
      }
      groups[data.page].push(data.loadTime)
      return groups
    }, {} as Record<string, number[]>)

    const slowPages = Object.entries(pageGroups)
      .map(([page, times]) => ({
        page,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        slowestTime: Math.max(...times)
      }))
      .filter(page => page.averageTime > 2000) // Pages slower than 2 seconds
      .sort((a, b) => b.averageTime - a.averageTime)

    const cacheHits = recentData.filter(data => data.cacheHit).length
    const cacheHitRate = recentData.length > 0 ? (cacheHits / recentData.length) * 100 : 0

    return {
      averagePageLoadTime,
      slowPages,
      cacheHitRate,
      databaseQueryTime: 0, // TODO: Implement database query time tracking
      externalServiceTime: 0 // TODO: Implement external service time tracking
    }
  }

  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical'
    issues: string[]
    metrics: {
      errorRate: number
      averageLoadTime: number
      cacheHitRate: number
    }
  } {
    const errorMetrics = this.getErrorMetrics()
    const performanceMetrics = this.getPerformanceMetrics()
    const issues: string[] = []
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'

    // Check error rate
    if (errorMetrics.averageErrorRate > 10) {
      status = 'critical'
      issues.push(`High error rate: ${errorMetrics.averageErrorRate} errors/hour`)
    } else if (errorMetrics.averageErrorRate > 5) {
      status = 'degraded'
      issues.push(`Elevated error rate: ${errorMetrics.averageErrorRate} errors/hour`)
    }

    // Check critical errors
    if (errorMetrics.criticalErrors > 0) {
      const recentCritical = errorMetrics.recentErrors
        .filter(e => e.timestamp > new Date(Date.now() - 60 * 60 * 1000))
        .filter(e => e.type.includes('DATABASE') || e.type.includes('CRITICAL'))
        .length

      if (recentCritical > 0) {
        status = 'critical'
        issues.push(`${recentCritical} critical errors in the last hour`)
      }
    }

    // Check performance
    if (performanceMetrics.averagePageLoadTime > 5000) {
      status = status === 'critical' ? 'critical' : 'degraded'
      issues.push(`Slow page load times: ${performanceMetrics.averagePageLoadTime.toFixed(0)}ms average`)
    }

    // Check cache hit rate
    if (performanceMetrics.cacheHitRate < 50) {
      status = status === 'critical' ? 'critical' : 'degraded'
      issues.push(`Low cache hit rate: ${performanceMetrics.cacheHitRate.toFixed(1)}%`)
    }

    return {
      status,
      issues,
      metrics: {
        errorRate: errorMetrics.averageErrorRate,
        averageLoadTime: performanceMetrics.averagePageLoadTime,
        cacheHitRate: performanceMetrics.cacheHitRate
      }
    }
  }

  // Generate monitoring report
  generateReport(): string {
    const errorMetrics = this.getErrorMetrics()
    const performanceMetrics = this.getPerformanceMetrics()
    const health = this.getHealthStatus()

    return `
# Server Monitoring Report
Generated: ${new Date().toISOString()}

## Health Status: ${health.status.toUpperCase()}
${health.issues.length > 0 ? `Issues:\n${health.issues.map(issue => `- ${issue}`).join('\n')}` : 'No issues detected'}

## Error Metrics
- Total Errors: ${errorMetrics.totalErrors}
- Critical Errors: ${errorMetrics.criticalErrors}
- Error Rate: ${errorMetrics.averageErrorRate} errors/hour
- Retryable Errors: ${errorMetrics.retryableErrors}

### Errors by Type
${Object.entries(errorMetrics.errorsByType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

### Errors by Page
${Object.entries(errorMetrics.errorsByPage).map(([page, count]) => `- ${page}: ${count}`).join('\n')}

## Performance Metrics
- Average Page Load Time: ${performanceMetrics.averagePageLoadTime.toFixed(2)}ms
- Cache Hit Rate: ${performanceMetrics.cacheHitRate.toFixed(1)}%

### Slow Pages
${performanceMetrics.slowPages.map(page => `- ${page.page}: ${page.averageTime.toFixed(2)}ms avg (slowest: ${page.slowestTime.toFixed(2)}ms)`).join('\n')}

## Recent Errors (Last 10)
${errorMetrics.recentErrors.slice(0, 10).map(error => 
  `- ${error.timestamp.toISOString()}: ${error.error} (${error.page}, ${error.type})`
).join('\n')}
    `.trim()
  }

  // Clear old data
  cleanup(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    // Keep only recent errors
    this.errorMetrics.recentErrors = this.errorMetrics.recentErrors.filter(
      error => error.timestamp > oneWeekAgo
    )

    // Keep only recent performance data
    this.performanceData = this.performanceData.filter(
      data => data.timestamp > oneWeekAgo
    )
  }
}

// Export singleton instance
export const serverMonitoring = ServerMonitoring.getInstance()

// Utility function to start periodic monitoring
export function startMonitoring(intervalMs: number = 5 * 60 * 1000): () => void {
  const interval = setInterval(() => {
    const health = serverMonitoring.getHealthStatus()
    
    if (health.status !== 'healthy') {
      console.warn('[SERVER MONITORING]', {
        status: health.status,
        issues: health.issues,
        metrics: health.metrics
      })
    }

    // Cleanup old data
    serverMonitoring.cleanup()
  }, intervalMs)

  return () => clearInterval(interval)
}

// Middleware to track page loads and errors
export function withMonitoring<T>(
  operation: () => Promise<T>,
  page: string
): Promise<T> {
  const startTime = performance.now()
  
  return operation()
    .then(result => {
      const loadTime = performance.now() - startTime
      serverMonitoring.recordPageLoad(page, loadTime, false) // Assume cache miss for now
      return result
    })
    .catch(error => {
      const loadTime = performance.now() - startTime
      serverMonitoring.recordError(error, page)
      serverMonitoring.recordPageLoad(page, loadTime, false)
      throw error
    })
}