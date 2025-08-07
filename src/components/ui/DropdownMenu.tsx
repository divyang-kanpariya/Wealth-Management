import React, { useState, useRef, useEffect } from 'react';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  separator?: boolean;
}

export interface DropdownMenuProps {
  items: DropdownMenuItem[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  trigger?: React.ReactNode;
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  className = '',
  size = 'md',
  trigger,
  placement = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const placementClasses = {
    'bottom-left': 'top-full left-0 mt-1',
    'bottom-right': 'top-full right-0 mt-1',
    'top-left': 'bottom-full left-0 mb-1',
    'top-right': 'bottom-full right-0 mb-1'
  };

  const defaultTrigger = (
    <button
      ref={triggerRef}
      onClick={() => setIsOpen(!isOpen)}
      className={`
        ${sizeClasses[size]}
        text-gray-400 hover:text-gray-600 hover:bg-gray-100 
        rounded-full transition-colors duration-200 
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
        ${isOpen ? 'bg-gray-100 text-gray-600' : ''}
      `}
      aria-label="More actions"
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      <svg className={iconSizeClasses[size]} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    </button>
  );

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
      ) : (
        defaultTrigger
      )}

      {isOpen && (
        <div className={`
          absolute z-50 ${placementClasses[placement]}
          bg-white border border-gray-200 rounded-lg shadow-lg
          min-w-48 py-1
          animate-in fade-in-0 zoom-in-95 duration-100
        `}>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {item.separator && index > 0 && (
                <div className="border-t border-gray-100 my-1" />
              )}
              <button
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`
                  w-full px-3 py-2 text-left text-sm
                  flex items-center space-x-3
                  transition-colors duration-150
                  ${item.disabled 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : item.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                  focus:outline-none focus:bg-gray-50
                `}
              >
                <span className={`flex-shrink-0 ${iconSizeClasses[size]}`}>
                  {item.icon}
                </span>
                <span className="truncate">
                  {item.label}
                </span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;