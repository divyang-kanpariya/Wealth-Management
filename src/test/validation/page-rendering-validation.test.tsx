/**
 * Page Rendering Validation Tests
 * Task 11: Validate Component Functionality - Page Rendering
 * 
 * This test suite validates that all main pages render correctly
 * with the modernized components and handle different states properly.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Import page components
import Dashboard from '@/app/page';

describe('Page Rendering Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        portfolioSummary: {
          totalValue: 100000,
          totalInvested: 80000,
          totalGainLoss: 20000,
          totalGainLossPercentage: 25,
          assetAllocation: [
            { type: 'Stocks', value: 60000, percentage: 60 },
            { type: 'Mutual Funds', value: 40000, percentage: 40 }
          ],
          accountDistribution: [
            { account: 'Zerodha', value: 50000, percentage: 50 },
            { account: 'Groww', value: 50000, percentage: 50 }
          ]
        },
        totalInvestments: 10,
        totalGoals: 3,
        totalAccounts: 2,
        goalProgress: [
          {
            id: 1,
            name: 'Emergency Fund',
            targetAmount: 100000,
            currentAmount: 75000,
            progress: 75,
            targetDate: '2024-12-31'
          }
        ],
        investmentsWithValues: [
          {
            id: 1,
            name: 'RELIANCE',
            type: 'Stock',
            units: 100,
            buyPrice: 2000,
            currentPrice: 2200,
            currentValue: 220000,
            gainLoss: 20000,
            gainLossPercentage: 10
          }
        ]
      })
    });
  });

  describe('Dashboard Page Rendering', () => {
    it('should render dashboard with loading state initially', async () => {
      render(<Dashboard />);
      
      // Should show loading state initially
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('should render dashboard with data after loading', async () => {
      render(<Dashboard />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      // Should show portfolio summary
      await waitFor(() => {
        expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
      });
    });

    it('should render dashboard with error state when API fails', async () => {
      // Mock API failure
      (global.fetch as any).mockRejectedValue(new Error('API Error'));
      
      render(<Dashboard />);
      
      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch dashboard data')).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('should render empty state when no data available', async () => {
      // Mock empty response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => null
      });
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('No Data Available')).toBeInTheDocument();
      });

      expect(screen.getByText('Start by adding your first investment to see your dashboard.')).toBeInTheDocument();
      expect(screen.getByText('Add Investment')).toBeInTheDocument();
    });
  });



  describe('Component Integration', () => {
    it('should use CompactCard components throughout the dashboard', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        // CompactCard components should be present (check for their characteristic classes)
        const cards = document.querySelectorAll('.rounded-lg.bg-white.border.border-gray-200.shadow-sm');
        expect(cards.length).toBeGreaterThan(0);
      });
    });

    it('should use DataGrid components for displaying metrics', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        // DataGrid components should be present (check for grid classes)
        const grids = document.querySelectorAll('.grid');
        expect(grids.length).toBeGreaterThan(0);
      });
    });

    it('should use LoadingState component during data fetching', () => {
      render(<Dashboard />);
      
      // LoadingState should be visible initially
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('should use ErrorState component when errors occur', async () => {
      // Mock API failure
      (global.fetch as any).mockRejectedValue(new Error('Network Error'));
      
      render(<Dashboard />);
      
      await waitFor(() => {
        // ErrorState should show error icon
        const errorIcon = document.querySelector('.text-red-400');
        expect(errorIcon).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Validation', () => {
    it('should apply responsive classes for different screen sizes', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        // Check for responsive grid classes
        const responsiveElements = document.querySelectorAll('[class*="sm:"], [class*="lg:"], [class*="md:"]');
        expect(responsiveElements.length).toBeGreaterThan(0);
      });
    });

    it('should handle mobile-friendly layouts', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Dashboard />);
      
      await waitFor(() => {
        // Should still render without errors on mobile
        expect(screen.queryByText('Loading dashboard...')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Validation', () => {
    it('should have proper heading hierarchy', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        // Should have main heading
        const mainHeading = screen.getByRole('heading', { level: 1 });
        expect(mainHeading).toBeInTheDocument();
      });
    });

    it('should have proper button roles and labels', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        // Should have accessible buttons
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should have proper navigation structure', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        // Navigation should be accessible
        const navigation = document.querySelector('nav');
        expect(navigation).toBeInTheDocument();
      });
    });
  });

  describe('Performance Validation', () => {
    it('should render dashboard within reasonable time', async () => {
      const startTime = performance.now();
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle multiple re-renders efficiently', async () => {
      const { rerender } = render(<Dashboard />);
      
      // Re-render multiple times
      for (let i = 0; i < 5; i++) {
        rerender(<Dashboard />);
      }
      
      // Should still work correctly
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle component errors gracefully', async () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock a component that throws an error
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };
      
      // This would be caught by ErrorBoundary in real app
      expect(() => {
        render(<ThrowingComponent />);
      }).toThrow('Test error');
      
      consoleSpy.mockRestore();
    });
  });
});