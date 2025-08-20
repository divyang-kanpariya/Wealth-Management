'use client';

import React, { useState, useRef } from 'react';
import FormError from './FormError';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | string[];
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  success?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  loading = false,
  success = false,
  className = '',
  id,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
    onBlur?.(e);
  };

  const getInputClasses = () => {
    const baseClasses = `
      block w-full rounded-md shadow-sm transition-all duration-200 sm:text-sm
      focus:outline-none focus:ring-2 focus:border-blue-500
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      hover:border-gray-400
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon || loading || success || error ? 'pr-10' : ''}
    `;

    if (error) {
      return `${baseClasses} border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 animate-shake`;
    }
    
    if (success) {
      return `${baseClasses} border-green-300 text-green-900 focus:ring-green-500 focus:border-green-500`;
    }

    return `${baseClasses} border-gray-300 focus:ring-blue-500 ${isFocused ? 'border-blue-500 shadow-lg' : ''}`;
  };

  const getLabelClasses = () => {
    const baseClasses = `
      block text-sm font-medium mb-1 transition-all duration-200
    `;

    if (error) {
      return `${baseClasses} text-red-700`;
    }
    
    if (success) {
      return `${baseClasses} text-green-700`;
    }

    return `${baseClasses} text-gray-700 ${isFocused ? 'text-blue-700' : ''}`;
  };

  const getRightIcon = () => {
    if (loading) {
      return (
        <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }

    if (success && !error) {
      return (
        <svg className="h-5 w-5 text-green-500 animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }

    if (error) {
      return (
        <svg className="h-5 w-5 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }

    return rightIcon;
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={getLabelClasses()}>
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={`relative input-focus ${isFocused ? 'scale-[1.01]' : ''} transition-transform duration-200`}>
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className={`h-5 w-5 transition-colors duration-200 ${isFocused ? 'text-blue-500' : 'text-gray-400'}`}>
              {leftIcon}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          className={`${getInputClasses()} ${className}`}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {(rightIcon || loading || success || error) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="h-5 w-5">
              {getRightIcon()}
            </div>
          </div>
        )}
        
        {/* Focus ring animation */}
        {isFocused && (
          <div className="absolute inset-0 rounded-md border-2 border-blue-500 opacity-20 animate-pulse-glow pointer-events-none" />
        )}
      </div>
      
      <div className="animate-fade-in-up">
        <FormError error={error} />
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
        {success && !error && (
          <p className="mt-1 text-sm text-green-600 flex items-center space-x-1">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Looks good!</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default Input;