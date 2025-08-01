import React from 'react';
import Button from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  fullScreen?: boolean;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try again',
  fullScreen = false,
  className = ''
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white z-50'
    : 'flex flex-col items-center justify-center py-8';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        {/* Error icon */}
        <svg
          className="mx-auto h-12 w-12 text-red-400"
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
        
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          {title}
        </h3>
        
        <p className="mt-1 text-sm text-gray-500 max-w-md">
          {message}
        </p>
        
        {onRetry && (
          <div className="mt-6">
            <Button onClick={onRetry} variant="primary">
              {retryText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorState;