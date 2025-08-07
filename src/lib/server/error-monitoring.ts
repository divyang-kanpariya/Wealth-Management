import { ServerErrorLogger } from './error-handling'

export interface ErrorMetrics {
  totalErrors: number
  errorRate: number
  criticalErrors: number
  averageResponseTime: number
  errorsByPage: Record<string, number>
  errorsByType: Record<string, number>
  recentErrors: Array<{
    timestamp: string
    operation: string
    error: string
    duration?: number
  }>
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database: boolean
    priceServices: boolean
    calculations: boolean
    cache: boolean
  }
  metrics: ErrorMetrics
  uptime: number
  memoryUsage: NodeJS.MemoryUsage
}

export class ServerErrorMonitor {
  private static instance: ServerErrorMonitor
  private readonly logger = ServerErrorLogger.getInstance()
  private healthChecks: Map<string, boolean> = new Map()
  private responseTimeBuffer: number[] = []
  private readonly MAX_RESPONSE_TIME_SAMPLES = 100

  static getInstance(): ServerErrorMonitor {
    if (!ServerErrorMonitor.instance) {
      ServerErrorMonitor.instance = new ServerErrorMonitor()
    }
    return ServerErrorMonitor.instance
  }

  // Track response times for performance monitoring
  trackResponseTime(operation: string, duration: number): void {
    this.responseTimeBuffer.push(duration)
    if (this.responseTimeBuffer.length > this.MAX_RESPONSE_TIME_SAMPLES) {
      this.responseTimeBuffer.shift()
    }

    // Log slow operations
    this.logger.logPerformanceIssue(operation, duration)
  }

  // Update health check status
  updateHealthCheck(service: string, isHealthy: boolean): void {
    this.healthChecks.set(service, isHealthy)

    if (!isHealthy) {
      console.warn(`[HEALTH CHECK] Service ${service} is unhealthy`)
    }
  }

  // Get current error metrics
  getErrorMetrics(): ErrorMetrics {
    const errorStats = this.logger.getErrorStats()
    const averageResponseTime = this.responseTimeBuffer.length > 0
      ? this.responseTimeBuffer.reduce((sum, time) => sum + time, 0) / this.responseTimeBuffer.length
      : 0

    return {
      totalErrors: errorStats.totalErrors,
      errorRate: this.calculateErrorRate(),
      criticalErrors: errorStats.criticalErrors,
      averageResponseTime,
      errorsByPage: this.groupErrorsByPage(errorStats.errorsByOperation),
      errorsByType: errorStats.errorsByType,
      recentErrors: errorStats.recentErrors.map(error => ({
        timestamp: error.timestamp,
        operation: error.context?.operation || 'unknown',
        error: error.message,
        duration: error.duration
      }))
    }
  }

  // Perform comprehensive health check
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = performance.now()

    // Test database connectivity
    const databaseHealthy = await this.checkDatabaseHealth()
    this.updateHealthCheck('database', databaseHealthy)

    // Test price services
    const priceServicesHealthy = await this.checkPriceServicesHealth()
    this.updateHealthCheck('priceServices', priceServicesHealthy)

    // Test calculations
    const calculationsHealthy = await this.checkCalculationsHealth()
    this.updateHealthCheck('calculations', calculationsHealthy)

    // Test cache
    const cacheHealthy = await this.checkCacheHealth()
    this.updateHealthCheck('cache', cacheHealthy)

    const healthCheckDuration = performance.now() - startTime
    this.trackResponseTime('health-check', healthCheckDuration)

    const checks = {
      database: databaseHealthy,
      priceServices: priceServicesHealthy,
      calculations: calculationsHealthy,
      cache: cacheHealthy
    }

