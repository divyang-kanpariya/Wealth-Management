import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DataGrid, { DataGridItem } from '@/components/ui/DataGrid';

describe('DataGrid', () => {
  const mockItems: DataGridItem[] = [
    {
      label: 'Total Value',
      value: '$10,000',
      subValue: 'Current market value',
      color: 'success',
      icon: <svg data-testid="icon-1" />,
      tooltip: 'Total portfolio value'
    },
    {
      label: 'Total Invested',
      value: '$8,000',
      color: 'default'
    },
    {
      label: 'Gain/Loss',
      value: '$2,000',
      subValue: '+25%',
      color: 'success'
    }
  ];

  it('renders all items correctly', () => {
    render(<DataGrid items={mockItems} />);

    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
    expect(screen.getByText('Current market value')).toBeInTheDocument();
    expect(screen.getByText('Total Invested')).toBeInTheDocument();
    expect(screen.getByText('$8,000')).toBeInTheDocument();
    expect(screen.getByText('Gain/Loss')).toBeInTheDocument();
    expect(screen.getByText('$2,000')).toBeInTheDocument();
    expect(screen.getByText('+25%')).toBeInTheDocument();
  });

  it('renders icons when provided', () => {
    render(<DataGrid items={mockItems} />);

    expect(screen.getByTestId('icon-1')).toBeInTheDocument();
  });

  it('applies tooltip when provided', () => {
    render(<DataGrid items={mockItems} />);

    // Find the item container div that should have the tooltip
    const itemWithTooltip = screen.getByText('Total Value').closest('div')?.parentElement?.parentElement;
    expect(itemWithTooltip).toHaveAttribute('title', 'Total portfolio value');
  });

  it('applies correct color classes', () => {
    render(<DataGrid items={mockItems} />);

    const successValue = screen.getByText('$10,000');
    expect(successValue).toHaveClass('text-green-600');

    const defaultValue = screen.getByText('$8,000');
    expect(defaultValue).toHaveClass('text-gray-900');
  });

  it('handles different column configurations', () => {
    const { rerender } = render(<DataGrid items={mockItems} columns={1} />);
    
    let container = screen.getByText('Total Value').closest('.grid');
    expect(container).toHaveClass('grid-cols-1');

    rerender(<DataGrid items={mockItems} columns={3} />);
    container = screen.getByText('Total Value').closest('.grid');
    expect(container).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');

    rerender(<DataGrid items={mockItems} columns={4} />);
    container = screen.getByText('Total Value').closest('.grid');
    expect(container).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');

    rerender(<DataGrid items={mockItems} columns={6} />);
    container = screen.getByText('Total Value').closest('.grid');
    expect(container).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-6');
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(<DataGrid items={mockItems} variant="default" />);
    
    let container = screen.getByText('Total Value').closest('.grid');
    expect(container).toHaveClass('gap-4');

    rerender(<DataGrid items={mockItems} variant="compact" />);
    container = screen.getByText('Total Value').closest('.grid');
    expect(container).toHaveClass('gap-3');

    rerender(<DataGrid items={mockItems} variant="minimal" />);
    container = screen.getByText('Total Value').closest('.grid');
    expect(container).toHaveClass('gap-2');
  });

  it('handles items without subValue', () => {
    const itemsWithoutSubValue: DataGridItem[] = [
      {
        label: 'Simple Item',
        value: 'Simple Value',
        color: 'default'
      }
    ];

    render(<DataGrid items={itemsWithoutSubValue} />);

    expect(screen.getByText('Simple Item')).toBeInTheDocument();
    expect(screen.getByText('Simple Value')).toBeInTheDocument();
  });

  it('handles items without icons', () => {
    const itemsWithoutIcons: DataGridItem[] = [
      {
        label: 'No Icon Item',
        value: 'No Icon Value',
        color: 'default'
      }
    ];

    render(<DataGrid items={itemsWithoutIcons} />);

    expect(screen.getByText('No Icon Item')).toBeInTheDocument();
    expect(screen.getByText('No Icon Value')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<DataGrid items={mockItems} className="custom-grid-class" />);

    const container = screen.getByText('Total Value').closest('.grid');
    expect(container).toHaveClass('custom-grid-class');
  });

  it('handles empty items array', () => {
    render(<DataGrid items={[]} />);

    // Should render empty grid
    const container = document.querySelector('.grid');
    expect(container).toBeInTheDocument();
    expect(container?.children).toHaveLength(0);
  });

  it('handles all color variants', () => {
    const colorItems: DataGridItem[] = [
      { label: 'Success', value: 'Success Value', color: 'success' },
      { label: 'Danger', value: 'Danger Value', color: 'danger' },
      { label: 'Warning', value: 'Warning Value', color: 'warning' },
      { label: 'Info', value: 'Info Value', color: 'info' },
      { label: 'Default', value: 'Default Value', color: 'default' }
    ];

    render(<DataGrid items={colorItems} />);

    expect(screen.getByText('Success Value')).toHaveClass('text-green-600');
    expect(screen.getByText('Danger Value')).toHaveClass('text-red-600');
    expect(screen.getByText('Warning Value')).toHaveClass('text-yellow-600');
    expect(screen.getByText('Info Value')).toHaveClass('text-blue-600');
    expect(screen.getByText('Default Value')).toHaveClass('text-gray-900');
  });

  it('truncates long labels and values', () => {
    const longItems: DataGridItem[] = [
      {
        label: 'This is a very long label that should be truncated',
        value: 'This is a very long value that should also be truncated',
        subValue: 'This is a very long sub value that should be truncated as well',
        color: 'default'
      }
    ];

    render(<DataGrid items={longItems} />);

    const label = screen.getByText('This is a very long label that should be truncated');
    const value = screen.getByText('This is a very long value that should also be truncated');
    const subValue = screen.getByText('This is a very long sub value that should be truncated as well');

    expect(label).toHaveClass('truncate');
    expect(value).toHaveClass('truncate');
    expect(subValue).toHaveClass('truncate');
  });
});