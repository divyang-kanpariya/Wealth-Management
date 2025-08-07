import React from 'react';

/**
 * FormError component for displaying validation errors and messages
 * Supports multiple message types with consistent styling
 */
export interface FormErrorProps {
  /** Error message(s) to display */
  error?: string | string[];
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the error icon */
  showIcon?: boolean;
  /** Type of message to display */
  variant?: 'error' | 'warning' | 'info';
  /** Display style - simple for inline errors, compact for standalone messages */
  style?: 'simple' | 'compact';
}

const FormError: React.FC<FormErrorProps> = ({
  error,
  className = '',
  showIcon = true,
  variant = 'error',
  style = 'simple',
}) => {
  if (!error) return null;

  const errors = Array.isArray(error) ? error.filter(err => err && err.trim()) : [error];
  
  if (errors.length === 0) return null;

  const variantStyles = {
    error: {
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconPath: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
    },
    warning: {
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconPath: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
    },
    info: {
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconPath: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
    }
  };

  const currentStyle = variantStyles[variant];

  const containerClasses = style === 'compact' 
    ? `mt-2 p-3 rounded-lg border ${currentStyle.bgColor} ${currentStyle.borderColor}`
    : 'mt-1';

  return (
    <div className={`transition-opacity duration-200 ${containerClasses} ${className}`}>
      {errors.map((err, index) => {
        const itemClasses = style === 'compact'
          ? `flex items-start text-sm ${currentStyle.textColor} ${errors.length > 1 && index > 0 ? 'mt-2' : ''}`
          : `flex items-start text-sm ${currentStyle.textColor}`;

        return (
          <div key={index} className={itemClasses}>
            {showIcon && (
              <svg
                className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                role="img"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d={currentStyle.iconPath}
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className={currentStyle.textColor}>{err}</span>
          </div>
        );
      })}
    </div>
  );
};

export default FormError;