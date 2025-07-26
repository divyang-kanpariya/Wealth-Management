'use client';

import { useState, useCallback, useEffect } from 'react';
import { PaginationParams, PaginatedResponse } from '@/lib/pagination';
import { useApiCall } from './useApiCall';

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
  initialSearch?: string;
  initialFilters?: Record<string, any>;
  autoFetch?: boolean;
}

export interface UsePaginationReturn<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  loading: boolean;
  error: string | null;
  params: PaginationParams;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
  setSearch: (search: string) => void;
  setFilters: (filters: Record<string, any>) => void;
  updateFilter: (key: string, value: any) => void;
  removeFilter: (key: string) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  reset: () => void;
}

export function usePagination<T = any>(
  endpoint: string,
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const {
    initialPage = 1,
    initialLimit = 20,
    initialSortBy = 'createdAt',
    initialSortOrder = 'desc',
    initialSearch = '',
    initialFilters = {},
    autoFetch = true,
  } = options;

  const [params, setParams] = useState<PaginationParams>({
    page: initialPage,
    limit: initialLimit,
    sortBy: initialSortBy,
    sortOrder: initialSortOrder,
    search: initialSearch,
    filters: initialFilters,
  });

  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);

  const { loading, error, execute } = useApiCall<PaginatedResponse<T>>({
    showErrorToast: true,
    onSuccess: (response) => {
      setData(response.data);
      setPagination(response.pagination);
    },
  });

  // Build URL with search params
  const buildUrl = useCallback((currentParams: PaginationParams) => {
    const url = new URL(endpoint, window.location.origin);
    
    if (currentParams.page) url.searchParams.set('page', currentParams.page.toString());
    if (currentParams.limit) url.searchParams.set('limit', currentParams.limit.toString());
    if (currentParams.sortBy) url.searchParams.set('sortBy', currentParams.sortBy);
    if (currentParams.sortOrder) url.searchParams.set('sortOrder', currentParams.sortOrder);
    if (currentParams.search) url.searchParams.set('search', currentParams.search);
    
    if (currentParams.filters) {
      Object.entries(currentParams.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const filterKey = `filter_${key}`;
          if (typeof value === 'object') {
            url.searchParams.set(filterKey, JSON.stringify(value));
          } else {
            url.searchParams.set(filterKey, value.toString());
          }
        }
      });
    }

    return url.toString();
  }, [endpoint]);

  // Fetch data
  const fetchData = useCallback(async (currentParams: PaginationParams) => {
    const url = buildUrl(currentParams);
    await execute(url);
  }, [buildUrl, execute]);

  // Auto-fetch when params change
  useEffect(() => {
    if (autoFetch) {
      fetchData(params);
    }
  }, [params, fetchData, autoFetch]);

  // Pagination controls
  const setPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setParams(prev => ({ ...prev, limit, page: 1 })); // Reset to first page when changing limit
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
    setParams(prev => ({ ...prev, sortBy, sortOrder, page: 1 })); // Reset to first page when sorting
  }, []);

  const setSearch = useCallback((search: string) => {
    setParams(prev => ({ ...prev, search, page: 1 })); // Reset to first page when searching
  }, []);

  const setFilters = useCallback((filters: Record<string, any>) => {
    setParams(prev => ({ ...prev, filters, page: 1 })); // Reset to first page when filtering
  }, []);

  const updateFilter = useCallback((key: string, value: any) => {
    setParams(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      page: 1,
    }));
  }, []);

  const removeFilter = useCallback((key: string) => {
    setParams(prev => {
      const newFilters = { ...prev.filters };
      delete newFilters[key];
      return { ...prev, filters: newFilters, page: 1 };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setParams(prev => ({ ...prev, filters: {}, page: 1 }));
  }, []);

  const refresh = useCallback(async () => {
    await fetchData(params);
  }, [fetchData, params]);

  const goToFirstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const goToLastPage = useCallback(() => {
    if (pagination?.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [pagination?.totalPages, setPage]);

  const goToNextPage = useCallback(() => {
    if (pagination?.hasNext) {
      setPage(params.page! + 1);
    }
  }, [pagination?.hasNext, params.page, setPage]);

  const goToPrevPage = useCallback(() => {
    if (pagination?.hasPrev) {
      setPage(params.page! - 1);
    }
  }, [pagination?.hasPrev, params.page, setPage]);

  const reset = useCallback(() => {
    setParams({
      page: initialPage,
      limit: initialLimit,
      sortBy: initialSortBy,
      sortOrder: initialSortOrder,
      search: initialSearch,
      filters: initialFilters,
    });
    setData([]);
    setPagination(null);
  }, [initialPage, initialLimit, initialSortBy, initialSortOrder, initialSearch, initialFilters]);

  return {
    data,
    pagination,
    loading,
    error,
    params,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setFilters,
    updateFilter,
    removeFilter,
    clearFilters,
    refresh,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPrevPage,
    reset,
  };
}

export default usePagination;