import React from 'react';

export interface DataGridItem {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  color?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
  tooltip?: string;
}

export interface DataGridProps {
  items: DataGridItem[];
  columns?: 1 | 2 | 3 | 4 | 6;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

const DataGrid: React.FC<DataGridProps> = ({
  items,
  columns = 2,
  variant = 'default',
  className = ''
}) => {
  const getColorClasses = (color: DataGridItem['color']) => {
    switch (color) {
      case 'success':
        return 'text-green-600';
      case 'danger':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-900';
    }
  };

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
  };

  const spacingClasses = {
    default: 'gap-4',
    compact: 'gap-3',
    minimal: 'gap-2'
  };

  const itemPaddingClasses = {
    default: 'p-3',
    compact: 'p-2',
    minimal: 'p-1.5'
  };

  return (
    <div className={`grid ${gridClasses[columns]} ${spacingClasses[variant]} ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className={`${itemPaddingClasses[variant]} ${variant !== 'minimal' ? 'bg-gray-50 rounded-lg' : ''}`}
          title={item.tooltip}
        >
          <div className="flex items-center space-x-2 mb-1">
            {item.icon && (
              <div className="flex-shrink-0 text-gray-400">
                {item.icon}
              </div>
            )}
            <div className="text-xs font-medium text-gray-600 truncate">
              {item.label}
            </div>
          </div>
          <div className={`text-sm font-semibold ${getColorClasses(item.color)} truncate`}>
            {item.value}
          </div>
          {item.subValue && (
            <div className="text-xs text-gray-500 truncate mt-0.5">
              {item.subValue}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DataGrid;