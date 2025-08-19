# Design Document

## Overview

This design addresses the caching issues in the personal wealth management application by implementing a dual-caching strategy that distinguishes between dynamic user data and external pricing data. The solution ensures immediate reflection of CRUD operations while optimizing external API usage through strategic local caching and on-demand refresh mechanisms.

## Architecture

### Current Architecture Issues
- Aggressive cache invalidation affects both user data and pricing data equally
- External API calls (Google Script API, AMFI) are made on-demand causing slow responses
- No distinction between user-generated data that changes frequently and pricing data that can be cached longer
- Refresh operations don't provide immediate feedback to users
- Cache invalidation is too broad, affecting performance unnecessarily

### Target Architecture
- **Dual-Caching Strategy**: Separate caching mechanisms for user data vs. pricing data
- **Background Price Refresh**: Scheduled updates of pricing data from external APIs
- **Selective Cache Invalidation**: Invalidate only user data caches, preserve pricing caches
- **On-Demand Price Refresh**: Manual refresh capability with immediate UI feedback
- **Fallback Mechanisms**: Graceful degradation when external APIs fail

## Components and Interfaces

### Cache Strategy Manager

#### Dynamic Data Cache Manager
```typescript
interface DynamicDataCacheManager {
  // Always bypass cache for user CRUD operations
  invalidateUserData(dataType: 'investments' | 'goals' | 'sips' | 'accounts'): void
  
  // Preserve pricing data during user data invalidation
  preservePricingCache(): void
  
  // Get fresh user data bypassing cache
  getFreshUserData<T>(query: () => Promise<T>): Promise<T>
}

class UserDataCacheStrategy {
  // Disable caching for user CRUD operations
  static readonly CACHE_DISABLED_OPERATIONS = [
    'create', 'update', 'delete', 'upsert'
  ]
  
  // Enable caching only for read-heavy operations with short TTL
  static readonly CACHE_ENABLED_OPERATIONS = [
    'dashboard-summary', 'list-views'
  ]
  
  static readonly USER_DATA_CACHE_TTL = 30 * 1000 // 30 seconds max
}
```

#### Pricing Data Cache Manager
```typescript
interface PricingDataCacheManager {
  // Long-term caching for pricing data
  getCachedPrice(symbol: string): Promise<PriceData | null>
  
  // Background refresh scheduling
  scheduleBackgroundRefresh(intervalMs: number): void
  
  // Manual refresh with immediate feedback
  refreshPricesManually(symbols: string[]): Promise<RefreshResult>
  
  // Fallback to stale data when APIs fail
  getWithFallback(symbol: string): Promise<PriceData>
}

interface PriceData {
  symbol: string
  price: number
  source: string
  timestamp: Date
  isStale: boolean
  cacheAge: number
}

interface RefreshResult {
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
```

### Background Price Refresh Service

#### Scheduled Price Updates
```typescript
class BackgroundPriceRefreshService {
  private refreshInterval: NodeJS.Timeout | null = null
  private readonly DEFAULT_INTERVAL = 60 * 60 * 1000 // 1 hour
  
  async startScheduledRefresh(intervalMs: number = this.DEFAULT_INTERVAL): Promise<void> {
    // Get all unique symbols from investments and SIPs
    const symbols = await this.getAllTrackedSymbols()
    
    this.refreshInterval = setInterval(async () => {
      await this.batchRefreshPrices(symbols)
    }, intervalMs)
  }
  
  async batchRefreshPrices(symbols: string[]): Promise<RefreshResult> {
    // Process in batches to avoid API rate limits
    const batchSize = 10
    const results: RefreshResult = { success: 0, failed: 0, results: [] }
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      await this.processBatch(batch, results)
      
      // Rate limiting delay between batches
      if (i + batchSize < symbols.length) {
        await this.delay(2000) // 2 second delay
      }
    }
    
    return results
  }
  
  private async processBatch(symbols: string[], results: RefreshResult): Promise<void> {
    const stockSymbols = symbols.filter(s => !s.match(/^\d+$/))
    const mfSymbols = symbols.filter(s => s.match(/^\d+$/))
    
    // Parallel processing for different API types
    await Promise.all([
      this.refreshStockPrices(stockSymbols, results),
      this.refreshMutualFundPrices(mfSymbols, results)
    ])
  }
}
```

