/**
 * Client-side cache manager for improved performance
 * Implements multiple caching strategies including memory cache, localStorage, and query cache
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

export interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
  prefix?: string; // Key prefix for storage
}

export class CacheManager<T = any> {
  private memoryCache = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      storage: 'memory',
      prefix: 'cache_',
      ...options,
    };

    // Start cleanup interval for memory cache
    if (this.options.storage === 'memory') {
      this.startCleanupInterval();
    }
  }

  /**
   * Get data from cache
   */
  get(key: string): T | null {
    const fullKey = this.getFullKey(key);

    try {
      let entry: CacheEntry<T> | null = null;

      if (this.options.storage === 'memory') {
        entry = this.memoryCache.get(fullKey) || null;
      } else {
        const storage = this.getStorage();
        const stored = storage?.getItem(fullKey);
        if (stored) {
          entry = JSON.parse(stored);
        }
      }

      if (!entry) {
        return null;
      }

      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  set(key: string, data: T, ttl?: number): void {
    const fullKey = this.getFullKey(key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl,
      key: fullKey,
    };

    try {
      if (this.options.storage === 'memory') {
        // Enforce max size for memory cache
        if (this.memoryCache.size >= this.options.maxSize) {
          this.evictOldest();
        }
        this.memoryCache.set(fullKey, entry);
      } else {
        const storage = this.getStorage();
        if (storage) {
          storage.setItem(fullKey, JSON.stringify(entry));
        }
      }
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Delete data from cache
   */
  delete(key: string): void {
    const fullKey = this.getFullKey(key);

    try {
      if (this.options.storage === 'memory') {
        this.memoryCache.delete(fullKey);
      } else {
        const storage = this.getStorage();
        storage?.removeItem(fullKey);
      }
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    try {
      if (this.options.storage === 'memory') {
        this.memoryCache.clear();
      } else {
        const storage = this.getStorage();
        if (storage) {
          // Clear only entries with our prefix
          const keysToRemove: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(this.options.prefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => storage.removeItem(key));
        }
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    storage: string;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries: Array<{ key: string; age: number; ttl: number }> = [];

    try {
      if (this.options.storage === 'memory') {
        this.memoryCache.forEach((entry, key) => {
          entries.push({
            key: key.replace(this.options.prefix, ''),
            age: Date.now() - entry.timestamp,
            ttl: entry.ttl,
          });
        });
      } else {
        const storage = this.getStorage();
        if (storage) {
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(this.options.prefix)) {
              try {
                const entry: CacheEntry<T> = JSON.parse(storage.getItem(key) || '');
                entries.push({
                  key: key.replace(this.options.prefix, ''),
                  age: Date.now() - entry.timestamp,
                  ttl: entry.ttl,
                });
              } catch (e) {
                // Skip invalid entries
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Cache stats error:', error);
    }

    return {
      size: entries.length,
      maxSize: this.options.maxSize,
      storage: this.options.storage,
      entries,
    };
  }

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<R = T>(
    key: string,
    fetchFn: () => Promise<R>,
    ttl?: number
  ): Promise<R> {
    const cached = this.get(key) as R | null;
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data as any, ttl);
    return data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);

    try {
      if (this.options.storage === 'memory') {
        const keysToDelete: string[] = [];
        this.memoryCache.forEach((_, key) => {
          if (regex.test(key.replace(this.options.prefix, ''))) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => this.memoryCache.delete(key));
      } else {
        const storage = this.getStorage();
        if (storage) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(this.options.prefix)) {
              const cleanKey = key.replace(this.options.prefix, '');
              if (regex.test(cleanKey)) {
                keysToRemove.push(key);
              }
            }
          }
          keysToRemove.forEach(key => storage.removeItem(key));
        }
      }
    } catch (error) {
      console.warn('Cache invalidate pattern error:', error);
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let removedCount = 0;

    try {
      if (this.options.storage === 'memory') {
        const keysToDelete: string[] = [];
        this.memoryCache.forEach((entry, key) => {
          if (Date.now() - entry.timestamp > entry.ttl) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => {
          this.memoryCache.delete(key);
          removedCount++;
        });
      } else {
        const storage = this.getStorage();
        if (storage) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(this.options.prefix)) {
              try {
                const entry: CacheEntry<T> = JSON.parse(storage.getItem(key) || '');
                if (Date.now() - entry.timestamp > entry.ttl) {
                  keysToRemove.push(key);
                }
              } catch (e) {
                // Remove invalid entries
                keysToRemove.push(key);
              }
            }
          }
          keysToRemove.forEach(key => {
            storage.removeItem(key);
            removedCount++;
          });
        }
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }

    return removedCount;
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  private getFullKey(key: string): string {
    return `${this.options.prefix}${key}`;
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return this.options.storage === 'localStorage' 
        ? window.localStorage 
        : window.sessionStorage;
    } catch (error) {
      console.warn('Storage not available:', error);
      return null;
    }
  }

  private evictOldest(): void {
    if (this.memoryCache.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    this.memoryCache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
    
    // Continue evicting until we're under the max size
    while (this.memoryCache.size >= this.options.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      } else {
        break;
      }
    }
  }

  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const removed = this.cleanup();
      if (removed > 0) {
        console.log(`Cache cleanup: removed ${removed} expired entries`);
      }
    }, 5 * 60 * 1000);
  }
}

// Global cache instances for different data types
export const investmentCache = new CacheManager({
  ttl: 2 * 60 * 1000, // 2 minutes for investment data
  maxSize: 50,
  storage: 'memory',
  prefix: 'inv_',
});

export const priceCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes for price data
  maxSize: 100,
  storage: 'memory',
  prefix: 'price_',
});

export const dashboardCache = new CacheManager({
  ttl: 1 * 60 * 1000, // 1 minute for dashboard data
  maxSize: 10,
  storage: 'memory',
  prefix: 'dash_',
});

export const staticDataCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 30 minutes for static data (goals, accounts)
  maxSize: 50,
  storage: 'localStorage',
  prefix: 'static_',
});

// Query cache for API responses
export class QueryCache {
  private cache = new CacheManager<any>({
    ttl: 5 * 60 * 1000, // 5 minutes default
    maxSize: 100,
    storage: 'memory',
    prefix: 'query_',
  });

  async query<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { ttl?: number; forceRefresh?: boolean } = {}
  ): Promise<T> {
    const { ttl, forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached !== null) {
        return cached;
      }
    }

    const data = await fetchFn();
    this.cache.set(key, data, ttl);
    return data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    this.cache.invalidatePattern(pattern);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }
}

export const queryCache = new QueryCache();

// Utility functions for cache key generation
export const cacheKeys = {
  investments: {
    list: () => 'investments:list',
    detail: (id: string) => `investments:detail:${id}`,
    byAccount: (accountId: string) => `investments:account:${accountId}`,
    byGoal: (goalId: string) => `investments:goal:${goalId}`,
  },
  goals: {
    list: () => 'goals:list',
    detail: (id: string) => `goals:detail:${id}`,
  },
  accounts: {
    list: () => 'accounts:list',
    detail: (id: string) => `accounts:detail:${id}`,
  },
  dashboard: {
    summary: () => 'dashboard:summary',
    portfolio: () => 'dashboard:portfolio',
    allocation: () => 'dashboard:allocation',
  },
  prices: {
    stock: (symbol: string) => `prices:stock:${symbol}`,
    mutualFund: (schemeCode: string) => `prices:mf:${schemeCode}`,
    batch: (symbols: string[]) => `prices:batch:${symbols.sort().join(',')}`,
  },
};

export default CacheManager;