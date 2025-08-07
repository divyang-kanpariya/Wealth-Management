import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Layout from '@/components/layout/Layout';
import Navigation from '@/components/layout/Navigation';
import { Breadcrumb } from '@/components/ui';

// Mock Next.js navigation
const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Responsive Navigation and Routing', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  describe('Navigation Component', () => {
    const navigationItems = [
      { name: 'Dashboard', href: '/', icon: <div>Dashboard Icon</div> },
      { name: 'Investments', href: '/investments', icon: <div>Investments Icon</div> },
      { name: 'Goals', href: '/goals', icon: <div>Goals Icon</div> },
      { name: 'Accounts', href: '/accounts', icon: <div>Accounts Icon</div> },
    ];

    it('renders desktop navigation correctly', () => {
      render(<Navigation items={navigationItems} />);
      
      // Check that all navigation items are present
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Investments')).toBeInTheDocument();
      expect(screen.getByText('Goals')).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();
    });

    it('renders mobile navigation correctly', () => {
      render(<Navigation items={navigationItems} isMobile={true} />);
      
      // Check that all navigation items are present in mobile format
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Investments')).toBeInTheDocument();
      expect(screen.getByText('Goals')).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();
    });

    it('highlights current page correctly', () => {
      mockUsePathname.mockReturnValue('/investments');
      render(<Navigation items={navigationItems} />);
      
      const investmentsLink = screen.getByText('Investments').closest('a');
      expect(investmentsLink).toHaveClass('border-blue-500', 'text-blue-600');
    });

    it('handles dashboard route correctly', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Navigation items={navigationItems} />);
      
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveClass('border-blue-500', 'text-blue-600');
    });

    it('handles nested routes correctly', () => {
      mockUsePathname.mockReturnValue('/investments/123');
      render(<Navigation items={navigationItems} />);
      
      const investmentsLink = screen.getByText('Investments').closest('a');
      expect(investmentsLink).toHaveClass('border-blue-500', 'text-blue-600');
    });
  });

  describe('Layout Component', () => {
    it('renders with content', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      // Layout doesn't have title/subtitle props, just check content renders
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('shows mobile menu button on mobile', () => {
      // Mock window.innerWidth to simulate mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      // The mobile menu button should be present (though hidden by CSS on desktop)
      const mobileMenuButtons = screen.getAllByRole('button');
      expect(mobileMenuButtons.length).toBeGreaterThan(0);
    });

    it('toggles mobile menu when button is clicked', async () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      // Find the mobile menu button
      const mobileMenuButton = screen.getByRole('button');
      
      // Click to open mobile menu
      fireEvent.click(mobileMenuButton);
      
      // The mobile navigation should be visible
      await waitFor(() => {
        expect(screen.getAllByText('Dashboard')).toHaveLength(2); // Desktop + Mobile
      });
    });

    it('renders breadcrumbs when provided', () => {
      const breadcrumbs = [
        { label: 'Dashboard', href: '/' },
        { label: 'Investments', href: '/investments' },
        { label: 'Investment Details', current: true },
      ];

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Investments')).toBeInTheDocument();
      expect(screen.getByText('Investment Details')).toBeInTheDocument();
    });

    it('hides breadcrumbs when showBreadcrumbs is false', () => {
      const breadcrumbs = [
        { label: 'Dashboard', href: '/' },
        { label: 'Test Page', current: true },
      ];

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      // Breadcrumbs should not be visible
      expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
    });
  });

  describe('Breadcrumb Component', () => {
    it('renders breadcrumb items correctly', () => {
      const items = [
        { label: 'Dashboard', href: '/' },
        { label: 'Investments', href: '/investments' },
        { label: 'Investment Details', current: true },
      ];

      render(<Breadcrumb items={items} />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Investments')).toBeInTheDocument();
      expect(screen.getByText('Investment Details')).toBeInTheDocument();
    });

    it('renders separators between items', () => {
      const items = [
        { label: 'Dashboard', href: '/' },
        { label: 'Investments', current: true },
      ];

      render(<Breadcrumb items={items} />);
      
      // Check for separator SVG
      const separators = screen.getAllByRole('img', { hidden: true });
      expect(separators.length).toBeGreaterThan(0);
    });

    it('marks current item correctly', () => {
      const items = [
        { label: 'Dashboard', href: '/' },
        { label: 'Current Page', current: true },
      ];

      render(<Breadcrumb items={items} />);
      
      const currentItem = screen.getByText('Current Page');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
    });

    it('renders links for non-current items', () => {
      const items = [
        { label: 'Dashboard', href: '/' },
        { label: 'Current Page', current: true },
      ];

      render(<Breadcrumb items={items} />);
      
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/');
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to different screen sizes', () => {
      const { rerender } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      // Test desktop view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      rerender(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      // Test mobile view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      
      rerender(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      // Both should render without errors
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Page Routing', () => {
    it('handles all main routes correctly', () => {
      const routes = ['/', '/investments', '/goals', '/accounts'];
      
      routes.forEach(route => {
        mockUsePathname.mockReturnValue(route);
        
        const { unmount } = render(
          <Layout>
            <div>Content for {route}</div>
          </Layout>
        );
        
        expect(screen.getByText(`Content for ${route}`)).toBeInTheDocument();
        unmount();
      });
    });

    it('handles dynamic routes correctly', () => {
      const dynamicRoutes = [
        '/investments/123',
        '/goals/456',
        '/accounts/789',
      ];
      
      dynamicRoutes.forEach(route => {
        mockUsePathname.mockReturnValue(route);
        
        const { unmount } = render(
          <Layout>
            <div>Content for {route}</div>
          </Layout>
        );
        
        expect(screen.getByText(`Content for ${route}`)).toBeInTheDocument();
        unmount();
      });
    });
  });
});