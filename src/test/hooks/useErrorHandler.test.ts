import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import useErrorHandler from '../../hooks/useErrorHandler';

describe('useErrorHandler', () => {
  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.details).toBeNull();
  });

  it('handles Error objects', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error message');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.error).toBe('Test error message');
    expect(result.current.isError).toBe(true);
  });

  it('handles string errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError('String error message');
    });

    expect(result.current.error).toBe('String error message');
    expect(result.current.isError).toBe(true);
  });

  it('handles API error objects', () => {
    const { result } = renderHook(() => useErrorHandler());
    const apiError = {
      message: 'API error message',
      details: { field: 'validation error' },
    };

    act(() => {
      result.current.handleError(apiError);
    });

    expect(result.current.error).toBe('API error message');
    expect(result.current.isError).toBe(true);
    expect(result.current.details).toEqual({ field: 'validation error' });
  });

  it('handles unknown error types', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError({ unknown: 'error' });
    });

    expect(result.current.error).toBe('An unexpected error occurred');
    expect(result.current.isError).toBe(true);
  });

  it('clears error state', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError('Test error');
    });

    expect(result.current.isError).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.details).toBeNull();
  });

  describe('handleApiError', () => {
    it('handles network errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const networkError = new TypeError('fetch failed');

      act(() => {
        result.current.handleApiError(networkError);
      });

      expect(result.current.error).toBe('Network error. Please check your connection and try again.');
    });

    it('handles 400 status code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 400 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('Invalid request. Please check your input and try again.');
    });

    it('handles 401 status code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 401 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('Authentication required. Please log in and try again.');
    });

    it('handles 403 status code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 403 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('You do not have permission to perform this action.');
    });

    it('handles 404 status code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 404 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('The requested resource was not found.');
    });

    it('handles 409 status code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 409 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('This data already exists or conflicts with existing data.');
    });

    it('handles 422 status code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 422 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('The provided data is invalid. Please check your input.');
    });

    it('handles 429 status code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 429 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('Too many requests. Please wait a moment and try again.');
    });

    it('handles 500 status code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 500 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('Server error. Please try again later.');
    });

    it('handles 503 status code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 503 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('Service temporarily unavailable. Please try again later.');
    });

    it('handles unknown status codes', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = { status: 418 };

      act(() => {
        result.current.handleApiError(error);
      });

      expect(result.current.error).toBe('Request failed with status 418. Please try again.');
    });
  });
});