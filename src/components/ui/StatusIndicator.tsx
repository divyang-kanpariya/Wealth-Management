import React from 'react';

export interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dot' | 'badge' | 'pill';
  pulse?: boolean;
  tooltip?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  variant = 'dot',
  pulse = false,
  tooltip
}) => {
  const getStatusClasses = (status: StatusIndicatorProps['status']) => {
    switch (status) {
      case 'success':
        return {
          dot: 'bg-green-500',
          badge: 'bg-green-100 text-green-800 border-green-200',
          pill: 'bg-green-500 text-white'
        };
      case 'warning':
        return {
          dot: 'bg-yellow-500',
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          pill: 'bg-yellow-500 text-white'
        };
      case 'danger':
        return {
          dot: 'bg-red-500',
          badge: 'bg-red-100 text-red-800 border-red-200',
          pill: 'bg-red-500 text-white'
        };
      case 'info':
        return {
          dot: 'bg-blue-500',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          pill: 'bg-blue-500 text-white'
        };
      case 'neutral':
        return {
          dot: 'bg-gray-500',
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          pill: 'bg-gray-500 text-white'
        };
    }
  };

  const sizeClasses = {
    dot: {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4'
    },
    badge: {
      sm: 'px-1.5 py-0.5 text-xs',
      md: 'px-2 py-1 text-xs',
      lg: 'px-2.5 py-1 text-sm'
    },
    pill: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
      lg: 'px-3 py-1 text-sm'
    }
  };

  const statusClasses = getStatusClasses(status);

  if (variant === 'dot') {
    return (
      <div className="flex items-center space-x-2" title={tooltip}>
        <div
          className={`
            ${sizeClasses.dot[size]}
            ${statusClasses.dot}
            ${pulse ? 'animate-pulse' : ''}
            rounded-full flex-shrink-0
          `}
        />
        {label && (
          <span className="text-sm text-gray-700 truncate">
            {label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <span
        className={`
          ${sizeClasses.badge[size]}
          ${statusClasses.badge}
          ${pulse ? 'animate-pulse' : ''}
          inline-flex items-center font-medium rounded border
        `}
        title={tooltip}
      >
        {label}
      </span>
    );
  }

  if (variant === 'pill') {
    return (
      <span
        className={`
          ${sizeClasses.pill[size]}
          ${statusClasses.pill}
          ${pulse ? 'animate-pulse' : ''}
          inline-flex items-center font-medium rounded-full
        `}
        title={tooltip}
      >
        {label}
      </span>
    );
  }

  return null;
};

export default StatusIndicator;