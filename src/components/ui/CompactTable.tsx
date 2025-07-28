import React, { useState } from 'react';

export interface CompactTableColumn<T> {
  key: string;
  title: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
  mobileHidden?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface CompactTableProps<T> {
  data: T[];
  columns: CompactTableColumn<T>[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  rowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (item: T, selected: boolean) => void;
  actions?: (item: T) => React.ReactNode;
  variant?: 'default' | 'compact' | 'minimal';
  showHeader?: boolean;
  maxHeight?: string;
}

function CompactTable<T>({
  data,
  columns,
  onSort,
  sortKey,
  sortDirection,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  rowKey,
  onRowClick,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  actions,
  variant = 'compact',
  showHeader = true,
  maxHeight
}: CompactTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleSort = (key: string) => {
    if (!onSort) return;
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, newDirection);
  };

  const isSelected = (item: T) => {
    return selectedItems.some(selected => rowKey(selected) === rowKey(item));
  };

  const handleSelectionChange = (item: T, event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      onSelectionChange(item, event.target.checked);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return (
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getAlignmentClass = (align?: string) => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  const variantClasses = {
    default: {
      container: 'bg-white border border-gray-200 shadow-sm',
      header: 'bg-gray-50',
      headerCell: 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
      row: 'hover:bg-gray-50',
      cell: 'px-4 py-3 text-sm'
    },
    compact: {
      container: 'bg-white border border-gray-100',
      header: 'bg-gray-25',
      headerCell: 'px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide',
      row: 'hover:bg-gray-25',
      cell: 'px-3 py-2 text-sm'
    },
    minimal: {
      container: 'bg-white',
      header: 'bg-transparent border-b border-gray-100',
      headerCell: 'px-2 py-1.5 text-xs font-medium text-gray-500',
      row: 'hover:bg-gray-50 border-b border-gray-50',
      cell: 'px-2 py-1.5 text-sm'
    }
  };

  const classes = variantClasses[variant];

  if (loading) {
    return (
      <div className={`${classes.container} rounded-lg overflow-hidden ${className}`}>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`${classes.container} rounded-lg overflow-hidden ${className}`}>
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${classes.container} rounded-lg overflow-hidden ${className}`}>
      <div 
        className="overflow-auto scrollbar-thin"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="min-w-full divide-y divide-gray-200">
          {showHeader && (
            <thead className={classes.header}>
              <tr>
                {selectable && (
                  <th className={`${classes.headerCell} w-8`}>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                      checked={data.length > 0 && selectedItems.length === data.length}
                      onChange={(e) => {
                        if (onSelectionChange) {
                          data.forEach(item => {
                            if (isSelected(item) !== e.target.checked) {
                              onSelectionChange(item, e.target.checked);
                            }
                          });
                        }
                      }}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`${classes.headerCell} ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    } ${getAlignmentClass(column.align)} ${column.className || ''} ${
                      column.mobileHidden ? 'hidden md:table-cell' : ''
                    }`}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="truncate">{column.title}</span>
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
                {actions && (
                  <th className={`${classes.headerCell} text-right w-20`}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
          )}
          <tbody className="bg-white divide-y divide-gray-100">
            {data.map((item) => {
              const key = rowKey(item);
              return (
                <tr
                  key={key}
                  className={`${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${classes.row} ${hoveredRow === key ? 'bg-blue-25' : ''} transition-colors`}
                  onMouseEnter={() => setHoveredRow(key)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {selectable && (
                    <td className={`${classes.cell} whitespace-nowrap`}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                        checked={isSelected(item)}
                        onChange={(e) => handleSelectionChange(item, e)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = (item as any)[column.key];
                    return (
                      <td
                        key={column.key}
                        className={`${classes.cell} ${getAlignmentClass(column.align)} ${column.className || ''} ${
                          column.mobileHidden ? 'hidden md:table-cell' : ''
                        }`}
                      >
                        <div className="truncate">
                          {column.render ? column.render(value, item) : value}
                        </div>
                      </td>
                    );
                  })}
                  {actions && (
                    <td className={`${classes.cell} whitespace-nowrap text-right`}>
                      <div onClick={(e) => e.stopPropagation()}>
                        {actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CompactTable;