### Manual Refresh System

#### Real-Time Price Refresh
```typescript
interface ManualRefreshSystem {
  // Trigger immediate refresh from UI
  refreshPricesRealTime(symbols: string[]): Promise<RefreshResult>
  
  // Get refresh status for UI feedback
  getRefreshStatus(requestId: string): Promise<RefreshStatus>
  
  // Cancel ongoing refresh operation
  cancelRefresh(requestId: string): Promise<void>
}

interface RefreshStatus {
  requestId: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled'
  progress: {
    total: number
    completed: number
    failed: number
  }
  startTime: Date
  endTime?: Date
  results?: RefreshResult
}

class RealTimePriceRefresh {
  private activeRefreshes = new Map<string, RefreshStatus>()
  
  async refreshWithProgress(symbols: string[]): Promise<string> {
    const requestId = this.generateRequestId()
    
    const status: RefreshStatus = {
      requestId,
      status: 'pending',
      progress: { total: symbols.length, completed: 0, failed: 0 },
      startTime: new Date()
    }
    
    this.activeRefreshes.set(requestId, status)
    
    // Start async refresh process
    this.performRefreshWithUpdates(requestId, symbols)
    
    return requestId
  }
  
  private async performRefreshWithUpdates(requestId: string, symbols: string[]): Promise<void> {
    const status = this.activeRefreshes.get(requestId)!
    status.status = 'in-progress'
    
    const results: RefreshResult = { success: 0, failed: 0, results: [] }
    
    for (const symbol of symbols) {
      if (status.status === 'cancelled') break
      
      try {
        const priceData = await this.fetchFreshPrice(symbol)
        await this.updatePriceCache(symbol, priceData)
        
        results.success++
        results.results.push({
          symbol,
          success: true,
          price: priceData.price,
          refreshTime: Date.now()
        })
      } catch (error) {
        results.failed++
        results.results.push({
          symbol,
          success: false,
          error: error.message,
          refreshTime: Date.now()
        })
      }
      
      status.progress.completed++
      status.progress.failed = results.failed
    }
    
    status.status = status.status === 'cancelled' ? 'cancelled' : 'completed'
    status.endTime = new Date()
    status.results = results
  }
}
```

### Selective Cache Invalidation

#### Smart Cache Invalidation Strategy
```typescript
class SelectiveCacheInvalidation {
  /**
   * Invalidate only user data, preserve pricing cache
   */
  static invalidateUserDataOnly(dataType: 'investments' | 'goals' | 'sips' | 'accounts'): void {
    console.log(`[SelectiveInvalidation] Invalidating ${dataType} user data only...`)
    
    // Invalidate user data cache tags
    revalidateTag(`${dataType}-user-data`)
    revalidateTag('dashboard-user-data')
    
    // Invalidate pages but preserve pricing data
    revalidatePath(`/${dataType}`, 'page')
    revalidatePath('/', 'page')
    
    // DO NOT invalidate pricing-related tags
    // Preserve: 'pricing-data', 'price-cache', 'external-api-cache'
    
    console.log(`[SelectiveInvalidation] ${dataType} user data invalidated, pricing preserved`)
  }
  
  /**
   * Invalidate pricing data only (for manual refresh)
   */
  static invalidatePricingDataOnly(): void {
    console.log('[SelectiveInvalidation] Invalidating pricing data only...')
    
    // Invalidate only pricing-related cache tags
    revalidateTag('pricing-data')
    revalidateTag('price-cache')
    revalidateTag('external-api-cache')
    
    // Invalidate pages that display pricing data
    revalidatePath('/', 'page') // Dashboard
    revalidatePath('/investments', 'page')
    revalidatePath('/charts', 'page')
    
    console.log('[SelectiveInvalidation] Pricing data invalidated, user data preserved')
  }
  
  /**
   * Smart invalidation based on operation type
   */
  static smartInvalidate(operation: {
    type: 'user-crud' | 'price-refresh' | 'full-refresh'
    dataType?: string
    affectedSymbols?: string[]
  }): void {
    switch (operation.type) {
      case 'user-crud':
        this.invalidateUserDataOnly(operation.dataType as any)
        break
      case 'price-refresh':
        this.invalidatePricingDataOnly()
        break
      case 'full-refresh':
        CacheInvalidation.invalidateAll()
        break
    }
  }
}
```

