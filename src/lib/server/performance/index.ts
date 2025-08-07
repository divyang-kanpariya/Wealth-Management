// Performance optimization exports
export * from './cache-manager'
export * from './parallel-fetcher'
export * from './query-optimizer'
export * from './monitoring'
export * from './optimized-preparators'
export * from './init'

// Re-export commonly used instances
export {
  dashboardCache,
  chartsCache,
  listCache,
  detailCache,
  createOptimizedCache
} from './cache-manager'

export {
  parallelFetcher
} from './parallel-fetcher'

export {
  queryOptimizer
} from './query-optimizer'

export {
  performanceMonitor,
  withPerformanceTracking,
  trackPerformance
} from './monitoring'

export {
  OptimizedDataPreparator,
  createOptimizedPreparator,
  PreparatorPerformanceMonitor
} from './optimized-preparators'

export {
  performanceOptimizations
} from './init'