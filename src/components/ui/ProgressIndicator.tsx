'use client';

import React, { useEffect, useState } from 'react';

export interface ProgressIndicatorProps {
  progress: number; // 0-100
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'linear' | 'circular' | 'steps';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  showPercentage?: boolean;
  label?: string;
  steps?: string[];
  currentStep?: number;
  className?: string;
  animated?: boolean;
  striped?: boolean;
  indeterminate?: boolean;
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
  className = '',
  animated = true,
  striped = false,
  indeterminate = false
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Animate progress changes
  useEffect(() => {
    if (animated && !indeterminate) {
      const duration = 800;
      const steps = 60;
      const stepValue = (clampedProgress - displayProgress) / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        setDisplayProgress(prev => {
          const newValue = prev + stepValue;
          if (currentStep >= steps) {
            clearInterval(timer);
            return clampedProgress;
          }
          return newValue;
        });
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setDisplayProgress(clampedProgress);
    }
  }, [clampedProgress, animated, indeterminate, displayProgress]);

  const getColorClasses = () => {
    const colors = {
      blue: 'bg-blue-600 text-blue-600',
      green: 'bg-green-600 text-green-600',
      yellow: 'bg-yellow-600 text-yellow-600',
      red: 'bg-red-600 text-red-600',
      purple: 'bg-purple-600 text-purple-600',
      indigo: 'bg-indigo-600 text-indigo-600'
    };
    return colors[color];
  };

  const getSizeClasses = () => {
    const sizes = {
      xs: 'h-1',
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
      xl: 'h-4'
    };
    return sizes[size];
  };

  const getProgressBarClasses = () => {
    let classes = `${getSizeClasses()} ${getColorClasses().split(' ')[0]} rounded-full transition-all duration-500 ease-out`;

    if (striped) {
      classes += ' bg-gradient-to-r from-current via-transparent to-current bg-[length:20px_20px]';
    }

    if (animated && striped) {
      classes += ' animate-shimmer';
    }

    if (indeterminate) {
      classes += ' progress-indeterminate';
    }

    return classes;
  };

  if (variant === 'circular') {
    const radius = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="relative">
          <svg
            className={`transform -rotate-90 ${size === 'sm' ? 'w-12 h-12' : size === 'md' ? 'w-16 h-16' : 'w-20 h-20'
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
              <span className={`text-xs font-medium ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
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
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${index < currentStep
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
                <p className={`text-sm ${index <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-500'
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
    <div className={`${className} animate-fade-in`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2 animate-fade-in-up">
          {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
          {showPercentage && !indeterminate && (
            <span className="text-sm text-gray-600 font-mono">
              {Math.round(displayProgress)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${getSizeClasses()} overflow-hidden shadow-sm`}>
        {indeterminate ? (
          <div className={getProgressBarClasses()} style={{ width: '30%' }} />
        ) : (
          <div
            className={getProgressBarClasses()}
            style={{
              width: `${displayProgress}%`,
              '--progress-width': `${displayProgress}%`
            } as React.CSSProperties}
          />
        )}
      </div>

      {/* Success animation */}
      {displayProgress >= 100 && animated && !indeterminate && (
        <div className="mt-2 flex items-center space-x-2 animate-fade-in-up">
          <svg className="h-4 w-4 text-green-500 animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-600 font-medium">Complete!</span>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;