import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticUpdates } from '../../hooks/useOptimisticUpdates';

// Mock the Toast component
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

interface TestItem {
  id: string;
  name: string;
  value: number;
}

describe('Optimistic Updates Performance Tests', () => {
  let mockApiCall: ReturnType<typeof vi.fn>;
  let initialData: TestItem[];

  beforeEach(() => {
    mockApiCall = vi.fn();
    initialData = Array.from({ length: 100 }, (_, i) => ({
      id: `item_${i}`,
      name: `Item ${i}`,
      value: Math.random() * 1000,
    }));
  });

  describe('Optimistic Create Performance', () => {
    it('should handle rapid optimistic creates efficiently', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(initialData, { showToasts: false })
      );

      // Mock successful API calls
      mockApiCall.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate API delay
        return {
          id: `new_${Date.now()}_${Math.random()}`,
          name: 'New Item',
          value: 500,
        };
      });

      const startTime = performance.now();

      // Perform multiple optimistic creates
      const createPromises = Array.from({ length: 10 }, (_, i) =>
        act(async () => {
          await result.current.optimisticCreate(
            { name: `New Item ${i}`, value: i * 100 },
            mockApiCall
          );
        })
      );

      await Promise.all(createPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle multiple creates efficiently
      expect(duration).toBeLessThan(200);
      expect(result.current.data.length).toBe(initialData.length + 10);
      expect(mockApiCall).toHaveBeenCalledTimes(10);
    });

    it('should handle optimistic create failures efficiently', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(initialData, { showToasts: false })
      );

      // Mock API failures
      mockApiCall.mockRejectedValue(new Error('API Error'));

      const startTime = performance.now();

      // Perform optimistic creates that will fail
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        act(async () => {
          await result.current.optimisticCreate(
            { name: `Failed Item ${i}`, value: i * 100 },
            mockApiCall
          );
        })
      );

      await Promise.all(createPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle failures efficiently and revert optimistic updates
      expect(duration).toBeLessThan(100);
      expect(result.current.data.length).toBe(initialData.length); // Should revert
      expect(result.current.pendingUpdates.length).toBe(0);
    });
  });

  describe('Optimistic Update Performance', () => {
    it('should handle rapid optimistic updates efficiently', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(initialData, { showToasts: false })
      );

      // Mock successful API calls
      mockApiCall.mockImplementation(async (updates: Partial<TestItem>) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return { ...initialData[0], ...updates };
      });

      const startTime = performance.now();

      // Perform multiple optimistic updates on the same item
      const updatePromises = Array.from({ length: 10 }, (_, i) =>
        act(async () => {
          await result.current.optimisticUpdate(
            'item_0',
            { value: i * 100 },
            () => mockApiCall({ value: i * 100 })
          );
        })
      );

      await Promise.all(updatePromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle multiple updates efficiently
      expect(duration).toBeLessThan(150);
      expect(mockApiCall).toHaveBeenCalledTimes(10);
    });

    it('should handle updates on large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item_${i}`,
        name: `Item ${i}`,
        value: Math.random() * 1000,
      }));

      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(largeDataset, { showToasts: false })
      );

      mockApiCall.mockResolvedValue({
        id: 'item_500',
        name: 'Updated Item 500',
        value: 999,
      });

      const startTime = performance.now();

      await act(async () => {
        await result.current.optimisticUpdate(
          'item_500',
          { name: 'Updated Item 500', value: 999 },
          mockApiCall
        );
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle updates on large datasets efficiently
      expect(duration).toBeLessThan(50);
      expect(result.current.data.length).toBe(1000);
      
      const updatedItem = result.current.data.find(item => item.id === 'item_500');
      expect(updatedItem?.name).toBe('Updated Item 500');
    });
  });

  describe('Optimistic Delete Performance', () => {
    it('should handle rapid optimistic deletes efficiently', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(initialData, { showToasts: false })
      );

      // Mock successful API calls
      mockApiCall.mockResolvedValue(undefined);

      const startTime = performance.now();

      // Perform multiple optimistic deletes
      const deletePromises = Array.from({ length: 10 }, (_, i) =>
        act(async () => {
          await result.current.optimisticDelete(`item_${i}`, mockApiCall);
        })
      );

      await Promise.all(deletePromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle multiple deletes efficiently
      expect(duration).toBeLessThan(100);
      expect(result.current.data.length).toBe(initialData.length - 10);
      expect(mockApiCall).toHaveBeenCalledTimes(10);
    });

    it('should handle delete failures and reversions efficiently', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(initialData, { showToasts: false })
      );

      // Mock API failures
      mockApiCall.mockRejectedValue(new Error('Delete failed'));

      const startTime = performance.now();

      // Perform optimistic deletes that will fail
      const deletePromises = Array.from({ length: 5 }, (_, i) =>
        act(async () => {
          await result.current.optimisticDelete(`item_${i}`, mockApiCall);
        })
      );

      await Promise.all(deletePromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle failures and reversions efficiently
      expect(duration).toBeLessThan(100);
      expect(result.current.data.length).toBe(initialData.length); // Should revert
      expect(result.current.pendingUpdates.length).toBe(0);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle mixed concurrent operations efficiently', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(initialData, { showToasts: false })
      );

      // Mock API calls with different delays
      const mockCreate = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
        return { id: `new_${Date.now()}`, name: 'New Item', value: 500 };
      });

      const mockUpdate = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 15));
        return { id: 'item_0', name: 'Updated Item', value: 999 };
      });

      const mockDelete = vi.fn().mockResolvedValue(undefined);

      const startTime = performance.now();

      // Perform mixed operations concurrently
      await Promise.all([
        // Creates
        act(async () => {
          await result.current.optimisticCreate({ name: 'New 1', value: 100 }, mockCreate);
        }),
        act(async () => {
          await result.current.optimisticCreate({ name: 'New 2', value: 200 }, mockCreate);
        }),
        
        // Updates
        act(async () => {
          await result.current.optimisticUpdate('item_1', { value: 999 }, mockUpdate);
        }),
        act(async () => {
          await result.current.optimisticUpdate('item_2', { value: 888 }, mockUpdate);
        }),
        
        // Deletes
        act(async () => {
          await result.current.optimisticDelete('item_3', mockDelete);
        }),
        act(async () => {
          await result.current.optimisticDelete('item_4', mockDelete);
        }),
      ]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle mixed concurrent operations efficiently
      expect(duration).toBeLessThan(200);
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockDelete).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks with frequent operations', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>([], { showToasts: false })
      );

      mockApiCall.mockResolvedValue({ id: 'test', name: 'Test', value: 100 });

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 50; i++) {
        await act(async () => {
          await result.current.optimisticCreate(
            { name: `Item ${i}`, value: i },
            mockApiCall
          );
        });

        // Occasionally refresh to clear state
        if (i % 10 === 0) {
          await act(async () => {
            await result.current.refreshData(async () => []);
          });
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });
  });

  describe('State Management Performance', () => {
    it('should handle pending updates tracking efficiently', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(initialData, { showToasts: false })
      );

      // Mock slow API calls to create pending states
      mockApiCall.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { id: 'new_item', name: 'New Item', value: 500 };
      });

      const startTime = performance.now();

      // Start multiple operations without waiting
      const operations = Array.from({ length: 10 }, (_, i) =>
        result.current.optimisticCreate(
          { name: `Item ${i}`, value: i },
          mockApiCall
        )
      );

      // Check pending updates while operations are in progress
      for (let i = 0; i < 5; i++) {
        const hasPending = result.current.hasPendingUpdate('temp_update_1');
        const pendingUpdate = result.current.getPendingUpdate('temp_update_1');
        
        // These operations should be fast even with many pending updates
        expect(typeof hasPending).toBe('boolean');
      }

      await Promise.all(operations);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle pending state tracking efficiently
      expect(duration).toBeLessThan(300);
      expect(result.current.pendingUpdates.length).toBe(0); // All should be resolved
    });

    it('should handle data refresh efficiently', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(initialData, { showToasts: false })
      );

      const mockFetchData = vi.fn().mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => ({
          id: `fresh_${i}`,
          name: `Fresh Item ${i}`,
          value: i * 10,
        }))
      );

      const startTime = performance.now();

      await act(async () => {
        await result.current.refreshData(mockFetchData);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Data refresh should be efficient
      expect(duration).toBeLessThan(50);
      expect(result.current.data.length).toBe(50);
      expect(result.current.data[0].id).toBe('fresh_0');
      expect(result.current.pendingUpdates.length).toBe(0);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle error scenarios efficiently', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates<TestItem>(initialData, { showToasts: false })
      );

      // Mock various error scenarios
      const errorScenarios = [
        () => Promise.reject(new Error('Network error')),
        () => Promise.reject(new Error('Validation error')),
        () => Promise.reject(new Error('Server error')),
        () => Promise.reject(new Error('Timeout error')),
      ];

      const startTime = performance.now();

      // Test error handling for different operation types
      for (const errorFn of errorScenarios) {
        await act(async () => {
          await result.current.optimisticCreate({ name: 'Test', value: 100 }, errorFn);
        });

        await act(async () => {
          await result.current.optimisticUpdate('item_0', { value: 999 }, errorFn);
        });

        await act(async () => {
          await result.current.optimisticDelete('item_1', errorFn);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Error handling should be efficient
      expect(duration).toBeLessThan(100);
      expect(result.current.data.length).toBe(initialData.length); // Should revert all changes
      expect(result.current.pendingUpdates.length).toBe(0);
    });
  });
});