'use client';

import { useState, useCallback } from 'react';
import { apiRequest, RetryOptions } from '../lib/network-utils';
import { useToast } from '../components/ui/Toast';
import useErrorHandler from './useErrorHandler';

interface UseApiCallOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  retryOptions?: RetryOptions;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UseApiCallReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (url: string, options?: RequestInit) => Promise<T | null>;
  reset: () => void;
}

export function useApiCall<T = any>(options: UseApiCallOptions = {}): UseApiCallReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { error, handleApiError, clearError } = useErrorHandler();

  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
    retryOptions,
    onSuccess,
    onError,
  } = options;

  const execute = useCallback(async (url: string, requestOptions: RequestInit = {}): Promise<T | null> => {
    setLoading(true);
    clearError();

    try {
      const result = await apiRequest<T>(url, {
        ...requestOptions,
        retryOptions,
      });

      setData(result);
      
      if (showSuccessToast) {
        addToast({
          type: 'success',
          message: successMessage,
        });
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      handleApiError(err);
      
      if (showErrorToast) {
        addToast({
          type: 'error',
          title: 'Request Failed',
          message: error || 'An unexpected error occurred',
          action: {
            label: 'Retry',
            onClick: () => execute(url, requestOptions),
          },
        });
      }

      if (onError) {
        onError(err);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [
    retryOptions,
    showSuccessToast,
    showErrorToast,
    successMessage,
    onSuccess,
    onError,
    addToast,
    handleApiError,
    clearError,
    error,
  ]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    clearError();
  }, [clearError]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

export default useApiCall;