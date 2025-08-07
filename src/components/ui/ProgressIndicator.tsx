import React from 'react';

export interface ProgressIndicatorProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'linear' | 'circular' | 'steps';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  showPercentage?: boolean;
  label?: string;
  steps?: string[];
  currentStep?: number;
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  size = 'md',
  variant = 'linear',
  color = 'blue',
  showPercentage = true,
  label,
  steps,
  currentStep = 0,
  className = ''
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const getColorClasses = () => {
    const colors = {
      blue: 'bg-blue-600 text-blue-600',
      green: 'bg-green-600 text-green-600',
      yellow: 'bg-yellow-600 text-yellow-600',
      red: 'bg-red-600 text-red-600',
      purple: 'bg-purple-600 text-purple-600'
    };
    return colors[color];
  };

  const getSizeClasses = () => {
    const sizes = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    };
    return sizes[size];
  };

  if (variant === 'circular') {
    const radius = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;
    
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="relative">
          <svg
            className={`transform -rotate-90 ${
              size === 'sm' ? 'w-12 h-12' : size === 'md' ? 'w-16 h-16' : 'w-20 h-20'
            }`}
            viewBox="0 0 50 50"
          >
            <circle
              cx="25"
              cy="25"
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="25"
              cy="25"
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`${getColorClasses().split(' ')[1]} transition-all duration-500 ease-out`}
              strokeLinecap="round"
            />
          </svg>
          {showPercentage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-medium ${
                size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
              }`}>
                {Math.round(clampedProgress)}%
              </span>
            </div>
          )}
        </div>
        {label && (
          <p className="mt-2 text-sm text-gray-600 text-center">{label}</p>
        )}
      </div>
    );
  }

  if (variant === 'steps' && steps) {
    return (
      <div className={`${className}`}>
        {label && (
          <p className="text-sm font-medium text-gray-700 mb-3">{label}</p>
        )}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                index < currentStep
                  ? `${getColorClasses().split(' ')[0]} text-white`
                  : index === currentStep
                    ? `border-2 border-${color}-600 bg-white`
                    : 'bg-gray-200'
              }`}>
                {index < currentStep ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : index === currentStep ? (
                  <div className={`w-2 h-2 rounded-full ${getColorClasses().split(' ')[0]} animate-pulse`} />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm ${
                  index <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}>
                  {step}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Linear progress bar (default)
  return (
    <div className={`${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
          {showPercentage && (
            <span className="text-sm text-gray-600">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${getSizeClasses()}`}>
        <div
          className={`${getSizeClasses()} ${getColorClasses().split(' ')[0]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressIndicator;