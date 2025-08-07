import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, investmentCache, priceCache, queryCache } from '../../lib/cache-manager';

describe('Cache Performance Tests', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({
      ttl: 1000, // 1 second for testing
      maxSize: 100,
      storage: 'memory',
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Memory Cache Performance', () => {
    it('should handle rapid sequential writes efficiently', () => {
      const startTime = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        cache.set(`key_${i}`, { id: i, data: `test_data_${i}` });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 1000 writes in less than 100ms
      expect(duration).toBeLessThan(100);
      expect(cache.getStats().size).toBe(100); // Should respect maxSize
    });

    it('should handle rapid sequential reads efficiently', () => {
      // Pre-populate cache
      for (let i = 0; i < 100; i++) {
        cache.set(`key_${i}`, { id: i, data: `test_data_${i}` });
      }

      const startTime = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const key = `key_${i % 100}`;
        cache.get(key);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 1000 reads in less than 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should handle mixed read/write operations efficiently', () => {
      const startTime = performance.now();
      const iterations = 500;

      for (let i = 0; i < iterations; i++) {
        // Write operation
        cache.set(`key_${i}`, { id: i, data: `test_data_${i}` });
        
        // Read operation
        if (i > 0) {
          cache.get(`key_${i - 1}`);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete mixed operations in reasonable time
      expect(duration).toBeLessThan(100);
    });

    it('should efficiently evict oldest entries when maxSize is reached', () => {
      const maxSize = 50;
      const testCache = new CacheManager({
        ttl: 10000, // Long TTL to avoid expiration during test
        maxSize,
        storage: 'memory',
      });

      const startTime = performance.now();

      // Add more items than maxSize
      for (let i = 0; i < maxSize * 2; i++) {
        testCache.set(`key_${i}`, { id: i, data: `test_data_${i}` });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(testCache.getStats().size).toBe(maxSize);
      expect(duration).toBeLessThan(50); // Should be fast even with eviction

      testCache.destroy();
    });

    it('should handle cache cleanup efficiently', () => {
      const shortTtlCache = new CacheManager({
        ttl: 1, // 1ms TTL for quick expiration
        maxSize: 100,
        storage: 'memory',
      });

      // Add items that will expire quickly
      for (let i = 0; i < 50; i++) {
        shortTtlCache.set(`key_${i}`, { id: i, data: `test_data_${i}` });
      }

      // Wait for expiration
      setTimeout(() => {
        const startTime = performance.now();
        const removedCount = shortTtlCache.cleanup();
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(removedCount).toBe(50);
        expect(duration).toBeLessThan(10); // Cleanup should be fast
        expect(shortTtlCache.getStats().size).toBe(0);

        shortTtlCache.destroy();
      }, 10);
    });
  });

  describe('Query Cache Performance', () => {
    it('should handle concurrent queries efficiently', async () => {
      let callCount = 0;
      const mockFetch = vi.fn(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate API delay
        return { data: `result_${callCount}` };
      });

      const startTime = performance.now();

      // Make multiple concurrent requests for the same data
      const promises = Array.from({ length: 10 }, () =>
        queryCache.query('test_key', mockFetch)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should only call the fetch function once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(10);
      expect(results.every(result => result.data === 'result_1')).toBe(true);
      
      // Should complete faster than 10 individual API calls
      expect(duration).toBeLessThan(100);
    });

    it('should handle cache invalidation patterns efficiently', () => {
      // Pre-populate cache with pattern-based keys
      for (let i = 0; i < 100; i++) {
        queryCache.query(`user_${i}`, async () => ({ id: i, name: `User ${i}` }));
        queryCache.query(`post_${i}`, async () => ({ id: i, title: `Post ${i}` }));
      }

      const startTime = performance.now();
      
      // Invalidate all user-related cache entries
      queryCache.invalidatePattern('user_.*');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(20); // Pattern invalidation should be fast
    });
  });

  describe('Global Cache Instances Performance', () => {
    it('should handle investment cache operations efficiently', () => {
      const startTime = performance.now();

      // Simulate typical investment cache usage
      for (let i = 0; i < 50; i++) {
        const investment = {
          id: `inv_${i}`,
          name: `Investment ${i}`,
          type: 'STOCK',
          value: Math.random() * 10000,
        };
        
        investmentCache.set(`investment_${i}`, investment);
        
        if (i > 0) {
          investmentCache.get(`investment_${i - 1}`);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50);
      expect(investmentCache.getStats().size).toBeGreaterThan(0);
    });

    it('should handle price cache operations efficiently', () => {
      const startTime = performance.now();

      // Simulate typical price cache usage
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      
      for (let i = 0; i < 100; i++) {
        const symbol = symbols[i % symbols.length];
        const price = Math.random() * 1000;
        
        priceCache.set(`price_${symbol}`, price);
        priceCache.get(`price_${symbol}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(30);
      expect(priceCache.getStats().size).toBe(symbols.length);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks with frequent cache operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many cache operations
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i < 100; i++) {
          cache.set(`key_${cycle}_${i}`, {
            id: i,
            data: new Array(100).fill(`data_${i}`), // Create some memory pressure
          });
        }
        
        // Clear cache periodically
        if (cycle % 3 === 0) {
          cache.clear();
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Cache Statistics Performance', () => {
    it('should generate cache statistics efficiently', () => {
      // Pre-populate cache
      for (let i = 0; i < 100; i++) {
        cache.set(`key_${i}`, { id: i, data: `test_data_${i}` });
      }

      const startTime = performance.now();
      
      // Generate stats multiple times
      for (let i = 0; i < 10; i++) {
        const stats = cache.getStats();
        expect(stats.size).toBeGreaterThan(0);
        expect(stats.entries).toHaveLength(stats.size);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Stats generation should be fast
      expect(duration).toBeLessThan(20);
    });
  });
});

describe('Cache Integration Performance Tests', () => {
  it('should handle realistic application usage patterns', async () => {
    const startTime = performance.now();

    // Simulate realistic application cache usage
    const operations = [
      // Investment data caching
      () => investmentCache.set('investments_list', Array.from({ length: 50 }, (_, i) => ({
        id: `inv_${i}`,
        name: `Investment ${i}`,
        value: Math.random() * 10000,
      }))),
      
      // Price data caching
      () => {
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
        symbols.forEach(symbol => {
          priceCache.set(`price_${symbol}`, Math.random() * 1000);
        });
      },
      
      // Query caching
      () => queryCache.query('dashboard_summary', async () => ({
        totalValue: Math.random() * 100000,
        totalGain: Math.random() * 10000,
        investmentCount: 50,
      })),
      
      // Cache reads
      () => {
        investmentCache.get('investments_list');
        priceCache.get('price_AAPL');
        queryCache.query('dashboard_summary', async () => ({}));
      },
    ];

    // Execute operations multiple times
    for (let i = 0; i < 20; i++) {
      const operation = operations[i % operations.length];
      await operation();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should handle realistic usage efficiently
    expect(duration).toBeLessThan(200);

    // Verify caches have data
    expect(investmentCache.getStats().size).toBeGreaterThan(0);
    expect(priceCache.getStats().size).toBeGreaterThan(0);
  });
});