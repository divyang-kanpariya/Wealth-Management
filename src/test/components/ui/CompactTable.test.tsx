import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CompactTable, type CompactTableColumn } from '@/components/ui';

interface TestData {
  id: string;
  name: string;
  value: number;
  status: string;
}

describe('CompactTable', () => {
  const mockData: TestData[] = [
    { id: '1', name: 'Item 1', value: 100, status: 'active' },
    { id: '2', name: 'Item 2', value: 200, status: 'inactive' },
    { id: '3', name: 'Item 3', value: 300, status: 'active' }
  ];

  const mockColumns: CompactTableColumn<TestData>[] = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      width: '40%'
    },
    {
      key: 'value',
      title: 'Value',
      sortable: true,
      align: 'right',
      width: '30%',
      render: (value) => `$${value}`
    },
    {
      key: 'status',
      title: 'Status',
      width: '30%',
      render: (value) => (
        <span className={value === 'active' ? 'text-green-600' : 'text-red-600'}>
          {value}
        </span>
      )
    }
  ];

  const rowKey = (item: TestData) => item.id;

  it('renders table with data correctly', () => {
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getAllByText('active')).toHaveLength(2); // Two items have 'active' status
  });

  it('handles loading state', () => {
    render(
      <CompactTable
        data={[]}
        columns={mockColumns}
        rowKey={rowKey}
        loading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles empty data state', () => {
    render(
      <CompactTable
        data={[]}
        columns={mockColumns}
        rowKey={rowKey}
        emptyMessage="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('handles sorting', () => {
    const onSort = vi.fn();
    
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        onSort={onSort}
      />
    );

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    expect(onSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('shows sort indicators', () => {
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        sortKey="name"
        sortDirection="asc"
      />
    );

    // Should show sort icon for the sorted column
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader?.querySelector('svg')).toBeInTheDocument();
  });

  it('handles row selection', () => {
    const onSelectionChange = vi.fn();
    
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        selectable={true}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4); // 3 data rows + 1 header

    fireEvent.click(checkboxes[1]); // Click first data row checkbox
    expect(onSelectionChange).toHaveBeenCalledWith(mockData[0], true);
  });

  it('handles select all functionality', () => {
    const onSelectionChange = vi.fn();
    
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        selectable={true}
        onSelectionChange={onSelectionChange}
      />
    );

    const headerCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(headerCheckbox);

    expect(onSelectionChange).toHaveBeenCalledTimes(3); // Called for each row
  });

  it('renders actions column', () => {
    const actions = (item: TestData) => (
      <button>Edit {item.name}</button>
    );

    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        actions={actions}
      />
    );

    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Edit Item 1')).toBeInTheDocument();
  });

  it('handles row click', () => {
    const onRowClick = vi.fn();
    
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        onRowClick={onRowClick}
      />
    );

    const firstRow = screen.getByText('Item 1').closest('tr');
    fireEvent.click(firstRow!);

    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        variant="default"
      />
    );

    let container = screen.getByText('Item 1').closest('.bg-white');
    expect(container).toHaveClass('border-gray-200', 'shadow-sm');

    rerender(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        variant="compact"
      />
    );

    container = screen.getByText('Item 1').closest('.bg-white');
    expect(container).toHaveClass('border-gray-100');

    rerender(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        variant="minimal"
      />
    );

    container = screen.getByText('Item 1').closest('.bg-white');
    expect(container).toBeInTheDocument();
  });

  it('hides header when showHeader is false', () => {
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        showHeader={false}
      />
    );

    expect(screen.queryByText('Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Value')).not.toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument(); // Data should still be there
  });

  it('applies maxHeight constraint', () => {
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        maxHeight="200px"
      />
    );

    const scrollContainer = screen.getByText('Item 1').closest('.overflow-auto');
    expect(scrollContainer).toHaveStyle({ maxHeight: '200px' });
  });

  it('handles mobile hidden columns', () => {
    const columnsWithMobileHidden: CompactTableColumn<TestData>[] = [
      ...mockColumns,
      {
        key: 'extra',
        title: 'Extra',
        mobileHidden: true,
        render: () => 'Extra data'
      }
    ];

    render(
      <CompactTable
        data={mockData}
        columns={columnsWithMobileHidden}
        rowKey={rowKey}
      />
    );

    const extraHeader = screen.getByText('Extra');
    expect(extraHeader.closest('th')).toHaveClass('hidden', 'md:table-cell');
  });

  it('applies column alignment correctly', () => {
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
      />
    );

    const valueHeader = screen.getByText('Value');
    expect(valueHeader.closest('th')).toHaveClass('text-right');
  });

  it('handles custom column rendering', () => {
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
      />
    );

    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
    expect(screen.getByText('$300')).toBeInTheDocument();

    const activeStatus = screen.getAllByText('active')[0];
    expect(activeStatus).toHaveClass('text-green-600');
  });

  it('prevents action clicks from triggering row clicks', () => {
    const onRowClick = vi.fn();
    const actions = (item: TestData) => (
      <button onClick={() => console.log('Action clicked')}>
        Edit {item.name}
      </button>
    );

    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        onRowClick={onRowClick}
        actions={actions}
      />
    );

    const actionButton = screen.getByText('Edit Item 1');
    fireEvent.click(actionButton);

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(
      <CompactTable
        data={mockData}
        columns={mockColumns}
        rowKey={rowKey}
        className="custom-table-class"
      />
    );

    const container = screen.getByText('Item 1').closest('.custom-table-class');
    expect(container).toBeInTheDocument();
  });
});