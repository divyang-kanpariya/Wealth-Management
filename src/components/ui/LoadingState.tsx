import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
  progress?: number; // 0-100 for progress bar
  steps?: string[]; // Array of loading steps
  currentStep?: number; // Current step index
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
  className = '',
  progress,
  steps,
  currentStep = 0
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50 backdrop-blur-sm'
    : 'flex flex-col items-center justify-center py-8';

  return (
    <div className={`${containerClasses} ${className} transition-all duration-300`}>
      <div className="text-center max-w-md">
        <LoadingSpinner size={size} />
        
        <p className="mt-4 text-sm text-gray-600 font-medium animate-pulse">
          {message}
        </p>
        
        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
            <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% complete</p>
          </div>
        )}
        
        {/* Loading Steps */}
        {steps && steps.length > 0 && (
          <div className="mt-4 space-y-2">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-center text-sm transition-all duration-300 ${
                  index === currentStep 
                    ? 'text-blue-600 font-medium' 
                    : index < currentStep 
                      ? 'text-green-600' 
                      : 'text-gray-400'
                }`}
              >
                <div className={`w-4 h-4 rounded-full mr-3 flex items-center justify-center transition-all duration-300 ${
                  index === currentStep 
                    ? 'bg-blue-100 border-2 border-blue-600' 
                    : index < currentStep 
                      ? 'bg-green-100 border-2 border-green-600' 
                      : 'bg-gray-100 border-2 border-gray-300'
                }`}>
                  {index < currentStep ? (
                    <svg className="w-2 h-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : index === currentStep ? (
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  ) : (
                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                  )}
                </div>
                {step}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingState;