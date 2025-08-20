import React from 'react';

export interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'card' | 'table' | 'chart' | 'avatar' | 'button' | 'image' | 'list';
  lines?: number;
  width?: string;
  height?: string;
  animated?: boolean;
  shimmer?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  variant = 'text',
  lines = 1,
  width,
  height,
  animated = true,
  shimmer = true
}) => {
  const baseClasses = `
    skeleton rounded bg-gray-200 
    ${animated ? 'animate-pulse' : ''} 
    ${shimmer ? 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]' : ''}
  `;
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4';
      case 'card':
        return 'h-32 rounded-lg';
      case 'table':
        return 'h-12 rounded-md';
      case 'chart':
        return 'h-64 rounded-lg';
      case 'avatar':
        return 'h-10 w-10 rounded-full';
      case 'button':
        return 'h-10 rounded-md';
      case 'image':
        return 'h-48 rounded-lg';
      case 'list':
        return 'h-16 rounded-md';
      default:
        return 'h-4';
    }
  };

  const style = {
    width: width || (variant === 'avatar' ? undefined : '100%'),
    height: height || undefined
  };

  // Render multiple lines for text variant
  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 animate-stagger ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : '100%',
              animationDelay: `${index * 0.1}s`
            }}
          />
        ))}
      </div>
    );
  }

  // Render list variant with multiple items
  if (variant === 'list' && lines > 1) {
    return (
      <div className={`space-y-3 animate-stagger ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="flex items-center space-x-3" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className={`${baseClasses} h-10 w-10 rounded-full flex-shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className={`${baseClasses} h-4 w-3/4`} />
              <div className={`${baseClasses} h-3 w-1/2`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render card variant with content structure
  if (variant === 'card') {
    return (
      <div className={`${baseClasses} ${getVariantClasses()} p-4 ${className}`} style={style}>
        <div className="animate-stagger space-y-3">
          <div className={`${baseClasses} h-4 w-3/4`} style={{ animationDelay: '0.1s' }} />
          <div className={`${baseClasses} h-3 w-1/2`} style={{ animationDelay: '0.2s' }} />
          <div className="space-y-2">
            <div className={`${baseClasses} h-3 w-full`} style={{ animationDelay: '0.3s' }} />
            <div className={`${baseClasses} h-3 w-5/6`} style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    );
  }

  // Render table variant with rows
  if (variant === 'table') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Header */}
        <div className="flex space-x-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`${baseClasses} h-4 flex-1`} />
          ))}
        </div>
        {/* Rows */}
        <div className="animate-stagger space-y-2">
          {Array.from({ length: lines || 3 }).map((_, index) => (
            <div key={index} className="flex space-x-4" style={{ animationDelay: `${index * 0.1}s` }}>
              {Array.from({ length: 4 }).map((_, colIndex) => (
                <div key={colIndex} className={`${baseClasses} h-8 flex-1`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={style}
    />
  );
};

export default SkeletonLoader;