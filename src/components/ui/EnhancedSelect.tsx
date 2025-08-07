import React, { useState, useRef, useEffect } from 'react';
import FormError from './FormError';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface EnhancedSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string | string[];
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  allowCustom?: boolean;
  customOptionLabel?: string;
  onCustomOptionClick?: () => void;
  onChange: (value: string) => void;
}

const EnhancedSelect: React.FC<EnhancedSelectProps> = ({
  label,
  error,
  helperText,
  options,
  placeholder,
  allowCustom = false,
  customOptionLabel = 'Create new...',
  onCustomOptionClick,
  onChange,
  className = '',
  id,
  value,
  ...props
}) => {
  const selectId = id || `enhanced-select-${Math.random().toString(36).substr(2, 9)}`;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const baseSelectClasses = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm cursor-pointer';
  const errorSelectClasses = 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500';
  
  const selectClasses = `${baseSelectClasses} ${error ? errorSelectClasses : ''} ${className}`;

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if the current value exists in options
  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : (value || '');

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomOptionClick = () => {
    if (onCustomOptionClick) {
      onCustomOptionClick();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length === 1) {
        handleOptionSelect(filteredOptions[0].value);
      } else if (allowCustom && filteredOptions.length === 0) {
        handleCustomOptionClick();
      }
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative" ref={selectRef}>
        {/* Display/Trigger */}
        <div
          className={selectClasses}
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
        >
          <div className="flex items-center justify-between py-2 px-3">
            <span className={displayValue ? 'text-gray-900' : 'text-gray-500'}>
              {displayValue || placeholder || 'Select an option'}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            {/* Search input */}
            <div className="p-2 border-b border-gray-200">
              <input
                ref={inputRef}
                type="text"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Options list */}
            <div className="max-h-60 overflow-auto">
              {/* Empty state option */}
              {!value && (
                <div
                  className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleOptionSelect('')}
                >
                  {placeholder || 'No selection'}
                </div>
              )}

              {/* Filtered options */}
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                    option.value === value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                  } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !option.disabled && handleOptionSelect(option.value)}
                >
                  {option.label}
                </div>
              ))}

              {/* Custom option */}
              {allowCustom && onCustomOptionClick && (
                <div
                  className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer border-t border-gray-200 font-medium"
                  onClick={handleCustomOptionClick}
                >
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {customOptionLabel}
                  </div>
                </div>
              )}

              {/* No results */}
              {filteredOptions.length === 0 && searchTerm && !allowCustom && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <FormError error={error} />
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default EnhancedSelect;