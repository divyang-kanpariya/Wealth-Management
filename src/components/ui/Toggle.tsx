'use client'

import { useState } from 'react'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className = ''
}: ToggleProps) {
  const sizeClasses = {
    sm: 'h-4 w-7',
    md: 'h-5 w-9',
    lg: 'h-6 w-11'
  }

  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const translateClasses = {
    sm: checked ? 'translate-x-3' : 'translate-x-0.5',
    md: checked ? 'translate-x-4' : 'translate-x-0.5',
    lg: checked ? 'translate-x-5' : 'translate-x-0.5'
  }

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
          ${sizeClasses[size]}
          ${checked 
            ? 'bg-blue-600' 
            : 'bg-gray-200'
          }
        `}
      >
        <span
          className={`
            pointer-events-none inline-block rounded-full bg-white shadow transform 
            ring-0 transition duration-200 ease-in-out
            ${thumbSizeClasses[size]}
            ${translateClasses[size]}
          `}
        />
      </button>
      
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label 
              className={`
                block text-sm font-medium cursor-pointer
                ${disabled ? 'text-gray-400' : 'text-gray-700'}
              `}
              onClick={() => !disabled && onChange(!checked)}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={`text-xs mt-1 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