## Data Models

### Enhanced Price Cache Models
```typescript
interface EnhancedPriceCache {
  symbol: string
  price: number
  source: 'GOOGLE_SCRIPT' | 'AMFI' | 'FALLBACK'
  lastUpdated: Date
  cacheType: 'background' | 'manual' | 'fallback'
  refreshCount: number
  errorCount: number
  lastError?: string
  isStale: boolean
  staleSince?: Date
}

interface PriceRefreshLog {
  id: string
  requestId: string
  symbol: string
  oldPrice?: number
  newPrice?: number
  source: string
  refreshType: 'background' | 'manual'
  success: boolean
  error?: string
  responseTime: number
  timestamp: Date
}

interface RefreshSession {
  id: string
  requestId: string
  userId?: string
  symbolsRequested: string[]
  symbolsCompleted: string[]
  symbolsFailed: string[]
  startTime: Date
  endTime?: Date
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled'
  triggerType: 'background' | 'manual' | 'system'
}
```

### Cache Configuration Models
```typescript
interface CacheConfiguration {
  userDataCache: {
    enabled: boolean
    ttl: number // Short TTL for user data
    maxSize: number
  }
  pricingDataCache: {
    enabled: boolean
    ttl: number // Long TTL for pricing data
    staleTtl: number // How long to keep stale data
    maxSize: number
  }
  backgroundRefresh: {
    enabled: boolean
    interval: number
    batchSize: number
    rateLimitDelay: number
  }
  manualRefresh: {
    enabled: boolean
    maxConcurrentRequests: number
    timeoutMs: number
  }
}
```

## Error Handling

### Graceful Degradation Strategy
```typescript
class PricingErrorHandler {
  async handlePricingFailure(symbol: string, error: Error): Promise<PriceData | null> {
    console.warn(`Pricing failure for ${symbol}:`, error.message)
    
    // Fallback 1: Use stale cache data (up to 24 hours old)
    const staleData = await this.getStalePrice(symbol)
    if (staleData && this.isAcceptablyStale(staleData)) {
      return { ...staleData, isStale: true }
    }
    
    // Fallback 2: Use historical average
    const historicalAverage = await this.getHistoricalAverage(symbol)
    if (historicalAverage) {
      return {
        symbol,
        price: historicalAverage,
        source: 'HISTORICAL_AVERAGE',
        timestamp: new Date(),
        isStale: true,
        cacheAge: 0
      }
    }
    
    // Fallback 3: Return null and let UI handle gracefully
    return null
  }
  
  private isAcceptablyStale(priceData: PriceData): boolean {
    const staleThreshold = 24 * 60 * 60 * 1000 // 24 hours
    return Date.now() - priceData.timestamp.getTime() < staleThreshold
  }
}

class UserDataErrorHandler {
  async handleUserDataFailure(operation: string, error: Error): Promise<void> {
    console.error(`User data operation failed: ${operation}`, error)
    
    // For user data, we don't use stale data - always show error
    throw new Error(`Failed to ${operation}: ${error.message}`)
  }
}
```

### API Rate Limiting and Retry Logic
```typescript
class APIRateLimiter {
  private requestCounts = new Map<string, { count: number; resetTime: number }>()
  private readonly RATE_LIMITS = {
    'GOOGLE_SCRIPT': { requests: 100, windowMs: 60 * 1000 }, // 100 per minute
    'AMFI': { requests: 10, windowMs: 60 * 1000 } // 10 per minute
  }
  
  async executeWithRateLimit<T>(
    apiType: keyof typeof this.RATE_LIMITS,
    operation: () => Promise<T>
  ): Promise<T> {
    await this.waitForRateLimit(apiType)
    
    try {
      const result = await this.executeWithRetry(operation)
      this.recordSuccessfulRequest(apiType)
      return result
    } catch (error) {
      this.recordFailedRequest(apiType)
      throw error
    }
  }
  
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError!
  }
}
```

