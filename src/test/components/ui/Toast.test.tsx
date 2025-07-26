import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '../../../components/ui/Toast';

// Mock timers
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const TestComponent = () => {
  const { addToast, removeToast, clearToasts } = useToast();
  
  return (
    <div>
      <button onClick={() => addToast({ type: 'success', message: 'Success message' })}>
        Add Success Toast
      </button>
      <button onClick={() => addToast({ type: 'error', message: 'Error message' })}>
        Add Error Toast
      </button>
      <button onClick={() => addToast({ 
        type: 'info', 
        title: 'Info Title',
        message: 'Info message',
        action: { label: 'Action', onClick: () => {} }
      })}>
        Add Info Toast with Action
      </button>
      <button onClick={() => addToast({ type: 'warning', message: 'Warning message', duration: 0 })}>
        Add Persistent Toast
      </button>
      <button onClick={clearToasts}>
        Clear All Toasts
      </button>
    </div>
  );
};

describe('Toast System', () => {
  describe('useToast hook', () => {
    it('throws error when used outside ToastProvider', () => {
      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within a ToastProvider');
    });

    it('provides toast functions when used within provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result } = renderHook(() => useToast(), { wrapper });

      expect(result.current.addToast).toBeDefined();
      expect(result.current.removeToast).toBeDefined();
      expect(result.current.clearToasts).toBeDefined();
      expect(result.current.toasts).toEqual([]);
    });
  });

  describe('ToastProvider', () => {
    it('renders children without toasts', () => {
      render(
        <ToastProvider>
          <div>Test content</div>
        </ToastProvider>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('adds and displays success toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('adds and displays error toast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Error Toast'));

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('displays toast with title and action', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Info Toast with Action'));

      expect(screen.getByText('Info Title')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('auto-removes toast after duration', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Fast-forward time by 5 seconds (default duration)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });

    it('does not auto-remove toast with duration 0', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Persistent Toast'));
      expect(screen.getByText('Warning message')).toBeInTheDocument();

      // Fast-forward time by 10 seconds
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Toast should still be there
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('removes toast when close button is clicked', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      // Wait for animation
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('clears all toasts', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Add multiple toasts
      fireEvent.click(screen.getByText('Add Success Toast'));
      fireEvent.click(screen.getByText('Add Error Toast'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();

      // Clear all toasts
      fireEvent.click(screen.getByText('Clear All Toasts'));

      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });

    it('displays multiple toasts simultaneously', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Success Toast'));
      fireEvent.click(screen.getByText('Add Error Toast'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('calls action callback when action button is clicked', () => {
      const actionCallback = vi.fn();
      
      const TestComponentWithCallback = () => {
        const { addToast } = useToast();
        
        return (
          <button onClick={() => addToast({ 
            type: 'info', 
            message: 'Info message',
            action: { label: 'Test Action', onClick: actionCallback }
          })}>
            Add Toast
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponentWithCallback />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      fireEvent.click(screen.getByText('Test Action'));

      expect(actionCallback).toHaveBeenCalledTimes(1);
    });

    it('applies correct styling for different toast types', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Add different types of toasts
      fireEvent.click(screen.getByText('Add Success Toast'));
      fireEvent.click(screen.getByText('Add Error Toast'));

      // Check that different icons are rendered (success and error have different SVG paths)
      const icons = screen.getAllByRole('img', { hidden: true });
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});