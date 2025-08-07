'use client'

import React, { useState } from 'react';
import Button from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  fullScreen?: boolean;
  className?: string;
  errorCode?: string;
  suggestions?: string[];
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  retryText = 'Try again',
  fullScreen = false,
  className = '',
  errorCode,
  suggestions = []
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white z-50 backdrop-blur-sm'
    : 'flex flex-col items-center justify-center py-8';

  return (
    <div className={`${containerClasses} ${className} transition-all duration-300`} data-testid="error-state-container">
      <div className="text-center max-w-lg">
        {/* Animated Error icon */}
        <div className="relative">
          <svg
            className="mx-auto h-16 w-16 text-red-400 animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <div className="absolute inset-0 rounded-full bg-red-100 opacity-20 animate-ping" />
        </div>
        
        {title && (
          <h3 className="mt-4 text-xl font-semibold text-gray-900 animate-fade-in">
            {title}
          </h3>
        )}
        
        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          {message}
        </p>
        
        {errorCode && (
          <p className="mt-2 text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
            Error Code: {errorCode}
          </p>
        )}
        
        {suggestions.length > 0 && (
          <div className="mt-4 text-left bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Suggestions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {onRetry && (
          <div className="mt-6 space-y-3">
            <Button 
              onClick={handleRetry} 
              variant="primary"
              disabled={isRetrying}
              className="transition-all duration-200 hover:scale-105"
            >
              {isRetrying ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying...
                </div>
              ) : (
                retryText
              )}
            </Button>
            
            <button 
              onClick={() => window.location.reload()}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors underline"
            >
              Refresh page instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorState;