import React from 'react';
import FormError from './FormError';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | string[];
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseInputClasses = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm';
  const errorInputClasses = 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500';
  const iconInputClasses = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';
  
  const inputClasses = `${baseInputClasses} ${error ? errorInputClasses : ''} ${iconInputClasses} ${className}`;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-gray-400">
              {leftIcon}
            </div>
          </div>
        )}
        <input
          id={inputId}
          className={inputClasses}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-gray-400">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      <FormError error={error} />
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;