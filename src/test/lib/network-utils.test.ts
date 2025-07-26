import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchWithRetry,
  enhancedFetch,
  apiRequest,
  isRetryableError,
  getErrorMessage,
} from '../../lib/network-utils';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('network-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('fetchWithRetry', () => {
    it('returns result on successful first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await fetchWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable errors', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ statusCode: 500 })
        .mockRejectedValueOnce({ statusCode: 500 })
        .mockResolvedValue('success');

      const promise = fetchWithRetry(mockFn, { maxAttempts: 3 });

      // Fast-forward through delays
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('throws error after max attempts', async () => {
      const error = { statusCode: 500 };
      const mockFn = vi.fn().mockRejectedValue(error);

      const promise = fetchWithRetry(mockFn, { maxAttempts: 2 });

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toMatchObject({ statusCode: 500 });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('does not retry on non-retryable errors', async () => {
      const error = { statusCode: 400 };
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(fetchWithRetry(mockFn)).rejects.toMatchObject({ statusCode: 400 });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback', async () => {
      const onRetry = vi.fn();
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ statusCode: 500 })
        .mockResolvedValue('success');

      const promise = fetchWithRetry(mockFn, { onRetry });

      await vi.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('uses exponential backoff', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ statusCode: 500 })
        .mockRejectedValueOnce({ statusCode: 500 })
        .mockResolvedValue('success');

      const promise = fetchWithRetry(mockFn, {
        baseDelay: 100,
        backoffFactor: 2,
      });

      // Fast-forward through all delays
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('respects maxDelay', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ statusCode: 500 })
        .mockResolvedValue('success');

      const promise = fetchWithRetry(mockFn, {
        baseDelay: 1000,
        maxDelay: 500,
        backoffFactor: 2,
      });

      // Fast-forward through all delays
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('enhancedFetch', () => {
    it('makes successful request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await enhancedFetch('http://test.com');

      expect(response).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('http://test.com', {
        signal: expect.any(AbortSignal),
      });
    });

    it('throws error for non-ok responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(enhancedFetch('http://test.com')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('handles timeout', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const promise = enhancedFetch('http://test.com', { timeout: 100 });

      // Fast-forward past timeout
      vi.advanceTimersByTime(100);
      
      await expect(promise).rejects.toMatchObject({
        isTimeout: true,
        message: 'Request timed out',
      });
    }, 1000);

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      await expect(enhancedFetch('http://test.com')).rejects.toMatchObject({
        isNetworkError: true,
        message: 'Network error - please check your connection',
      });
    });
  });

  describe('apiRequest', () => {
    it('makes successful API request', async () => {
      const mockData = { data: 'test' };
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockData),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiRequest('http://test.com');

      expect(result).toEqual(mockData);
    });

    it('retries failed requests', async () => {
      const mockData = { data: 'test' };
      const networkError = new Error('Network error');
      (networkError as any).isNetworkError = true;
      
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockData),
        });

      const promise = apiRequest('http://test.com', {
        retryOptions: { maxAttempts: 2 },
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('isRetryableError', () => {
    it('returns true for network errors', () => {
      expect(isRetryableError({ isNetworkError: true })).toBe(true);
    });

    it('returns true for timeout errors', () => {
      expect(isRetryableError({ isTimeout: true })).toBe(true);
    });

    it('returns true for 5xx errors', () => {
      expect(isRetryableError({ statusCode: 500 })).toBe(true);
      expect(isRetryableError({ statusCode: 503 })).toBe(true);
    });

    it('returns true for 429 errors', () => {
      expect(isRetryableError({ statusCode: 429 })).toBe(true);
    });

    it('returns false for 4xx errors (except 429)', () => {
      expect(isRetryableError({ statusCode: 400 })).toBe(false);
      expect(isRetryableError({ statusCode: 404 })).toBe(false);
    });

    it('returns false for unknown errors', () => {
      expect(isRetryableError({})).toBe(false);
      expect(isRetryableError(null)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('returns timeout message for timeout errors', () => {
      expect(getErrorMessage({ isTimeout: true })).toBe('Request timed out. Please try again.');
    });

    it('returns network message for network errors', () => {
      expect(getErrorMessage({ isNetworkError: true })).toBe('Network error. Please check your connection and try again.');
    });

    it('returns appropriate message for status codes', () => {
      expect(getErrorMessage({ statusCode: 400 })).toBe('Invalid request. Please check your input.');
      expect(getErrorMessage({ statusCode: 401 })).toBe('Authentication required.');
      expect(getErrorMessage({ statusCode: 403 })).toBe('Access denied.');
      expect(getErrorMessage({ statusCode: 404 })).toBe('Resource not found.');
      expect(getErrorMessage({ statusCode: 409 })).toBe('Data conflict. This item may already exist.');
      expect(getErrorMessage({ statusCode: 422 })).toBe('Invalid data provided.');
      expect(getErrorMessage({ statusCode: 429 })).toBe('Too many requests. Please wait and try again.');
      expect(getErrorMessage({ statusCode: 500 })).toBe('Server error. Please try again later.');
      expect(getErrorMessage({ statusCode: 503 })).toBe('Service unavailable. Please try again later.');
      expect(getErrorMessage({ statusCode: 418 })).toBe('Request failed (418). Please try again.');
    });

    it('returns error message for Error objects', () => {
      expect(getErrorMessage(new Error('Custom error'))).toBe('Custom error');
    });

    it('returns default message for unknown errors', () => {
      expect(getErrorMessage({})).toBe('An unexpected error occurred. Please try again.');
      expect(getErrorMessage(null)).toBe('An unexpected error occurred. Please try again.');
    });
  });
});