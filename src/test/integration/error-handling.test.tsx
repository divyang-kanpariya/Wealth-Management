import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider } from '../../components/ui/Toast';
import ErrorBoundary from '../../components/ErrorBoundary';
import useApiCall from '../../hooks/useApiCall';
import useErrorHandler from '../../hooks/useErrorHandler';

// Mock the network utils
vi.mock('../../lib/network-utils', () => ({
  apiRequest: vi.fn(),
  getErrorMessage: vi.fn((error) => {
    if (error?.statusCode === 500) return 'Server error. Please try again later.';
    if (error?.isNetworkError) return 'Network error. Please check your connection and try again.';
    return 'An unexpected error occurred. Please try again.';
  }),
}));

import { apiRequest } from '../../lib/network-utils';

// Test component that uses error handling
const TestApiComponent = () => {
  const { data, loading, error, execute } = useApiCall({
    showErrorToast: true,
    showSuccessToast: true,
  });

  return (
    <div>
      <button onClick={() => execute('/api/test')}>
        Make API Call
      </button>
      <button onClick={() => execute('/api/error')}>
        Make Failing API Call
      </button>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {data && <div>Data: {JSON.stringify(data)}</div>}
    </div>
  );
};

// Test component that uses error handler
const TestErrorHandlerComponent = () => {
  const { error, isError, handleError, handleApiError, clearError } = useErrorHandler();

  return (
    <div>
      <button onClick={() => handleError('Test error')}>
        Handle Error
      </button>
      <button onClick={() => handleApiError({ status: 500 })}>
        Handle API Error
      </button>
      <button onClick={() => handleApiError(new TypeError('fetch failed'))}>
        Handle Network Error
      </button>
      <button onClick={clearError}>
        Clear Error
      </button>
      {isError && <div>Error: {error}</div>}
    </div>
  );
};

// Component that throws an error for testing ErrorBoundary
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Component error');
  }
  return <div>No error</div>;
};

