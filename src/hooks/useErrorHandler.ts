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
    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      handleError('Network error. Please check your connection and try again.');
      return;
    }

    // Handle API response errors
    if (error && typeof error === 'object' && 'status' in error) {
      const statusCode = (error as any).status;
      
      switch (statusCode) {
        case 400:
          handleError('Invalid request. Please check your input and try again.');
          break;
        case 401:
          handleError('Authentication required. Please log in and try again.');
          break;
        case 403:
          handleError('You do not have permission to perform this action.');
          break;
        case 404:
          handleError('The requested resource was not found.');
          break;
        case 409:
          handleError('This data already exists or conflicts with existing data.');
          break;
        case 422:
          handleError('The provided data is invalid. Please check your input.');
          break;
        case 429:
          handleError('Too many requests. Please wait a moment and try again.');
          break;
        case 500:
          handleError('Server error. Please try again later.');
          break;
        case 503:
          handleError('Service temporarily unavailable. Please try again later.');
          break;
        default:
          handleError(`Request failed with status ${statusCode}. Please try again.`);
      }
      return;
    }

    // Default error handling
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