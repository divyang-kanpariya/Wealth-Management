'use client'

import React, { useState } from 'react';
import LoadingState from './LoadingState';

export interface TableColumn<T> {
  key: string;
  title: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
  mobileHidden?: boolean; // Hide on mobile for responsive design
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
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
}

function Table<T>({
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
  actions
}: TableProps<T>) {
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
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white shadow-sm rounded-lg border ${className} animate-fade-in`}>
        <div className="p-6">
          <div className="animate-stagger space-y-4">
            {/* Header skeleton */}
            <div className="flex space-x-4">
              {columns.map((_, index) => (
                <div key={index} className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-shimmer" style={{ animationDelay: `${index * 0.1}s` }} />
                </div>
              ))}
            </div>
            {/* Row skeletons */}
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex space-x-4" style={{ animationDelay: `${(rowIndex + columns.length) * 0.1}s` }}>
                {columns.map((_, colIndex) => (
                  <div key={colIndex} className="flex-1">
                    <div className="h-8 bg-gray-200 rounded animate-shimmer" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white shadow-sm rounded-lg border ${className} animate-fade-in`}>
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-4 animate-bounce-subtle">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 animate-fade-in-up">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow-sm rounded-lg border overflow-hidden ${className} animate-fade-in card-hover`}>
      {/* Responsive Table */}
      <div className="table-mobile-scroll scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="animate-fade-in-down">
              {selectable && (
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 hover:scale-110"
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
                  className={`px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider transition-all duration-200 ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 hover:text-gray-700' : ''
                  } ${column.className || ''} ${column.mobileHidden ? 'hidden md:table-cell' : ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <span className="transition-transform duration-200 hover:scale-110">
                        {getSortIcon(column.key)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24 sm:w-32">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 animate-stagger">
            {data.map((item, index) => {
              const key = rowKey(item);
              return (
                <tr
                  key={key}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                    } ${hoveredRow === key ? 'bg-gray-50 transform scale-[1.01]' : ''} 
                    transition-all duration-200 hover:shadow-sm`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onMouseEnter={() => setHoveredRow(key)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {selectable && (
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 hover:scale-110"
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
                        className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm transition-all duration-200 ${
                          column.className || ''
                        } ${column.mobileHidden ? 'hidden md:table-cell' : ''}`}
                      >
                        {column.render ? column.render(value, item) : value}
                      </td>
                    );
                  })}
                  {actions && (
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div onClick={(e) => e.stopPropagation()} className="transition-all duration-200 hover:scale-105">
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

export default Table;