## Testing Strategy

### Cache Behavior Testing
```typescript
describe('Dynamic Data Caching', () => {
  it('should bypass cache for user CRUD operations', async () => {
    // Create investment
    await createInvestment(testData)
    
    // Verify cache was bypassed and fresh data is returned
    const investments = await getInvestments()
    expect(investments).toContainEqual(expect.objectContaining(testData))
  })
  
  it('should preserve pricing cache during user data invalidation', async () => {
    // Populate pricing cache
    await updatePriceCache('RELIANCE', 2500)
    
    // Perform user data operation
    await updateInvestment(investmentId, updateData)
    
    // Verify pricing cache is preserved
    const cachedPrice = await getCachedPrice('RELIANCE')
    expect(cachedPrice).toBe(2500)
  })
})

describe('Background Price Refresh', () => {
  it('should refresh prices at scheduled intervals', async () => {
    const refreshService = new BackgroundPriceRefreshService()
    await refreshService.startScheduledRefresh(5000) // 5 seconds for testing
    
    // Wait for refresh cycle
    await new Promise(resolve => setTimeout(resolve, 6000))
    
    // Verify prices were updated
    const stats = await getCacheStats()
    expect(stats.databaseCache.count).toBeGreaterThan(0)
  })
})

describe('Manual Price Refresh', () => {
  it('should provide real-time refresh with progress updates', async () => {
    const refreshSystem = new RealTimePriceRefresh()
    const requestId = await refreshSystem.refreshWithProgress(['RELIANCE', 'INFY'])
    
    // Check progress updates
    let status = await refreshSystem.getRefreshStatus(requestId)
    expect(status.status).toBe('pending')
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    status = await refreshSystem.getRefreshStatus(requestId)
    expect(status.status).toBe('completed')
    expect(status.results?.success).toBeGreaterThan(0)
  })
})
```

### Performance Testing
```typescript
describe('Cache Performance', () => {
  it('should maintain fast response times for user data operations', async () => {
    const startTime = performance.now()
    
    await createInvestment(testData)
    const investments = await getInvestments()
    
    const endTime = performance.now()
    expect(endTime - startTime).toBeLessThan(500) // Under 500ms
  })
  
  it('should serve pricing data from cache quickly', async () => {
    // Pre-populate cache
    await updatePriceCache('RELIANCE', 2500)
    
    const startTime = performance.now()
    const price = await getCachedPrice('RELIANCE')
    const endTime = performance.now()
    
    expect(price).toBe(2500)
    expect(endTime - startTime).toBeLessThan(50) // Under 50ms
  })
})
```

## Performance Considerations

### Cache Size Management
- **User Data Cache**: Small size (100 entries), short TTL (30 seconds)
- **Pricing Data Cache**: Large size (10,000 entries), long TTL (1 hour)
- **Stale Data Retention**: Keep stale pricing data for 24 hours as fallback

### Memory Usage Optimization
- Use LRU eviction for both cache types
- Monitor memory usage and adjust cache sizes dynamically
- Implement cache warming for frequently accessed symbols

### Database Query Optimization
- Index price cache table by symbol and lastUpdated
- Use batch operations for bulk price updates
- Implement connection pooling for high-concurrency scenarios

## Migration Strategy

### Phase 1: Implement Selective Cache Invalidation
1. Update cache invalidation logic to preserve pricing data
2. Modify server actions to use selective invalidation
3. Test user CRUD operations maintain immediate updates

### Phase 2: Background Price Refresh Service
1. Implement scheduled price refresh service
2. Set up background job to run every hour
3. Monitor API usage and adjust batch sizes

### Phase 3: Manual Refresh System
1. Create real-time refresh API endpoints
2. Implement progress tracking and status updates
3. Add refresh buttons to UI components

### Phase 4: Enhanced Error Handling
1. Implement fallback mechanisms for pricing failures
2. Add graceful degradation for stale data scenarios
3. Improve error messaging and user feedback

### Phase 5: Performance Monitoring
1. Add metrics collection for cache hit rates
2. Monitor API response times and failure rates
3. Set up alerts for performance degradation