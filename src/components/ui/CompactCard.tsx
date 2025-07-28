import React, { useState } from 'react';

export interface CompactCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  variant?: 'default' | 'minimal' | 'dense';
}

const CompactCard: React.FC<CompactCardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  collapsible = false,
  defaultCollapsed = false,
  actions,
  icon,
  badge,
  variant = 'default'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const variantClasses = {
    default: 'bg-white border border-gray-200 shadow-sm',
    minimal: 'bg-gray-50 border border-gray-100',
    dense: 'bg-white border-l-4 border-l-blue-500 border-r border-t border-b border-gray-100'
  };

  const paddingClasses = {
    default: 'p-4',
    minimal: 'p-3',
    dense: 'p-2'
  };

  return (
    <div className={`rounded-lg ${variantClasses[variant]} ${className}`}>
      {(title || subtitle || actions || collapsible) && (
        <div className={`flex items-center justify-between ${paddingClasses[variant]} ${!isCollapsed ? 'border-b border-gray-100' : ''}`}>
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {icon && (
              <div className="flex-shrink-0 text-gray-500">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {title}
                  </h3>
                  {badge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {badge}
                    </span>
                  )}
                </div>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {actions}
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      
      {!isCollapsed && (
        <div className={variant === 'dense' ? 'p-2' : paddingClasses[variant]}>
          {children}
        </div>
      )}
    </div>
  );
};

export default CompactCard;