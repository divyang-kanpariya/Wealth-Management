import { unstable_cache } from 'next/cache'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  hitCount: number
  lastAccessed: number
}

export interface CacheStats {
  totalEntries: number
  hitRate: number
  totalHits: number
  totalMisses: number
  averageAge: number
  memoryUsage: number
}

export class AdvancedCacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private readonly defaultTTL: number
  private readonly maxSize: number
  private readonly staleWhileRevalidate: number
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  }

  constructor(
    defaultTTL: number = 5 * 60 * 1000, // 5 minutes
    maxSize: number = 1000,
    staleWhileRevalidate: number = 10 * 60 * 1000 // 10 minutes
  ) {
    this.defaultTTL = defaultTTL
    this.maxSize = maxSize
    this.staleWhileRevalidate = staleWhileRevalidate
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      this.stats.misses++
      return null
    }

    const now = Date.now()
    
    // Update access stats
    entry.hitCount++
    entry.lastAccessed = now
    
    // Check if expired
    if (now > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return entry.data
  }

  getStale(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    
    // Return stale data if within stale-while-revalidate window
    if (now <= (entry.timestamp + this.staleWhileRevalidate)) {
      entry.hitCount++
      entry.lastAccessed = now
      return entry.data
    }

    // Remove if too old
    this.cache.delete(key)
    return null
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const effectiveTTL = ttl || this.defaultTTL
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + effectiveTTL,
      hitCount: 0,
      lastAccessed: now
    }

    // Evict if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, entry)
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return true

    const now = Date.now()
    return now > (entry.timestamp + this.defaultTTL)
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  getStats(): CacheStats {
    const now = Date.now()
    const entries = Array.from(this.cache.values())
    
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    
    const averageAge = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length
      : 0

    // Rough memory usage estimation
    const memoryUsage = this.cache.size * 1024 // Rough estimate in bytes

    return {
      totalEntries: this.cache.size,
      hitRate,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      averageAge,
      memoryUsage
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
    }
  }

  cleanup(): number {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        removedCount++
      }
    }

    return removedCount
  }
}

// Global cache instances for different data types
export const dashboardCache = new AdvancedCacheManager(2 * 60 * 1000, 100) // 2 min TTL
export const chartsCache = new AdvancedCacheManager(5 * 60 * 1000, 50) // 5 min TTL
export const listCache = new AdvancedCacheManager(3 * 60 * 1000, 200) // 3 min TTL
export const detailCache = new AdvancedCacheManager(10 * 60 * 1000, 500) // 10 min TTL

// Next.js cache wrapper with performance monitoring
export function createOptimizedCache<T>(
  fn: () => Promise<T>,
  keys: string[],
  options: {
    revalidate?: number
    tags?: string[]
    name?: string
  } = {}
): () => Promise<T> {
  const { revalidate = 300, tags = [], name = 'unknown' } = options
  
  return unstable_cache(
    async () => {
      const startTime = performance.now()
      try {
        const result = await fn()
        const duration = performance.now() - startTime
        
        if (duration > 1000) { // Log slow operations
          console.warn(`[Cache:${name}] Slow operation: ${duration.toFixed(2)}ms`)
        }
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        console.error(`[Cache:${name}] Error after ${duration.toFixed(2)}ms:`, error)
        throw error
      }
    },
    keys,
    { revalidate, tags }
  )
}