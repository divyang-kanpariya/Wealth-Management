import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useApiCall from '../../hooks/useApiCall';
import { ToastProvider } from '../../components/ui/Toast';

// Mock the network utils
vi.mock('../../lib/network-utils', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '../../lib/network-utils';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('useApiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useApiCall(), { wrapper });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('handles successful API call', async () => {
    const mockData = { id: 1, name: 'Test' };
    (apiRequest as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useApiCall(), { wrapper });

    let response: any;
    await act(async () => {
      response = await result.current.execute('/api/test');
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(response).toEqual(mockData);
  });

  it('handles API call error', async () => {
    const mockError = new Error('API Error');
    (apiRequest as any).mockRejectedValue(mockError);

    const { result } = renderHook(() => useApiCall(), { wrapper });

    let response: any;
    await act(async () => {
      response = await result.current.execute('/api/test');
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('API Error');
    expect(response).toBeNull();
  });

  it('sets loading state during API call', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    (apiRequest as any).mockReturnValue(promise);

    const { result } = renderHook(() => useApiCall(), { wrapper });

    act(() => {
      result.current.execute('/api/test');
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise({ data: 'test' });
      await promise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('calls onSuccess callback on successful request', async () => {
    const mockData = { id: 1, name: 'Test' };
    const onSuccess = vi.fn();
    (apiRequest as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useApiCall({ onSuccess }), { wrapper });

    await act(async () => {
      await result.current.execute('/api/test');
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  it('calls onError callback on failed request', async () => {
    const mockError = new Error('API Error');
    const onError = vi.fn();
    (apiRequest as any).mockRejectedValue(mockError);

    const { result } = renderHook(() => useApiCall({ onError }), { wrapper });

    await act(async () => {
      await result.current.execute('/api/test');
    });

    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('passes request options to apiRequest', async () => {
    const mockData = { id: 1, name: 'Test' };
    (apiRequest as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useApiCall(), { wrapper });

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
    };

    await act(async () => {
      await result.current.execute('/api/test', requestOptions);
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/test', {
      ...requestOptions,
      retryOptions: undefined,
    });
  });

  it('passes retry options to apiRequest', async () => {
    const mockData = { id: 1, name: 'Test' };
    const retryOptions = { maxAttempts: 5 };
    (apiRequest as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useApiCall({ retryOptions }), { wrapper });

    await act(async () => {
      await result.current.execute('/api/test');
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/test', {
      retryOptions,
    });
  });

  it('resets state correctly', async () => {
    const mockData = { id: 1, name: 'Test' };
    (apiRequest as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useApiCall(), { wrapper });

    // Make a successful request
    await act(async () => {
      await result.current.execute('/api/test');
    });

    expect(result.current.data).toEqual(mockData);

    // Reset state
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('clears error on new request', async () => {
    // First request fails
    (apiRequest as any).mockRejectedValueOnce(new Error('First error'));
    
    const { result } = renderHook(() => useApiCall(), { wrapper });

    await act(async () => {
      await result.current.execute('/api/test');
    });

    expect(result.current.error).toBe('First error');

    // Second request succeeds
    const mockData = { id: 1, name: 'Test' };
    (apiRequest as any).mockResolvedValue(mockData);

    await act(async () => {
      await result.current.execute('/api/test');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockData);
  });

  it('handles multiple concurrent requests correctly', async () => {
    const mockData1 = { id: 1, name: 'Test1' };
    const mockData2 = { id: 2, name: 'Test2' };

    let resolveFirst: (value: any) => void;
    let resolveSecond: (value: any) => void;

    const firstPromise = new Promise(resolve => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise(resolve => {
      resolveSecond = resolve;
    });

    (apiRequest as any)
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    const { result } = renderHook(() => useApiCall(), { wrapper });

    // Start both requests
    act(() => {
      result.current.execute('/api/test1');
      result.current.execute('/api/test2');
    });

    expect(result.current.loading).toBe(true);

    // Resolve second request first
    await act(async () => {
      resolveSecond(mockData2);
      await secondPromise;
    });

    // Should have data from second request
    expect(result.current.data).toEqual(mockData2);

    // Resolve first request
    await act(async () => {
      resolveFirst(mockData1);
      await firstPromise;
    });

    // Should still have data from second request (last one wins)
    expect(result.current.data).toEqual(mockData2);
    expect(result.current.loading).toBe(false);
  });
});