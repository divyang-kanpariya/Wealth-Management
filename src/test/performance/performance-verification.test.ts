import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../../lib/cache-manager';
import { PaginationHelper } from '../../lib/pagination';

describe('Performance Verification Tests', () => {
  describe('Cache Manager Performance', () => {
    let cache: CacheManager;

    beforeEach(() => {
      cache = new CacheManager({
        ttl: 1000,
        maxSize: 50,
        storage: 'memory',
      });
    });

    afterEach(() => {
      cache.destroy();
    });

    it('should handle cache operations within performance thresholds', () => {
      const startTime = performance.now();
      
      // Write operations
      for (let i = 0; i < 100; i++) {
        cache.set(`key_${i}`, { id: i, data: `test_${i}` });
      }
      
      // Read operations
      for (let i = 0; i < 100; i++) {
        cache.get(`key_${i % 50}`); // Some will hit, some will miss due to maxSize
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete operations quickly
      expect(duration).toBeLessThan(100);
      
      // Should respect maxSize
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(50);
    });

    it('should handle cache cleanup efficiently', async () => {
      // Add items with short TTL
      for (let i = 0; i < 20; i++) {
        cache.set(`key_${i}`, { data: i }, 1); // 1ms TTL
      }
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const startTime = performance.now();
      const removedCount = cache.cleanup();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(removedCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(20);
    });

    it('should handle getOrSet pattern efficiently', async () => {
      let fetchCallCount = 0;
      const mockFetch = async () => {
        fetchCallCount++;
        await new Promise(resolve => setTimeout(resolve, 5));
        return { data: 'test' };
      };

      const startTime = performance.now();
      
      // First call should fetch
      const result1 = await cache.getOrSet('test_key', mockFetch);
      
      // Second call should use cache
      const result2 = await cache.getOrSet('test_key', mockFetch);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(fetchCallCount).toBe(1); // Should only fetch once
      expect(result1).toEqual(result2);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Pagination Helper Performance', () => {
    let pagination: PaginationHelper;

    beforeEach(() => {
      pagination = new PaginationHelper({
        defaultLimit: 20,
        maxLimit: 100,
      });
    });

    it('should parse parameters efficiently', () => {
      const startTime = performance.now();
      
      // Test parameter parsing multiple times
      for (let i = 0; i < 100; i++) {
        const params = pagination.parseParams({
          page: i + 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          search: 'test query',
          filters: { type: 'STOCK', active: true },
        });
        
        expect(params.page).toBe(i + 1);
        expect(params.limit).toBe(20);
        expect(params.skip).toBe(i * 20);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Parameter parsing should be very fast
      expect(duration).toBeLessThan(50);
    });

    it('should create responses efficiently', () => {
      const mockData = Array.from({ length: 20 }, (_, i) => ({
        id: `item_${i}`,
        name: `Item ${i}`,
      }));

      const startTime = performance.now();
      
      // Create responses multiple times
      for (let i = 0; i < 50; i++) {
        const response = pagination.createResponse(mockData, 1000, {
          page: i + 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        
        expect(response.data).toHaveLength(20);
        expect(response.pagination.page).toBe(i + 1);
        expect(response.pagination.total).toBe(1000);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Response creation should be fast
      expect(duration).toBeLessThan(30);
    });

    it('should handle where clause generation efficiently', () => {
      const startTime = performance.now();
      
      // Generate where clauses with various complexity
      for (let i = 0; i < 100; i++) {
        const where = pagination.getPrismaWhere(
          'search term',
          {
            type: 'STOCK',
            active: true,
            dateRange: { from: new Date(), to: new Date() },
            tags: ['tag1', 'tag2'],
          },
          ['name', 'description', 'notes']
        );
        
        expect(where.OR).toBeDefined(); // Search conditions
        expect(where.type).toBe('STOCK');
        expect(where.active).toBe(true);
        expect(where.dateRange.gte).toBeInstanceOf(Date);
        expect(where.tags.in).toEqual(['tag1', 'tag2']);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Where clause generation should be fast
      expect(duration).toBeLessThan(20);
    });

    it('should handle order by generation efficiently', () => {
      const startTime = performance.now();
      
      const sortFields = [
        'name',
        'createdAt',
        'updatedAt',
        'account.name',
        'goal.targetDate',
        'nested.field.value',
      ];
      
      // Generate order by clauses
      for (let i = 0; i < 100; i++) {
        const sortBy = sortFields[i % sortFields.length];
        const sortOrder = i % 2 === 0 ? 'asc' : 'desc';
        
        const orderBy = pagination.getPrismaOrderBy(sortBy, sortOrder);
        
        expect(orderBy).toBeDefined();
        expect(typeof orderBy).toBe('object');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Order by generation should be very fast
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Memory Usage Verification', () => {
    it('should not cause significant memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform operations that could potentially leak memory
      const cache = new CacheManager({ maxSize: 100 });
      
      for (let cycle = 0; cycle < 10; cycle++) {
        // Add and remove cache entries
        for (let i = 0; i < 50; i++) {
          cache.set(`key_${cycle}_${i}`, {
            data: new Array(100).fill(`data_${i}`),
          });
        }
        
        // Clear cache periodically
        if (cycle % 3 === 0) {
          cache.clear();
        }
      }
      
      cache.destroy();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent cache operations efficiently', async () => {
      const cache = new CacheManager({ maxSize: 100 });
      
      const startTime = performance.now();
      
      // Simulate concurrent operations
      const operations = Array.from({ length: 20 }, (_, i) => {
        return Promise.resolve().then(async () => {
          // Mix of operations
          cache.set(`concurrent_${i}`, { data: i });
          cache.get(`concurrent_${i}`);
          
          if (i % 5 === 0) {
            cache.delete(`concurrent_${i - 1}`);
          }
          
          return i;
        });
      });
      
      const results = await Promise.all(operations);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(100);
      
      cache.destroy();
    });

    it('should handle concurrent pagination operations efficiently', async () => {
      const pagination = new PaginationHelper();
      
      const startTime = performance.now();
      
      // Simulate concurrent pagination requests
      const operations = Array.from({ length: 10 }, (_, i) => {
        return Promise.resolve().then(() => {
          const params = pagination.parseParams({
            page: i + 1,
            limit: 20,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          });
          
          const mockData = Array.from({ length: 20 }, (_, j) => ({
            id: `item_${i}_${j}`,
          }));
          
          return pagination.createResponse(mockData, 1000, params);
        });
      });
      
      const results = await Promise.all(operations);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.pagination.page).toBe(index + 1);
      });
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Database Index Performance Simulation', () => {
    it('should verify index-friendly query patterns', () => {
      const pagination = new PaginationHelper();
      
      // Test queries that would benefit from our database indexes
      const indexFriendlyQueries = [
        // Single field indexes
        { sortBy: 'createdAt', filters: {} },
        { sortBy: 'type', filters: { type: 'STOCK' } },
        { sortBy: 'symbol', filters: { symbol: 'AAPL' } },
        
        // Composite indexes
        { sortBy: 'createdAt', filters: { accountId: 'acc_1', type: 'STOCK' } },
        { sortBy: 'buyDate', filters: { goalId: 'goal_1', type: 'MUTUAL_FUND' } },
      ];
      
      const startTime = performance.now();
      
      indexFriendlyQueries.forEach(query => {
        const where = pagination.getPrismaWhere('', query.filters, ['name']);
        const orderBy = pagination.getPrismaOrderBy(query.sortBy, 'desc');
        
        expect(where).toBeDefined();
        expect(orderBy).toBeDefined();
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Query pattern generation should be very fast
      expect(duration).toBeLessThan(10);
    });
  });
});