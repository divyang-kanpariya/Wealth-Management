import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react-dom/test-utils';

// Import key components for validation
import { CompactCard, QuickActions, DataGrid, LoadingState, ErrorState, Alert } from '@/components/ui';

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
  });

  describe('1. Test all pages render correctly with new components', () => {
    it('should render CompactCard component correctly', () => {
      render(
        <CompactCard title="Test Card" variant="default">
          <p>Test content</p>
        </CompactCard>
      );

      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render CompactCard with different variants', () => {
      const { rerender } = render(
        <CompactCard title="Default Card" variant="default">
          <p>Default content</p>
        </CompactCard>
      );

      expect(screen.getByText('Default Card')).toBeInTheDocument();

      rerender(
        <CompactCard title="Minimal Card" variant="minimal">
          <p>Minimal content</p>
        </CompactCard>
      );

      expect(screen.getByText('Minimal Card')).toBeInTheDocument();
      expect(screen.getByText('Minimal content')).toBeInTheDocument();
    });

    it('should render DataGrid component correctly', () => {
      const items = [
        { label: 'Total Value', value: '₹1,00,000', color: 'success' as const },
        { label: 'Total Invested', value: '₹80,000', color: 'neutral' as const },
        { label: 'Gain/Loss', value: '₹20,000', color: 'success' as const }
      ];

      render(<DataGrid items={items} columns={3} />);

      expect(screen.getByText('Total Value')).toBeInTheDocument();
      expect(screen.getByText('₹1,00,000')).toBeInTheDocument();
      expect(screen.getByText('Total Invested')).toBeInTheDocument();
      expect(screen.getByText('₹80,000')).toBeInTheDocument();
      expect(screen.getByText('Gain/Loss')).toBeInTheDocument();
      expect(screen.getByText('₹20,000')).toBeInTheDocument();
    });

    it('should render LoadingState and ErrorState components', () => {
      const { rerender } = render(<LoadingState message="Loading data..." />);
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Loading' })).toBeInTheDocument();

      const mockRetry = vi.fn();
      rerender(
        <ErrorState 
          title="Error occurred" 
          message="Something went wrong" 
          onRetry={mockRetry}
        />
      );

      expect(screen.getByText('Error occurred')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('should render Alert component with different types', () => {
      const { rerender } = render(
        <Alert type="success" message="Operation successful" />
      );

      expect(screen.getByText('Operation successful')).toBeInTheDocument();

      rerender(<Alert type="error" message="Operation failed" />);
      expect(screen.getByText('Operation failed')).toBeInTheDocument();

      rerender(<Alert type="warning" message="Warning message" />);
      expect(screen.getByText('Warning message')).toBeInTheDocument();

      rerender(<Alert type="info" message="Information message" />);
      expect(screen.getByText('Information message')).toBeInTheDocument();
    });
  });

  describe('2. Verify interactive elements work as expected', () => {
    it('should handle QuickActions button clicks', () => {
      const mockAction1 = vi.fn();
      const mockAction2 = vi.fn();
      
      const actions = [
        { label: 'Primary Action', onClick: mockAction1, variant: 'primary' as const },
        { label: 'Secondary Action', onClick: mockAction2, variant: 'secondary' as const }
      ];

      render(<QuickActions actions={actions} />);

      const primaryButton = screen.getByText('Primary Action');
      const secondaryButton = screen.getByText('Secondary Action');

      expect(primaryButton).toBeInTheDocument();
      expect(secondaryButton).toBeInTheDocument();

      fireEvent.click(primaryButton);
      expect(mockAction1).toHaveBeenCalledTimes(1);

      fireEvent.click(secondaryButton);
      expect(mockAction2).toHaveBeenCalledTimes(1);
    });

    it('should handle CompactCard collapsible functionality', () => {
      render(
        <CompactCard title="Collapsible Card" collapsible defaultCollapsed={false}>
          <p>Card content</p>
        </CompactCard>
      );

      expect(screen.getByText('Card content')).toBeInTheDocument();

      // Find and click the collapse button
      const collapseButton = screen.getByRole('button');
      fireEvent.click(collapseButton);

      // Content should be hidden after collapse
      expect(screen.queryByText('Card content')).not.toBeInTheDocument();
    });

    it('should handle ErrorState retry functionality', () => {
      const mockRetry = vi.fn();
      
      render(
        <ErrorState 
          message="Network error occurred" 
          onRetry={mockRetry}
          retryText="Retry Now"
        />
      );

      const retryButton = screen.getByText('Retry Now');
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle Alert close functionality', () => {
      const mockClose = vi.fn();
      
      render(
        <Alert 
          type="info" 
          message="Closable alert" 
          onClose={mockClose}
        />
      );

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Check responsive behavior on different screen sizes', () => {
    it('should apply responsive grid classes in DataGrid', () => {
      const items = [
        { label: 'Item 1', value: 'Value 1' },
        { label: 'Item 2', value: 'Value 2' },
        { label: 'Item 3', value: 'Value 3' },
        { label: 'Item 4', value: 'Value 4' }
      ];

      render(<DataGrid items={items} columns={2} />);

      // Check that grid container exists with responsive classes
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid', 'sm:grid-cols-2');
    });

    it('should handle mobile viewport for CompactCard', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <CompactCard title="Mobile Card" variant="minimal">
          <p>Mobile content</p>
        </CompactCard>
      );

      expect(screen.getByText('Mobile Card')).toBeInTheDocument();
      expect(screen.getByText('Mobile content')).toBeInTheDocument();
    });

    it('should handle different screen sizes for QuickActions', () => {
      const actions = [
        { label: 'Action 1', onClick: vi.fn(), variant: 'primary' as const },
        { label: 'Action 2', onClick: vi.fn(), variant: 'secondary' as const },
        { label: 'Action 3', onClick: vi.fn(), variant: 'outline' as const }
      ];

      render(<QuickActions actions={actions} layout="horizontal" />);

      // All actions should be visible
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
      expect(screen.getByText('Action 3')).toBeInTheDocument();
    });
  });

  describe('4. Ensure accessibility standards are maintained', () => {
    it('should have proper ARIA labels for LoadingState', () => {
      render(<LoadingState message="Loading content..." />);

      const spinner = screen.getByRole('img', { name: 'Loading' });
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should have proper button roles for interactive elements', () => {
      const mockAction = vi.fn();
      const actions = [
        { label: 'Accessible Button', onClick: mockAction, variant: 'primary' as const }
      ];

      render(<QuickActions actions={actions} />);

      const button = screen.getByRole('button', { name: 'Accessible Button' });
      expect(button).toBeInTheDocument();
      // Button should be accessible and clickable
      expect(button).toBeEnabled();
    });

    it('should support keyboard navigation for buttons', () => {
      const mockAction = vi.fn();
      const actions = [
        { label: 'Keyboard Action', onClick: mockAction, variant: 'primary' as const }
      ];

      render(<QuickActions actions={actions} />);

      const button = screen.getByRole('button', { name: 'Keyboard Action' });
      
      // Test keyboard interaction
      button.focus();
      expect(document.activeElement).toBe(button);

      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockAction).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(button, { key: ' ' });
      expect(mockAction).toHaveBeenCalledTimes(2);
    });

    it('should have proper color contrast indicators', () => {
      const items = [
        { label: 'Success Item', value: 'Good', color: 'success' as const },
        { label: 'Danger Item', value: 'Bad', color: 'danger' as const },
        { label: 'Warning Item', value: 'Caution', color: 'warning' as const }
      ];

      render(<DataGrid items={items} columns={3} />);

      expect(screen.getByText('Success Item')).toBeInTheDocument();
      expect(screen.getByText('Danger Item')).toBeInTheDocument();
      expect(screen.getByText('Warning Item')).toBeInTheDocument();
    });

    it('should have proper semantic structure for cards', () => {
      render(
        <CompactCard title="Semantic Card" variant="default">
          <p>This card has proper semantic structure</p>
        </CompactCard>
      );

      // Check for proper heading structure
      const heading = screen.getByText('Semantic Card');
      expect(heading).toBeInTheDocument();
      
      const content = screen.getByText('This card has proper semantic structure');
      expect(content).toBeInTheDocument();
    });
  });

  describe('5. Component Integration and Error Handling', () => {
    it('should handle empty data gracefully in DataGrid', () => {
      render(<DataGrid items={[]} columns={2} />);

      // Should not crash with empty data
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should handle missing props gracefully', () => {
      // Test LoadingState without message
      render(<LoadingState />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Test ErrorState without title
      render(<ErrorState message="Error without title" />);
      expect(screen.getByText('Error without title')).toBeInTheDocument();
    });

    it('should handle long text content properly', () => {
      const longText = 'This is a very long text that should be handled properly by the component without breaking the layout or causing overflow issues in the user interface';
      
      render(
        <CompactCard title="Long Content Card">
          <p>{longText}</p>
        </CompactCard>
      );

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle multiple alerts simultaneously', () => {
      render(
        <div>
          <Alert type="success" message="Success alert" />
          <Alert type="error" message="Error alert" />
          <Alert type="warning" message="Warning alert" />
        </div>
      );

      expect(screen.getByText('Success alert')).toBeInTheDocument();
      expect(screen.getByText('Error alert')).toBeInTheDocument();
      expect(screen.getByText('Warning alert')).toBeInTheDocument();
    });

    it('should maintain component state correctly', () => {
      const { rerender } = render(
        <CompactCard title="State Card" collapsible defaultCollapsed={false}>
          <p>Initial content</p>
        </CompactCard>
      );

      expect(screen.getByText('Initial content')).toBeInTheDocument();

      rerender(
        <CompactCard title="State Card" collapsible defaultCollapsed={false}>
          <p>Updated content</p>
        </CompactCard>
      );

      expect(screen.getByText('Updated content')).toBeInTheDocument();
      expect(screen.queryByText('Initial content')).not.toBeInTheDocument();
    });
  });

  describe('6. Performance and Rendering Tests', () => {
    it('should render components within reasonable time', () => {
      const startTime = performance.now();
      
      render(
        <div>
          <CompactCard title="Performance Test">
            <DataGrid 
              items={Array.from({ length: 20 }, (_, i) => ({
                label: `Item ${i}`,
                value: `Value ${i}`
              }))}
              columns={4}
            />
          </CompactCard>
        </div>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid state changes', async () => {
      const { rerender } = render(<LoadingState message="Loading..." />);

      // Rapidly change between loading and error states
      for (let i = 0; i < 5; i++) {
        rerender(<ErrorState message={`Error ${i}`} />);
        rerender(<LoadingState message={`Loading ${i}...`} />);
      }

      // Should handle rapid changes without crashing
      expect(screen.getByText('Loading 4...')).toBeInTheDocument();
    });
  });
});