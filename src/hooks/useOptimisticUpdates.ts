'use client';

import { useState, useCallback, useRef } from 'react';
import { useToast } from '../components/ui/Toast';

export interface OptimisticUpdate<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: T;
  originalData?: T;
  timestamp: number;
}

export interface UseOptimisticUpdatesOptions<T> {
  onSuccess?: (data: T, update: OptimisticUpdate<T>) => void;
  onError?: (error: any, update: OptimisticUpdate<T>) => void;
  showToasts?: boolean;
}

export function useOptimisticUpdates<T extends { id?: string }>(
  initialData: T[] = [],
  options: UseOptimisticUpdatesOptions<T> = {}
) {
  const [data, setData] = useState<T[]>(initialData);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map());
  const updateCounter = useRef(0);
  const { addToast } = useToast();
  const { onSuccess, onError, showToasts = true } = options;

  // Generate unique update ID
  const generateUpdateId = useCallback(() => {
    return `update_${Date.now()}_${++updateCounter.current}`;
  }, []);

  // Apply optimistic create
  const optimisticCreate = useCallback(async (
    newItem: Omit<T, 'id'>,
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    const updateId = generateUpdateId();
    const tempId = `temp_${updateId}`;
    const optimisticItem = { ...newItem, id: tempId } as T;

    const update: OptimisticUpdate<T> = {
      id: updateId,
      type: 'create',
      data: optimisticItem,
      timestamp: Date.now(),
    };

    // Apply optimistic update
    setData(prev => [optimisticItem, ...prev]);
    setPendingUpdates(prev => new Map(prev).set(updateId, update));

    try {
      const result = await apiCall();
      
      // Replace optimistic item with real data
      setData(prev => prev.map(item => 
        item.id === tempId ? result : item
      ));
      
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });

      if (showToasts) {
        addToast({
          type: 'success',
          message: 'Item created successfully',
        });
      }

      if (onSuccess) {
        onSuccess(result, update);
      }

      return result;
    } catch (error) {
      // Revert optimistic update
      setData(prev => prev.filter(item => item.id !== tempId));
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });

      if (showToasts) {
        addToast({
          type: 'error',
          title: 'Create Failed',
          message: 'Failed to create item. Please try again.',
        });
      }

      if (onError) {
        onError(error, update);
      }

      return null;
    }
  }, [generateUpdateId, showToasts, addToast, onSuccess, onError]);

  // Apply optimistic update
  const optimisticUpdate = useCallback(async (
    itemId: string,
    updates: Partial<T>,
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    const updateId = generateUpdateId();
    
    // Find original item
    const originalItem = data.find(item => item.id === itemId);
    if (!originalItem) {
      throw new Error('Item not found for update');
    }

    const optimisticItem = { ...originalItem, ...updates };

    const update: OptimisticUpdate<T> = {
      id: updateId,
      type: 'update',
      data: optimisticItem,
      originalData: originalItem,
      timestamp: Date.now(),
    };

    // Apply optimistic update
    setData(prev => prev.map(item => 
      item.id === itemId ? optimisticItem : item
    ));
    setPendingUpdates(prev => new Map(prev).set(updateId, update));

    try {
      const result = await apiCall();
      
      // Replace optimistic item with real data
      setData(prev => prev.map(item => 
        item.id === itemId ? result : item
      ));
      
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });

      if (showToasts) {
        addToast({
          type: 'success',
          message: 'Item updated successfully',
        });
      }

      if (onSuccess) {
        onSuccess(result, update);
      }

      return result;
    } catch (error) {
      // Revert optimistic update
      setData(prev => prev.map(item => 
        item.id === itemId ? originalItem : item
      ));
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });

      if (showToasts) {
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update item. Please try again.',
        });
      }

      if (onError) {
        onError(error, update);
      }

      return null;
    }
  }, [data, generateUpdateId, showToasts, addToast, onSuccess, onError]);

  // Apply optimistic delete
  const optimisticDelete = useCallback(async (
    itemId: string,
    apiCall: () => Promise<void>
  ): Promise<boolean> => {
    const updateId = generateUpdateId();
    
    // Find original item
    const originalItem = data.find(item => item.id === itemId);
    if (!originalItem) {
      throw new Error('Item not found for deletion');
    }

    const update: OptimisticUpdate<T> = {
      id: updateId,
      type: 'delete',
      data: originalItem,
      originalData: originalItem,
      timestamp: Date.now(),
    };

    // Apply optimistic delete
    setData(prev => prev.filter(item => item.id !== itemId));
    setPendingUpdates(prev => new Map(prev).set(updateId, update));

    try {
      await apiCall();
      
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });

      if (showToasts) {
        addToast({
          type: 'success',
          message: 'Item deleted successfully',
        });
      }

      if (onSuccess) {
        onSuccess(originalItem, update);
      }

      return true;
    } catch (error) {
      // Revert optimistic delete
      setData(prev => {
        // Find the correct position to insert the item back
        const index = initialData.findIndex(item => item.id === itemId);
        if (index >= 0) {
          const newData = [...prev];
          newData.splice(index, 0, originalItem);
          return newData;
        }
        return [originalItem, ...prev];
      });
      
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });

      if (showToasts) {
        addToast({
          type: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete item. Please try again.',
        });
      }

      if (onError) {
        onError(error, update);
      }

      return false;
    }
  }, [data, initialData, generateUpdateId, showToasts, addToast, onSuccess, onError]);

  // Refresh data from server
  const refreshData = useCallback(async (fetchData: () => Promise<T[]>) => {
    try {
      const freshData = await fetchData();
      setData(freshData);
      setPendingUpdates(new Map()); // Clear pending updates
      return freshData;
    } catch (error) {
      console.error('Failed to refresh data:', error);
      throw error;
    }
  }, []);

  // Check if an item has pending updates
  const hasPendingUpdate = useCallback((itemId: string) => {
    return Array.from(pendingUpdates.values()).some(update => 
      update.data.id === itemId || update.originalData?.id === itemId
    );
  }, [pendingUpdates]);

  // Get pending update for an item
  const getPendingUpdate = useCallback((itemId: string) => {
    return Array.from(pendingUpdates.values()).find(update => 
      update.data.id === itemId || update.originalData?.id === itemId
    );
  }, [pendingUpdates]);

  return {
    data,
    pendingUpdates: Array.from(pendingUpdates.values()),
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    refreshData,
    hasPendingUpdate,
    getPendingUpdate,
    setData, // For manual data updates
  };
}

export default useOptimisticUpdates;