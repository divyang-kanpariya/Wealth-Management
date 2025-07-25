import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
  className = ''
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50'
    : 'flex flex-col items-center justify-center py-8';

  return (
    <div className={`${containerClasses} ${className}`}>
      <LoadingSpinner size={size} />
      <p className="mt-2 text-sm text-gray-600">
        {message}
      </p>
    </div>
  );
};

export default LoadingState;