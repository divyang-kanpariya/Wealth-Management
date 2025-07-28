import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TabPanel, { Tab } from '@/components/ui/TabPanel';

describe('TabPanel', () => {
  const mockTabs: Tab[] = [
    {
      id: 'tab1',
      label: 'Tab 1',
      content: <div>Content 1</div>
    },
    {
      id: 'tab2',
      label: 'Tab 2',
      content: <div>Content 2</div>,
      badge: '5'
    },
    {
      id: 'tab3',
      label: 'Tab 3',
      content: <div>Content 3</div>,
      icon: <svg data-testid="tab3-icon" />,
      disabled: true
    }
  ];

  it('renders all tabs and shows first tab content by default', () => {
    render(<TabPanel tabs={mockTabs} />);

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('switches tab content when tab is clicked', () => {
    render(<TabPanel tabs={mockTabs} />);

    expect(screen.getByText('Content 1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Tab 2'));
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('respects defaultTab prop', () => {
    render(<TabPanel tabs={mockTabs} defaultTab="tab2" />);

    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('calls onChange when tab is switched', () => {
    const onChange = vi.fn();
    render(<TabPanel tabs={mockTabs} onChange={onChange} />);

    fireEvent.click(screen.getByText('Tab 2'));
    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('renders tab badges', () => {
    render(<TabPanel tabs={mockTabs} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders tab icons', () => {
    render(<TabPanel tabs={mockTabs} />);

    expect(screen.getByTestId('tab3-icon')).toBeInTheDocument();
  });

  it('handles disabled tabs', () => {
    const onChange = vi.fn();
    render(<TabPanel tabs={mockTabs} onChange={onChange} />);

    const disabledTab = screen.getByText('Tab 3');
    expect(disabledTab.closest('button')).toHaveClass('opacity-50', 'cursor-not-allowed');

    fireEvent.click(disabledTab);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Content 1')).toBeInTheDocument(); // Should stay on first tab
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(
      <TabPanel tabs={mockTabs} variant="default" />
    );

    let tabContainer = screen.getByText('Tab 1').closest('div');
    expect(tabContainer).toHaveClass('border-b', 'border-gray-200');

    rerender(<TabPanel tabs={mockTabs} variant="minimal" />);
    tabContainer = screen.getByText('Tab 1').closest('div');
    expect(tabContainer).toHaveClass('border-b', 'border-gray-100');

    rerender(<TabPanel tabs={mockTabs} variant="pills" />);
    tabContainer = screen.getByText('Tab 1').closest('div');
    expect(tabContainer).toHaveClass('bg-gray-100', 'rounded-lg', 'p-1');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <TabPanel tabs={mockTabs} size="sm" />
    );

    let tab = screen.getByText('Tab 1');
    expect(tab).toHaveClass('px-2', 'py-1', 'text-xs');

    rerender(<TabPanel tabs={mockTabs} size="md" />);
    tab = screen.getByText('Tab 1');
    expect(tab).toHaveClass('px-3', 'py-2', 'text-sm');

    rerender(<TabPanel tabs={mockTabs} size="lg" />);
    tab = screen.getByText('Tab 1');
    expect(tab).toHaveClass('px-4', 'py-3', 'text-base');
  });

  it('shows active tab styling', () => {
    render(<TabPanel tabs={mockTabs} />);

    const activeTab = screen.getByText('Tab 1');
    expect(activeTab).toHaveClass('border-blue-500', 'text-blue-600');

    const inactiveTab = screen.getByText('Tab 2');
    expect(inactiveTab).toHaveClass('text-gray-500');
  });

  it('handles empty tabs array', () => {
    render(<TabPanel tabs={[]} />);

    // Should render empty tab container
    const container = document.querySelector('.flex.space-x-1');
    expect(container).toBeInTheDocument();
    expect(container?.children).toHaveLength(0);
  });

  it('handles tab with complex content', () => {
    const complexTabs: Tab[] = [
      {
        id: 'complex',
        label: 'Complex Tab',
        content: (
          <div>
            <h2>Complex Content</h2>
            <p>This is complex content with multiple elements</p>
            <button>Action Button</button>
          </div>
        )
      }
    ];

    render(<TabPanel tabs={complexTabs} />);

    expect(screen.getByText('Complex Content')).toBeInTheDocument();
    expect(screen.getByText('This is complex content with multiple elements')).toBeInTheDocument();
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TabPanel tabs={mockTabs} className="custom-tab-panel" />);

    const container = screen.getByText('Tab 1').closest('.custom-tab-panel');
    expect(container).toBeInTheDocument();
  });

  it('handles tab switching with keyboard navigation', () => {
    render(<TabPanel tabs={mockTabs} />);

    const tab2 = screen.getByText('Tab 2');
    tab2.focus();
    fireEvent.keyDown(tab2, { key: 'Enter' });

    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('truncates long tab labels', () => {
    const longLabelTabs: Tab[] = [
      {
        id: 'long',
        label: 'This is a very long tab label that should be truncated',
        content: <div>Long tab content</div>
      }
    ];

    render(<TabPanel tabs={longLabelTabs} />);

    const tabLabel = screen.getByText('This is a very long tab label that should be truncated');
    expect(tabLabel).toHaveClass('truncate');
  });

  it('handles numeric badges', () => {
    const numericBadgeTabs: Tab[] = [
      {
        id: 'numeric',
        label: 'Numeric Badge',
        content: <div>Numeric content</div>,
        badge: 42
      }
    ];

    render(<TabPanel tabs={numericBadgeTabs} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('maintains tab state when content changes', () => {
    const { rerender } = render(<TabPanel tabs={mockTabs} />);

    // Switch to tab 2
    fireEvent.click(screen.getByText('Tab 2'));
    expect(screen.getByText('Content 2')).toBeInTheDocument();

    // Re-render with same tabs
    rerender(<TabPanel tabs={mockTabs} />);
    expect(screen.getByText('Content 2')).toBeInTheDocument(); // Should stay on tab 2
  });
});