const TestErrorBoundaryComponent = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  return (
    <div>
      <button onClick={() => setShouldThrow(true)}>
        Trigger Error
      </button>
      <button onClick={() => setShouldThrow(false)}>
        Fix Error
      </button>
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </div>
  );
};

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('API Error Handling with Toast', () => {
    it('shows success toast on successful API call', async () => {
      const mockData = { id: 1, name: 'Test' };
      (apiRequest as any).mockResolvedValue(mockData);

      render(
        <ToastProvider>
          <TestApiComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Make API Call'));

      await waitFor(() => {
        expect(screen.getByText('Data: {"id":1,"name":"Test"}')).toBeInTheDocument();
      });

      // Fast-forward to show toast
      vi.advanceTimersByTime(100);

      await waitFor(() => {
        expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
      });
    });

    it('shows error toast on failed API call', async () => {
      const mockError = new Error('API failed');
      (apiRequest as any).mockRejectedValue(mockError);

      render(
        <ToastProvider>
          <TestApiComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Make Failing API Call'));

      await waitFor(() => {
        expect(screen.getByText('Error: API failed')).toBeInTheDocument();
      });

      // Fast-forward to show toast
      vi.advanceTimersByTime(100);

      await waitFor(() => {
        expect(screen.getByText('Request Failed')).toBeInTheDocument();
        expect(screen.getByText('API failed')).toBeInTheDocument();
      });
    });

    it('provides retry functionality in error toast', async () => {
      let callCount = 0;
      (apiRequest as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First attempt failed'));
        }
        return Promise.resolve({ id: 1, name: 'Success' });
      });

      render(
        <ToastProvider>
          <TestApiComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Make API Call'));

      // Wait for error toast
      await waitFor(() => {
        expect(screen.getByText('Request Failed')).toBeInTheDocument();
      });

      // Click retry button in toast
      fireEvent.click(screen.getByText('Retry'));

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText('Data: {"id":1,"name":"Success"}')).toBeInTheDocument();
      });

      expect(callCount).toBe(2);
    });
  });

  describe('Error Handler Hook', () => {
    it('handles different types of errors correctly', async () => {
      render(
        <ToastProvider>
          <TestErrorHandlerComponent />
        </ToastProvider>
      );

      // Test generic error
      fireEvent.click(screen.getByText('Handle Error'));
      expect(screen.getByText('Error: Test error')).toBeInTheDocument();

      // Clear error
      fireEvent.click(screen.getByText('Clear Error'));
      expect(screen.queryByText('Error: Test error')).not.toBeInTheDocument();

      // Test API error
      fireEvent.click(screen.getByText('Handle API Error'));
      expect(screen.getByText('Error: Server error. Please try again later.')).toBeInTheDocument();

      // Clear error
      fireEvent.click(screen.getByText('Clear Error'));

      // Test network error
      fireEvent.click(screen.getByText('Handle Network Error'));
      expect(screen.getByText('Error: Network error. Please check your connection and try again.')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('catches and displays component errors', () => {
      render(
        <ToastProvider>
          <TestErrorBoundaryComponent />
        </ToastProvider>
      );

      // Initially no error
      expect(screen.getByText('No error')).toBeInTheDocument();

      // Trigger error
      fireEvent.click(screen.getByText('Trigger Error'));

      // Error boundary should catch and display error
      expect(screen.getByText('Application Error')).toBeInTheDocument();
      expect(screen.getByText('Component error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('recovers from errors when retry is clicked', () => {
      render(
        <ToastProvider>
          <TestErrorBoundaryComponent />
        </ToastProvider>
      );

      // Trigger error
      fireEvent.click(screen.getByText('Trigger Error'));
      expect(screen.getByText('Application Error')).toBeInTheDocument();

      // Fix the error condition first
      fireEvent.click(screen.getByText('Fix Error'));

      // Then retry
      fireEvent.click(screen.getByRole('button', { name: /reload page/i }));

      // Should recover
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Application Error')).not.toBeInTheDocument();
    });
  });

  describe('Form Error Display', () => {
    it('displays validation errors in forms', () => {
      const TestFormComponent = () => {
        const [errors, setErrors] = React.useState<Record<string, string>>({});

        const handleSubmit = () => {
          setErrors({
            name: 'Name is required',
            email: 'Invalid email format',
          });
        };

        return (
          <form>
            <div>
              <input name="name" />
              {errors.name && <div className="error">Error: {errors.name}</div>}
            </div>
            <div>
              <input name="email" />
              {errors.email && <div className="error">Error: {errors.email}</div>}
            </div>
            <button type="button" onClick={handleSubmit}>
              Submit
            </button>
          </form>
        );
      };

      render(<TestFormComponent />);

      fireEvent.click(screen.getByText('Submit'));

      expect(screen.getByText('Error: Name is required')).toBeInTheDocument();
      expect(screen.getByText('Error: Invalid email format')).toBeInTheDocument();
    });
  });

  describe('Network Error Recovery', () => {
    it('handles network errors with retry logic', async () => {
      let callCount = 0;
      (apiRequest as any).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          const error = new Error('Network error');
          (error as any).isNetworkError = true;
          return Promise.reject(error);
        }
        return Promise.resolve({ id: 1, name: 'Success after retry' });
      });

      render(
        <ToastProvider>
          <TestApiComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Make API Call'));

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByText('Data: {"id":1,"name":"Success after retry"}')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(callCount).toBe(3);
    });

    it('shows appropriate error message for timeout', async () => {
      const timeoutError = new Error('Request timed out');
      (timeoutError as any).isTimeout = true;
      (apiRequest as any).mockRejectedValue(timeoutError);

      render(
        <ToastProvider>
          <TestApiComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Make API Call'));

      await waitFor(() => {
        expect(screen.getByText('Error: Request timed out')).toBeInTheDocument();
      });
    });
  });

  describe('Error State Persistence', () => {
    it('maintains error state across component re-renders', async () => {
      const TestPersistenceComponent = () => {
        const [count, setCount] = React.useState(0);
        const { error, handleError } = useErrorHandler();

        return (
          <div>
            <button onClick={() => setCount(c => c + 1)}>
              Count: {count}
            </button>
            <button onClick={() => handleError('Persistent error')}>
              Set Error
            </button>
            {error && <div>Error: {error}</div>}
          </div>
        );
      };

      render(<TestPersistenceComponent />);

      // Set error
      fireEvent.click(screen.getByText('Set Error'));
      expect(screen.getByText('Error: Persistent error')).toBeInTheDocument();

      // Re-render component
      fireEvent.click(screen.getByText('Count: 0'));
      expect(screen.getByText('Count: 1')).toBeInTheDocument();

      // Error should still be there
      expect(screen.getByText('Error: Persistent error')).toBeInTheDocument();
    });
  });
});