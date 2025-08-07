import { performanceMonitor } from './monitoring'
import { PreparatorPerformanceMonitor } from './optimized-preparators'

// Performance optimization initialization
export function initializePerformanceOptimizations() {
  console.log('[PerformanceOptimizations] Initializing performance monitoring...')

  // Start system monitoring (every 30 seconds)
  const stopSystemMonitoring = performanceMonitor.startSystemMonitoring(30000)

  // Start periodic performance reporting (every 5 minutes)
  const stopPeriodicReporting = PreparatorPerformanceMonitor.startPeriodicReporting(5 * 60 * 1000)

  // Log initial status
  console.log('[PerformanceOptimizations] Performance monitoring initialized')
  console.log('[PerformanceOptimizations] System monitoring: enabled (30s intervals)')
  console.log('[PerformanceOptimizations] Performance reporting: enabled (5min intervals)')

  // Return cleanup function
  return () => {
    stopSystemMonitoring()
    stopPeriodicReporting()
    console.log('[PerformanceOptimizations] Performance monitoring stopped')
  }
}

// Utility to log current performance status
export function logPerformanceStatus() {
  const stats = PreparatorPerformanceMonitor.getOverallStats()
  
  console.log('[PerformanceStatus] Current Performance Metrics:')
  console.log(`  Total Requests: ${stats.performance.totalRequests}`)
  console.log(`  Average Page Load: ${stats.performance.averagePageLoadTime.toFixed(2)}ms`)
  console.log(`  Cache Hit Rate: ${stats.performance.cacheHitRate.toFixed(2)}%`)
  console.log(`  Memory Usage: ${stats.performance.memoryUsage.toFixed(2)}MB`)
  console.log(`  Slow Pages: ${stats.performance.slowPagesCount}`)
  console.log(`  Slow Queries: ${stats.queries.slow.length}`)
  
  if (stats.performance.topSlowPages.length > 0) {
    console.log('  Top Slow Pages:')
    stats.performance.topSlowPages.forEach(page => {
      console.log(`    - ${page.pageName}: ${page.averageTime.toFixed(2)}ms`)
    })
  }
}

// Performance health check
export function performanceHealthCheck(): {
  status: 'healthy' | 'warning' | 'critical'
  issues: string[]
  recommendations: string[]
} {
  const stats = PreparatorPerformanceMonitor.getOverallStats()
  const issues: string[] = []
  const recommendations: string[] = []
  
  // Check average page load time
  if (stats.performance.averagePageLoadTime > 2000) {
    issues.push(`High average page load time: ${stats.performance.averagePageLoadTime.toFixed(2)}ms`)
    recommendations.push('Consider optimizing database queries or increasing cache TTL')
  }
  
  // Check cache hit rate
  if (stats.performance.cacheHitRate < 70) {
    issues.push(`Low cache hit rate: ${stats.performance.cacheHitRate.toFixed(2)}%`)
    recommendations.push('Review cache invalidation strategy or increase cache size')
  }
  
  // Check memory usage
  if (stats.performance.memoryUsage > 500) {
    issues.push(`High memory usage: ${stats.performance.memoryUsage.toFixed(2)}MB`)
    recommendations.push('Consider reducing cache size or implementing memory cleanup')
  }
  
  // Check slow queries
  if (stats.queries.slow.length > 10) {
    issues.push(`Many slow queries: ${stats.queries.slow.length} queries > 1000ms`)
    recommendations.push('Optimize database queries and add proper indexing')
  }
  
  // Determine overall status
  let status: 'healthy' | 'warning' | 'critical' = 'healthy'
  if (issues.length > 0) {
    status = issues.length > 2 ? 'critical' : 'warning'
  }
  
  return { status, issues, recommendations }
}

// Export for use in application startup
export const performanceOptimizations = {
  initialize: initializePerformanceOptimizations,
  logStatus: logPerformanceStatus,
  healthCheck: performanceHealthCheck
}