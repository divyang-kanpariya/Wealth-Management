'use client'

import { useState } from 'react'
import { Toggle, Tooltip } from './index'

export interface InflationDisplayProps {
  // Core values
  nominalValue: number
  realValue?: number
  
  // Configuration
  inflationRate?: number
  years?: number
  onInflationRateChange?: (rate: number) => void
  
  // Display options
  showToggle?: boolean
  showRateInput?: boolean
  title?: string
  description?: string
  
  // Labels
  nominalLabel?: string
  realLabel?: string
  
  // Styling
  variant?: 'default' | 'compact' | 'minimal'
  className?: string
}

export function InflationDisplay({
  nominalValue,
  realValue,
  inflationRate = 6,
  years,
  onInflationRateChange,
  showToggle = true,
  showRateInput = true,
  title = "Inflation Impact",
  description,
  nominalLabel = "Future Value",
  realLabel = "Present Value after Inflation",
  variant = 'default',
  className = ''
}: InflationDisplayProps) {
  const [showRealValue, setShowRealValue] = useState(false)
  
  // Calculate real value if not provided
  const calculatedRealValue = realValue ?? (
    years && inflationRate > 0 
      ? nominalValue / Math.pow(1 + inflationRate / 100, years)
      : nominalValue
  )
  
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }
  
  const inflationLoss = nominalValue - calculatedRealValue
  const purchasingPowerLoss = years && inflationRate > 0 
    ? (100 - (100 / Math.pow(1 + inflationRate / 100, years))).toFixed(1)
    : '0'

  if (variant === 'minimal') {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-lg p-3 ${className}`}>
        <div className="flex justify-between items-center text-sm">
          <span className="text-amber-700">{nominalLabel}:</span>
          <span className="font-medium text-amber-900">{formatCurrency(nominalValue)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-amber-700">{realLabel}:</span>
          <span className="font-medium text-amber-900">{formatCurrency(calculatedRealValue)}</span>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-amber-900">{title}</h4>
          {showToggle && (
            <div className="flex items-center space-x-2">
              <span className={`text-xs ${!showRealValue ? 'text-amber-700 font-medium' : 'text-amber-600'}`}>
                Nominal
              </span>
              <Toggle
                checked={showRealValue}
                onChange={setShowRealValue}
                size="sm"
              />
              <span className={`text-xs ${showRealValue ? 'text-amber-700 font-medium' : 'text-amber-600'}`}>
                Real
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-amber-700">{nominalLabel}:</span>
            <span className="font-medium text-amber-900">{formatCurrency(nominalValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-700">{realLabel}:</span>
            <span className="font-medium text-amber-900">{formatCurrency(calculatedRealValue)}</span>
          </div>
          {inflationLoss > 0 && (
            <div className="flex justify-between border-t border-amber-200 pt-2">
              <span className="text-amber-700">Inflation Impact:</span>
              <span className="font-medium text-red-600">-{formatCurrency(inflationLoss)}</span>
            </div>
          )}
        </div>
        
        {years && inflationRate > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            <p className="text-xs text-amber-600">
              After {years} years at {inflationRate}% inflation, you lose {purchasingPowerLoss}% purchasing power.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={`bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-amber-900">{title}</h4>
          {description && (
            <Tooltip content={description}>
              <svg className="w-4 h-4 text-amber-600 hover:text-amber-800 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {showRateInput && onInflationRateChange && (
            <div className="flex items-center space-x-2">
              <label className="text-xs text-amber-700">Rate:</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="15"
                value={inflationRate}
                onChange={(e) => onInflationRateChange(Number(e.target.value))}
                className="w-16 px-2 py-1 text-xs border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-xs text-amber-700">%</span>
            </div>
          )}
          
          {showToggle && (
            <div className="flex items-center space-x-2">
              <span className={`text-xs ${!showRealValue ? 'text-amber-700 font-medium' : 'text-amber-600'}`}>
                Nominal
              </span>
              <Toggle
                checked={showRealValue}
                onChange={setShowRealValue}
                size="sm"
              />
              <span className={`text-xs ${showRealValue ? 'text-amber-700 font-medium' : 'text-amber-600'}`}>
                Real
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-amber-700">{nominalLabel}:</span>
            <span className="font-medium text-amber-900">{formatCurrency(nominalValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-700">{realLabel}:</span>
            <span className="font-medium text-amber-900">{formatCurrency(calculatedRealValue)}</span>
          </div>
          {inflationLoss > 0 && (
            <div className="flex justify-between text-sm border-t border-amber-200 pt-2">
              <span className="text-amber-700">Inflation Loss:</span>
              <span className="font-medium text-red-600">{formatCurrency(inflationLoss)}</span>
            </div>
          )}
        </div>
        
        {years && inflationRate > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-amber-700">Time Period:</span>
              <span className="font-medium text-amber-900">{years} years</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-amber-700">Inflation Rate:</span>
              <span className="font-medium text-amber-900">{inflationRate}% p.a.</span>
            </div>
            <div className="flex justify-between text-sm border-t border-amber-200 pt-2">
              <span className="text-amber-700">Purchasing Power Loss:</span>
              <span className="font-medium text-red-600">{purchasingPowerLoss}%</span>
            </div>
          </div>
        )}
      </div>
      
      {years && inflationRate > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <p className="text-xs text-amber-600">
            <strong>Impact:</strong> Your {nominalLabel.toLowerCase()} of {formatCurrency(nominalValue)} after {years} years will be equivalent to{' '}
            {formatCurrency(calculatedRealValue)} in today&apos;s money after {inflationRate}% inflation.
          </p>
        </div>
      )}
    </div>
  )
}

export default InflationDisplay