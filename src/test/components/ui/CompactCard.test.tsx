import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CompactCard } from '@/components/ui';

describe('CompactCard', () => {
  it('renders basic card with title and content', () => {
    render(
      <CompactCard title="Test Card">
        <div>Test content</div>
      </CompactCard>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders card with subtitle', () => {
    render(
      <CompactCard title="Test Card" subtitle="Test subtitle">
        <div>Test content</div>
      </CompactCard>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
  });

  it('renders card with icon and badge', () => {
    const icon = <svg data-testid="test-icon" />;
    
    render(
      <CompactCard title="Test Card" icon={icon} badge="5">
        <div>Test content</div>
      </CompactCard>
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders collapsible card and toggles content', () => {
    render(
      <CompactCard title="Test Card" collapsible>
        <div>Test content</div>
      </CompactCard>
    );

    const toggleButton = screen.getByRole('button');
    expect(screen.getByText('Test content')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleButton);
    expect(screen.queryByText('Test content')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(toggleButton);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders collapsed by default when defaultCollapsed is true', () => {
    render(
      <CompactCard title="Test Card" collapsible defaultCollapsed>
        <div>Test content</div>
      </CompactCard>
    );

    expect(screen.queryByText('Test content')).not.toBeInTheDocument();
  });

  it('renders actions in header', () => {
    const actions = <button>Action Button</button>;
    
    render(
      <CompactCard title="Test Card" actions={actions}>
        <div>Test content</div>
      </CompactCard>
    );

    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(
      <CompactCard title="Test Card" variant="default">
        <div>Test content</div>
      </CompactCard>
    );

    let card = screen.getByText('Test content').closest('.rounded-lg');
    expect(card).toHaveClass('bg-white', 'border-gray-200', 'shadow-sm');

    rerender(
      <CompactCard title="Test Card" variant="minimal">
        <div>Test content</div>
      </CompactCard>
    );

    card = screen.getByText('Test content').closest('.rounded-lg');
    expect(card).toHaveClass('bg-gray-50', 'border-gray-100');

    rerender(
      <CompactCard title="Test Card" variant="dense">
        <div>Test content</div>
      </CompactCard>
    );

    card = screen.getByText('Test content').closest('.rounded-lg');
    expect(card).toHaveClass('border-l-4', 'border-l-blue-500');
  });

  it('applies custom className', () => {
    render(
      <CompactCard title="Test Card" className="custom-class">
        <div>Test content</div>
      </CompactCard>
    );

    const card = screen.getByText('Test content').closest('.rounded-lg');
    expect(card).toHaveClass('custom-class');
  });

  it('renders without header when no title, subtitle, actions, or collapsible', () => {
    render(
      <CompactCard>
        <div>Test content</div>
      </CompactCard>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
    // Should not have header elements
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('handles edge case with empty badge', () => {
    render(
      <CompactCard title="Test Card" badge="">
        <div>Test content</div>
      </CompactCard>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    // Empty badge should not render since it's falsy
    const badge = document.querySelector('.bg-blue-100');
    expect(badge).not.toBeInTheDocument();
  });

  it('handles long titles with truncation', () => {
    const longTitle = 'This is a very long title that should be truncated when it exceeds the available space';
    
    render(
      <CompactCard title={longTitle}>
        <div>Test content</div>
      </CompactCard>
    );

    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toHaveClass('truncate');
  });

  it('handles multiple actions', () => {
    const actions = (
      <div>
        <button>Action 1</button>
        <button>Action 2</button>
      </div>
    );
    
    render(
      <CompactCard title="Test Card" actions={actions}>
        <div>Test content</div>
      </CompactCard>
    );

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });
});