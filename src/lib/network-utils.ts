export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface NetworkError extends Error {
  statusCode?: number;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error?.isNetworkError || error?.isTimeout) return true;
    if (error?.statusCode >= 500) return true;
    if (error?.statusCode === 429) return true; // Rate limiting
    return false;
  },
  onRetry: () => {},
};

/**
 * Enhanced fetch with retry logic and better error handling
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: NetworkError | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = createNetworkError(error);
      
      // Don't retry if this is the last attempt or if retry condition is not met
      if (attempt === config.maxAttempts || !config.retryCondition(lastError)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );

      config.onRetry(attempt, lastError);
      
      console.warn(`Request attempt ${attempt}/${config.maxAttempts} failed:`, lastError.message);
      console.warn(`Retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Enhanced fetch wrapper with timeout and better error handling
 */
export async function enhancedFetch(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as NetworkError;
      error.statusCode = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw createNetworkError(error);
  }
}

/**
 * API request wrapper with retry logic
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit & { timeout?: number; retryOptions?: RetryOptions } = {}
): Promise<T> {
  const { retryOptions, ...fetchOptions } = options;

  return fetchWithRetry(async () => {
    const response = await enhancedFetch(url, fetchOptions);
    return response.json();
  }, retryOptions);
}

/**
 * Create a standardized network error
 */
function createNetworkError(error: any): NetworkError {
  if (error instanceof Error) {
    const networkError = error as NetworkError;
    
    // Handle AbortError (timeout)
    if (error.name === 'AbortError') {
      networkError.isTimeout = true;
      networkError.message = 'Request timed out';
    }
    
    // Handle TypeError (network error)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      networkError.isNetworkError = true;
      networkError.message = 'Network error - please check your connection';
    }

    return networkError;
  }

  // Create new error for non-Error objects
  const networkError = new Error('Unknown network error') as NetworkError;
  if (error?.statusCode) {
    networkError.statusCode = error.statusCode;
  }
  return networkError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  return DEFAULT_RETRY_OPTIONS.retryCondition(error);
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (error?.isTimeout) {
    return 'Request timed out. Please try again.';
  }
  
  if (error?.isNetworkError) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (error?.statusCode) {
    switch (error.statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'Data conflict. This item may already exist.';
      case 422:
        return 'Invalid data provided.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return `Request failed (${error.statusCode}). Please try again.`;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}