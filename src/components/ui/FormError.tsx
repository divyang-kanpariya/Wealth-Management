import React from 'react';

export interface FormErrorProps {
  error?: string | string[];
  className?: string;
  showIcon?: boolean;
}

const FormError: React.FC<FormErrorProps> = ({
  error,
  className = '',
  showIcon = true,
}) => {
  if (!error) return null;

  const errors = Array.isArray(error) ? error.filter(err => err && err.trim()) : [error];
  
  if (errors.length === 0) return null;

  return (
    <div className={`mt-1 ${className}`}>
      {errors.map((err, index) => (
        <div key={index} className="flex items-start text-sm text-red-600">
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
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className="text-red-600">{err}</span>
        </div>
      ))}
    </div>
  );
};

export default FormError;