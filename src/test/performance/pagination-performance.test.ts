import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { investmentPagination, goalPagination, accountPagination } from '../../lib/pagination';

// Mock Prisma for performance testing
const mockPrisma = {
  investment: {
    findMany: async (options: any) => {
      // Simulate database query time based on complexity
      const baseTime = 10; // Base query time in ms
      const complexityMultiplier = options.include ? 2 : 1;
      const sortComplexity = options.orderBy && typeof options.orderBy === 'object' ? 1.5 : 1;
      
      const simulatedTime = baseTime * complexityMultiplier * sortComplexity;
      await new Promise(resolve => setTimeout(resolve, simulatedTime));
      
      // Generate mock data
      const totalItems = 1000;
      const skip = options.skip || 0;
      const take = options.take || totalItems;
      
      return Array.from({ length: Math.min(take, totalItems - skip) }, (_, i) => ({
        id: `inv_${skip + i}`,
        name: `Investment ${skip + i}`,
        type: 'STOCK',
        buyPrice: Math.random() * 1000,
        units: Math.random() * 100,
        buyDate: new Date(),
        createdAt: new Date(),
        account: { id: 'acc_1', name: 'Account 1' },
        goal: { id: 'goal_1', name: 'Goal 1' },
      }));
    },
    count: async () => {
      await new Promise(resolve => setTimeout(resolve, 5)); // Simulate count query
      return 1000;
    },
  },
} as any;

