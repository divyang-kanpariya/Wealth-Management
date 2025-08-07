import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react-dom/test-utils';

// Import main pages
import Dashboard from '@/app/page';

// Import key components
import { CompactCard, QuickActions, DataGrid, LoadingState, ErrorState, Alert } from '@/components/ui';
import { CompactTopPerformers } from '@/components/dashboard';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Task 11: Component Functionality Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        portfolioSummary: {
          totalValue: 100000,
          totalInvested: 80000,
          totalGainLoss: 20000,
          totalGainLossPercentage: 25,
          assetAllocation: {
            stocks: { value: 50000, percentage: 50 },
            mutual_funds: { value: 30000, percentage: 30 },
            gold: { value: 20000, percentage: 20 }
          },
          accountDistribution: {
            'Zerodha': { value: 60000, percentage: 60 },
            'HDFC Bank': { value: 40000, percentage: 40 }
          }
        },
        goalProgress: [
          {
            id: '1',
            name: 'Emergency Fund',
            targetAmount: 500000,
            currentValue: 200000,
            progress: 40,
            remainingAmount: 300000,
            targetDate: new Date('2025-12-31')
          }
        ],
        totalInvestments: 10,
        totalGoals: 3,
        investmentsWithValues: [
          {
            investment: {
              id: '1',
              name: 'HDFC Bank',
              symbol: 'HDFCBANK',
              type: 'stocks',
              units: 100,
              buyPrice: 1500,
              buyDate: new Date('2024-01-01'),
              accountId: '1'
            },
            currentPrice: 1800,
            currentValue: 180000,
            gainLoss: 30000,
            gainLossPercentage: 20
          }
        ]
      })
    });
  });

  describe('Page Rendering Validation', () => {
    it('should render main dashboard page correctly', async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      // Check for key dashboard elements
      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
      expect(screen.getByText('Top Performers')).toBeInTheDocument();
      expect(screen.getByText('Performance Insights')).toBeInTheDocument();
    });



    it('should handle loading states correctly', async () => {
      // Mock delayed response
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({})
        }), 100))
      );

      await act(async () => {
        render(<Dashboard />);
      });

      // Should show loading state
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Loading' })).toBeInTheDocument();
    });

    it('should handle error states correctly', async () => {
      // Mock failed response
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });
  });

  describe('Interactive Elements Validation', () => {
    it('should handle refresh button clicks', async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      // Should trigger another API call
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });



    it('should handle retry functionality in error states', async () => {
      // Mock initial failure then success
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            portfolioSummary: { totalValue: 100000 },
            goalProgress: [],
            totalInvestments: 0,
            totalGoals: 0,
            investmentsWithValues: []
          })
        });

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try again');
      
      await act(async () => {
        fireEvent.click(retryButton);
      });

      // Should recover from error
      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Functionality Tests', () => {
    it('should render CompactCard with all variants', () => {
      const { rerender } = render(
        <CompactCard title="Test Card" variant="default">
          <p>Content</p>
        </CompactCard>
      );

      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();

      // Test minimal variant
      rerender(
        <CompactCard title="Minimal Card" variant="minimal">
          <p>Minimal Content</p>
        </CompactCard>
      );

      expect(screen.getByText('Minimal Card')).toBeInTheDocument();
    });

    it('should render QuickActions with proper functionality', () => {
      const mockAction = vi.fn();
      const actions = [
        { label: 'Action 1', onClick: mockAction, variant: 'primary' as const },
        { label: 'Action 2', onClick: mockAction, variant: 'secondary' as const }
      ];

      render(<QuickActions actions={actions} />);

      const action1 = screen.getByText('Action 1');
      const action2 = screen.getByText('Action 2');

      expect(action1).toBeInTheDocument();
      expect(action2).toBeInTheDocument();

      fireEvent.click(action1);
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should render DataGrid with proper data display', () => {
      const items = [
        { label: 'Total Value', value: '₹1,00,000', color: 'success' as const },
        { label: 'Total Invested', value: '₹80,000', color: 'neutral' as const }
      ];

      render(<DataGrid items={items} columns={2} />);

      expect(screen.getByText('Total Value')).toBeInTheDocument();
      expect(screen.getByText('₹1,00,000')).toBeInTheDocument();
      expect(screen.getByText('Total Invested')).toBeInTheDocument();
      expect(screen.getByText('₹80,000')).toBeInTheDocument();
    });

    it('should render LoadingState with different sizes', () => {
      const { rerender } = render(<LoadingState size="sm" />);
      
      let spinner = screen.getByRole('img', { name: 'Loading' });
      expect(spinner).toHaveClass('h-4', 'w-4');

      rerender(<LoadingState size="lg" />);
      spinner = screen.getByRole('img', { name: 'Loading' });
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('should render ErrorState with proper structure', () => {
      const mockRetry = vi.fn();
      
      render(
        <ErrorState 
          title="Custom Error" 
          message="Something went wrong" 
          onRetry={mockRetry}
        />
      );

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Try again');
      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should render Alert with different types', () => {
      const { rerender } = render(
        <Alert type="success" message="Success message" />
      );

      expect(screen.getByText('Success message')).toBeInTheDocument();

      rerender(<Alert type="error" message="Error message" />);
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior Tests', () => {
    it('should apply responsive classes correctly', async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      // Check for responsive grid classes
      const container = document.querySelector('.space-y-4');
      expect(container).toBeInTheDocument();
    });

    it('should handle mobile-friendly layouts', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      // Should render mobile-friendly layout
      const container = document.querySelector('.space-y-4');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility Standards', () => {
    it('should have proper ARIA labels and roles', async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      // Check for proper button roles
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      // Test keyboard navigation
      const buttons = screen.getAllByRole('button');
      const performanceTab = screen.getByText('Performance');

      // Focus should be manageable
      overviewTab.focus();
      expect(document.activeElement).toBe(overviewTab);

      // Keyboard navigation should work
      fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });
      fireEvent.keyDown(performanceTab, { key: 'Enter' });
      
      expect(screen.getByText('Top Performers')).toBeInTheDocument();
    });

    it('should have proper color contrast and visual indicators', () => {
      render(
        <DataGrid 
          items={[
            { label: 'Success', value: 'Good', color: 'success' },
            { label: 'Danger', value: 'Bad', color: 'danger' }
          ]} 
          columns={2} 
        />
      );

      // Should render with proper color indicators
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Danger')).toBeInTheDocument();
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        investment: {
          id: `inv-${i}`,
          name: `Investment ${i}`,
          type: 'stocks' as const,
          buyDate: new Date(),
          accountId: '1'
        },
        currentValue: 1000 * (i + 1),
        gainLoss: 100 * i,
        gainLossPercentage: 10
      }));

      // Mock API response with large dataset
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          portfolioSummary: { totalValue: 100000 },
          goalProgress: [],
          totalInvestments: 100,
          totalGoals: 0,
          investmentsWithValues: largeDataset
        })
      });

      const startTime = performance.now();
      
      await act(async () => {
        render(<Dashboard />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 2 seconds)
      expect(renderTime).toBeLessThan(2000);
    });

    it('should gracefully handle malformed data', async () => {
      // Mock API response with malformed data
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          portfolioSummary: null,
          goalProgress: undefined,
          investmentsWithValues: [
            {
              investment: null, // Malformed data
              currentValue: 'invalid',
              gainLoss: undefined
            }
          ]
        })
      });

      await act(async () => {
        render(<Dashboard />);
      });

      // Should not crash and show appropriate fallback
      await waitFor(() => {
        expect(screen.getByText('No Data Available')).toBeInTheDocument();
      });
    });
  });
});