    const status = this.determineOverallHealth(checks)

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
      metrics: this.getErrorMetrics(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Import prisma dynamically to avoid circular dependencies
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('[HEALTH CHECK] Database check failed:', error)
      return false
    }
  }

  private async checkPriceServicesHealth(): Promise<boolean> {
    try {
      // Test a simple price fetch operation
      const { batchGetPrices } = await import('@/lib/price-fetcher')
      const testResult = await Promise.race([
        batchGetPrices(['AAPL']), // Test with a known symbol
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ])
      return Array.isArray(testResult)
    } catch (error) {
      console.error('[HEALTH CHECK] Price services check failed:', error)
      return false
    }
  }

  private async checkCalculationsHealth(): Promise<boolean> {
    try {
      // Test basic calculation functions
      const { calculatePortfolioSummary } = await import('@/lib/calculations')
      const testData = [{
        investment: {
          id: 'test',
          name: 'Test Investment',
          type: 'STOCK' as const,
          buyDate: new Date(),
          accountId: 'test-account',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        currentValue: 1000,
        gainLoss: 100,
        gainLossPercentage: 11.11
      }]

      const result = calculatePortfolioSummary(testData)
      return result.totalValue === 1000 && result.totalInvested === 900
    } catch (error) {
      console.error('[HEALTH CHECK] Calculations check failed:', error)
      return false
    }
  }

  private async checkCacheHealth(): Promise<boolean> {
    try {
      // Test cache operations
      const { dashboardCache } = await import('@/lib/server/performance/cache-manager')
      const testKey = 'health-check-test'
      const testData = { test: true, timestamp: Date.now() }

      dashboardCache.set(testKey, testData)
      const retrieved = dashboardCache.get(testKey)
      dashboardCache.invalidate(testKey)

      const isValid = retrieved && typeof retrieved === 'object' && 'test' in retrieved && (retrieved as any).test === true
      return Boolean(isValid)
    } catch (error) {
      console.error('[HEALTH CHECK] Cache check failed:', error)
      return false
    }
  }

  private determineOverallHealth(checks: Record<string, boolean>): 'healthy' | 'degraded' | 'unhealthy' {
    const healthyChecks = Object.values(checks).filter(Boolean).length
    const totalChecks = Object.values(checks).length

    if (healthyChecks === totalChecks) {
      return 'healthy'
    } else if (healthyChecks >= totalChecks * 0.5) {
      return 'degraded'
    } else {
      return 'unhealthy'
    }
  }

  private calculateErrorRate(): number {
    const errorStats = this.logger.getErrorStats()
    const totalOperations = this.responseTimeBuffer.length

    if (totalOperations === 0) return 0

    return (errorStats.totalErrors / totalOperations) * 100
  }

  private groupErrorsByPage(errorsByOperation: Record<string, number>): Record<string, number> {
    const pageErrors: Record<string, number> = {}

    Object.entries(errorsByOperation).forEach(([operation, count]) => {
      // Extract page name from operation (e.g., "DashboardDataPreparator.prepare" -> "dashboard")
      const pageName = operation.toLowerCase().includes('dashboard') ? 'dashboard'
        : operation.toLowerCase().includes('investment') ? 'investments'
          : operation.toLowerCase().includes('goal') ? 'goals'
            : operation.toLowerCase().includes('sip') ? 'sips'
              : operation.toLowerCase().includes('account') ? 'accounts'
                : operation.toLowerCase().includes('chart') ? 'charts'
                  : 'other'

      pageErrors[pageName] = (pageErrors[pageName] || 0) + count
    })

    return pageErrors
  }

  // Get system alerts based on current metrics
  getSystemAlerts(): Array<{
    level: 'warning' | 'critical'
    message: string
    timestamp: string
    action?: string
  }> {
    const alerts: Array<{
      level: 'warning' | 'critical'
      message: string
      timestamp: string
      action?: string
    }> = []

    const metrics = this.getErrorMetrics()
    const timestamp = new Date().toISOString()

    // High error rate alert
    if (metrics.errorRate > 10) {
      alerts.push({
        level: 'critical',
        message: `High error rate detected: ${metrics.errorRate.toFixed(2)}%`,
        timestamp,
        action: 'Investigate recent errors and check system health'
      })
    } else if (metrics.errorRate > 5) {
      alerts.push({
        level: 'warning',
        message: `Elevated error rate: ${metrics.errorRate.toFixed(2)}%`,
        timestamp,
        action: 'Monitor error trends and check for patterns'
      })
    }

    // Critical errors alert
    if (metrics.criticalErrors > 0) {
      alerts.push({
        level: 'critical',
        message: `${metrics.criticalErrors} critical errors detected`,
        timestamp,
        action: 'Review critical errors immediately'
      })
    }

    // Slow response time alert
    if (metrics.averageResponseTime > 5000) {
      alerts.push({
        level: 'warning',
        message: `Slow average response time: ${metrics.averageResponseTime.toFixed(0)}ms`,
        timestamp,
        action: 'Check database performance and optimize queries'
      })
    }

    // Service health alerts
    this.healthChecks.forEach((isHealthy, service) => {
      if (!isHealthy) {
        alerts.push({
          level: 'critical',
          message: `Service ${service} is unhealthy`,
          timestamp,
          action: `Check ${service} connectivity and configuration`
        })
      }
    })

    return alerts
  }

  // Reset monitoring data (useful for testing or maintenance)
  reset(): void {
    this.healthChecks.clear()
    this.responseTimeBuffer = []
    this.logger.clearBuffer()
    console.log('[ERROR MONITOR] Monitoring data reset')
  }
}

export const errorMonitor = ServerErrorMonitor.getInstance()