'use client';

import { useState, useCallback } from 'react';

export interface ApiError {
  message: string;
  details?: any;
  statusCode?: number;
  code?: string;
}

export interface ErrorState {
  error: string | null;
  isError: boolean;
  details?: any;
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    details: null,
  });

  const handleError = useCallback((error: unknown) => {
    let errorMessage = 'An unexpected error occurred';
    let details = null;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      const apiError = error as any;
      if (apiError.message) {
        errorMessage = apiError.message;
      }
      if (apiError.details) {
        details = apiError.details;
      }
    }

    setErrorState({
      error: errorMessage,
      isError: true,
      details,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      details: null,
    });
  }, []);

  const handleApiError = useCallback((error: unknown) => {
    // Simplified error handling for server actions and form submissions
    handleError(error);
  }, [handleError]);

  return {
    error: errorState.error,
    isError: errorState.isError,
    details: errorState.details,
    handleError,
    handleApiError,
    clearError,
  };
}

export default useErrorHandler;