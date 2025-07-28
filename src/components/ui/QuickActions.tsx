import React from 'react';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  tooltip?: string;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical' | 'grid';
}

const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  className = '',
  size = 'md',
  layout = 'horizontal'
}) => {
  const getVariantClasses = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200';
      case 'secondary':
        return 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200';
      case 'danger':
        return 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200';
      case 'success':
        return 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200';
      default:
        return 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200';
    }
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base'
  };

  const layoutClasses = {
    horizontal: 'flex space-x-2',
    vertical: 'flex flex-col space-y-2',
    grid: 'grid grid-cols-2 gap-2'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.tooltip}
          className={`
            ${sizeClasses[size]}
            ${getVariantClasses(action.variant)}
            ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            border rounded-lg transition-colors duration-200 flex items-center justify-center space-x-1.5
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
          `}
        >
          <span className={`flex-shrink-0 ${iconSizeClasses[size]}`}>
            {action.icon}
          </span>
          {layout !== 'grid' && (
            <span className="truncate font-medium">
              {action.label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;