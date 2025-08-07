import React from 'react';

export interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'card' | 'table' | 'chart' | 'avatar';
  lines?: number;
  width?: string;
  height?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  variant = 'text',
  lines = 1,
  width,
  height
}) => {
  const baseClasses = 'skeleton rounded animate-pulse bg-gray-200';
  
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
      default:
        return 'h-4';
    }
  };

  const style = {
    width: width || (variant === 'avatar' ? undefined : '100%'),
    height: height || undefined
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : '100%'
            }}
          />
        ))}
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