describe('Pagination Performance Tests', () => {
  describe('Investment Pagination Performance', () => {
    it('should handle large dataset pagination efficiently', async () => {
      const startTime = performance.now();
      
      const params = investmentPagination.parseParams({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Simulate database queries
      const [data, total] = await Promise.all([
        mockPrisma.investment.findMany({
          skip: params.skip,
          take: params.limit,
          orderBy: investmentPagination.getPrismaOrderBy(params.sortBy, params.sortOrder),
          include: { account: true, goal: true },
        }),
        mockPrisma.investment.count(),
      ]);

      const response = investmentPagination.createResponse(data, total, params);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.data).toHaveLength(20);
      expect(response.pagination.total).toBe(1000);
      expect(response.pagination.totalPages).toBe(50);
      
      // Should complete pagination query in reasonable time
      expect(duration).toBeLessThan(100);
    });

    it('should handle complex sorting efficiently', async () => {
      const startTime = performance.now();
      
      // Test various sort fields
      const sortFields = ['name', 'buyDate', 'createdAt', 'account.name', 'goal.name'];
      
      for (const sortBy of sortFields) {
        const params = investmentPagination.parseParams({
          page: 1,
          limit: 20,
          sortBy,
          sortOrder: 'desc',
        });

        const validSortBy = investmentPagination.validateSortField(sortBy);
        const orderBy = investmentPagination.getPrismaOrderBy(validSortBy, params.sortOrder);
        
        // Verify orderBy structure is correct
        expect(orderBy).toBeDefined();
        expect(typeof orderBy).toBe('object');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Sort field validation should be very fast
      expect(duration).toBeLessThan(10);
    });

    it('should handle search and filtering efficiently', async () => {
      const startTime = performance.now();
      
      const searchTerm = 'test investment';
      const filters = {
        type: 'STOCK',
        accountId: 'acc_1',
        buyDate: {
          from: new Date('2023-01-01'),
          to: new Date('2023-12-31'),
        },
      };

      const where = investmentPagination.getInvestmentWhere(searchTerm, filters);
      
      // Verify where clause structure
      expect(where.OR).toBeDefined(); // Search conditions
      expect(where.type).toBe('STOCK');
      expect(where.accountId).toBe('acc_1');
      expect(where.buyDate.gte).toBeInstanceOf(Date);
      expect(where.buyDate.lte).toBeInstanceOf(Date);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Where clause generation should be very fast
      expect(duration).toBeLessThan(5);
    });

    it('should handle pagination with large page numbers efficiently', async () => {
      const startTime = performance.now();
      
      // Test pagination at different page positions
      const pageTests = [1, 10, 25, 50]; // Last page for 1000 items with 20 per page
      
      for (const page of pageTests) {
        const params = investmentPagination.parseParams({
          page,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        expect(params.skip).toBe((page - 1) * 20);
        expect(params.limit).toBe(20);
        
        // Simulate query
        const data = await mockPrisma.investment.findMany({
          skip: params.skip,
          take: params.limit,
        });

        expect(data.length).toBeGreaterThan(0);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle various page positions efficiently
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Goal Pagination Performance', () => {
    it('should handle goal pagination with different sort orders', () => {
      const startTime = performance.now();
      
      const params = goalPagination.parseParams({
        page: 1,
        limit: 10,
        sortBy: 'targetDate',
        sortOrder: 'asc',
      });

      const orderBy = goalPagination.getPrismaOrderBy(params.sortBy, params.sortOrder);
      const where = goalPagination.getGoalWhere('retirement', { priority: 1 });

      expect(orderBy.targetDate).toBe('asc');
      expect(where.OR).toBeDefined(); // Search conditions
      expect(where.priority).toBe(1);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5);
    });
  });

  describe('Account Pagination Performance', () => {
    it('should handle account pagination efficiently', () => {
      const startTime = performance.now();
      
      const params = accountPagination.parseParams({
        page: 1,
        limit: 15,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      const orderBy = accountPagination.getPrismaOrderBy(params.sortBy, params.sortOrder);
      const where = accountPagination.getAccountWhere('broker', { type: 'BROKER' });

      expect(orderBy.name).toBe('asc');
      expect(where.OR).toBeDefined();
      expect(where.type).toBe('BROKER');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5);
    });
  });

  describe('Pagination Parameter Parsing Performance', () => {
    it('should parse URL search params efficiently', () => {
      const startTime = performance.now();
      
      // Create complex search params
      const searchParams = new URLSearchParams();
      searchParams.set('page', '5');
      searchParams.set('limit', '25');
      searchParams.set('sortBy', 'createdAt');
      searchParams.set('sortOrder', 'desc');
      searchParams.set('search', 'test investment');
      searchParams.set('filter_type', 'STOCK');
      searchParams.set('filter_accountId', 'acc_123');
      searchParams.set('filter_dateRange', JSON.stringify({
        from: '2023-01-01',
        to: '2023-12-31',
      }));

      // Parse params multiple times to test performance
      for (let i = 0; i < 100; i++) {
        const params = investmentPagination.parseParams({
          page: parseInt(searchParams.get('page') || '1'),
          limit: parseInt(searchParams.get('limit') || '20'),
          sortBy: searchParams.get('sortBy') || 'createdAt',
          sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
          search: searchParams.get('search') || '',
          filters: {
            type: searchParams.get('filter_type'),
            accountId: searchParams.get('filter_accountId'),
            dateRange: JSON.parse(searchParams.get('filter_dateRange') || '{}'),
          },
        });

        expect(params.page).toBe(5);
        expect(params.limit).toBe(25);
        expect(params.skip).toBe(100);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Parameter parsing should be very fast even with complex params
      expect(duration).toBeLessThan(20);
    });

    it('should validate and sanitize parameters efficiently', () => {
      const startTime = performance.now();
      
      // Test with various invalid inputs
      const testCases = [
        { page: -1, limit: 0, sortBy: 'invalid_field' },
        { page: 'invalid', limit: 'invalid', sortBy: null },
        { page: 999999, limit: 999999, sortBy: 'malicious_field' },
        { page: 1.5, limit: 2.7, sortBy: 'account.invalid' },
      ];

      for (const testCase of testCases) {
        const params = investmentPagination.parseParams(testCase as any);
        
        // Should sanitize invalid values
        expect(params.page).toBeGreaterThanOrEqual(1);
        expect(params.limit).toBeGreaterThanOrEqual(1);
        expect(params.limit).toBeLessThanOrEqual(100); // Max limit
        
        const validSortBy = investmentPagination.validateSortField(params.sortBy);
        expect(investmentPagination.getValidSortFields()).toContain(validSortBy);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Parameter validation should be fast
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Memory Usage in Pagination', () => {
    it('should not cause memory leaks with repeated pagination operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many pagination operations
      for (let i = 0; i < 50; i++) {
        const params = investmentPagination.parseParams({
          page: (i % 10) + 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: i % 2 === 0 ? 'asc' : 'desc',
          search: i % 5 === 0 ? 'test' : '',
          filters: i % 3 === 0 ? { type: 'STOCK' } : {},
        });

        const where = investmentPagination.getInvestmentWhere(params.search, params.filters);
        const orderBy = investmentPagination.getPrismaOrderBy(params.sortBy, params.sortOrder);
        
        // Simulate creating response objects
        const mockData = Array.from({ length: params.limit }, (_, j) => ({
          id: `inv_${i}_${j}`,
          name: `Investment ${i}_${j}`,
        }));
        
        const response = investmentPagination.createResponse(mockData, 1000, params);
        
        // Verify response structure
        expect(response.data).toHaveLength(params.limit);
        expect(response.pagination.page).toBe(params.page);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Concurrent Pagination Performance', () => {
    it('should handle concurrent pagination requests efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate concurrent pagination requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => {
        return new Promise(async (resolve) => {
          const params = investmentPagination.parseParams({
            page: i + 1,
            limit: 20,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          });

          // Simulate database operations
          const [data, total] = await Promise.all([
            mockPrisma.investment.findMany({
              skip: params.skip,
              take: params.limit,
            }),
            mockPrisma.investment.count(),
          ]);

          const response = investmentPagination.createResponse(data, total, params);
          resolve(response);
        });
      });

      const results = await Promise.all(concurrentRequests);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      results.forEach((result: any, index) => {
        expect(result.pagination.page).toBe(index + 1);
        expect(result.data.length).toBeGreaterThan(0);
      });

      // Concurrent requests should complete efficiently
      // Should be faster than sequential requests due to parallelization
      expect(duration).toBeLessThan(300);
    });
  });
});