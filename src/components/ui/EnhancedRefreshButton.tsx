'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { refreshDashboard, getRefreshStatus, cancelRefresh, quickRefreshSymbols } from '@/app/actions/dashboard'
import { RefreshStatus, RefreshOptions } from '@/types'

export interface EnhancedRefreshButtonProps {
  className?: string
  variant?: 'default' | 'compact' | 'icon-only'
  symbols?: string[]
  showProgress?: boolean
  showDetails?: boolean
  onRefreshStart?: () => void
  onRefreshComplete?: (success: boolean, results?: any) => void
  onRefreshError?: (error: string) => void
  disabled?: boolean
  tooltip?: string
}

export function EnhancedRefreshButton({ 
  className = '',
  variant = 'default',
  symbols,
  showProgress = true,
  showDetails = false,
  onRefreshStart,
  onRefreshComplete,
  onRefreshError,
  disabled = false,
  tooltip
}: EnhancedRefreshButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showProgressDetails, setShowProgressDetails] = useState(false)
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const startProgressPolling = (requestId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusResult = await getRefreshStatus(requestId)
        
        if (statusResult.success && statusResult.status) {
          setRefreshStatus(statusResult.status)
          
          if (statusResult.status.status === 'completed') {
            clearInterval(pollIntervalRef.current!)
            setCurrentRequestId(null)
            setError(null)
            
            const results = statusResult.status.results
            onRefreshComplete?.(true, results)
            setRefreshStatus(null)
          } else if (statusResult.status.status === 'failed') {
            clearInterval(pollIntervalRef.current!)
            setCurrentRequestId(null)
            const errorMsg = statusResult.status.error || 'Refresh failed'
            setError(errorMsg)
            onRefreshError?.(errorMsg)
            setRefreshStatus(null)
          } else if (statusResult.status.status === 'cancelled') {
            clearInterval(pollIntervalRef.current!)
            setCurrentRequestId(null)
            setError('Refresh cancelled')
            setRefreshStatus(null)
          }
        } else {
          // Status not found, stop polling
          clearInterval(pollIntervalRef.current!)
          setCurrentRequestId(null)
          setRefreshStatus(null)
          onRefreshComplete?.(true)
        }
      } catch (error) {
        console.error('Error polling refresh status:', error)
        clearInterval(pollIntervalRef.current!)
        setCurrentRequestId(null)
        const errorMsg = 'Failed to track refresh progress'
        setError(errorMsg)
        onRefreshError?.(errorMsg)
        setRefreshStatus(null)
      }
    }, 1000) // Poll every second
  }

  const handleRefresh = () => {
    if (disabled) return

    startTransition(async () => {
      try {
        setError(null)
        onRefreshStart?.()
        
        let result
        if (symbols && symbols.length > 0) {
          // Quick refresh for specific symbols
          result = await quickRefreshSymbols(symbols)
        } else {
          // Full dashboard refresh
          result = await refreshDashboard()
        }
        
        if (result.success && result.requestId) {
          setCurrentRequestId(result.requestId)
          
          if (showProgress) {
            startProgressPolling(result.requestId)
          } else {
            // Simple mode - assume success after delay
            setTimeout(() => {
              setCurrentRequestId(null)
              onRefreshComplete?.(true)
            }, 3000)
          }
        } else {
          const errorMsg = result.message || 'Failed to start refresh'
          setError(errorMsg)
          onRefreshError?.(errorMsg)
        }
      } catch (error) {
        console.error('Refresh error:', error)
        const errorMsg = 'Refresh failed - please try again'
        setError(errorMsg)
        onRefreshError?.(errorMsg)
      }
    })
  }

  const handleCancel = async () => {
    if (currentRequestId) {
      try {
        await cancelRefresh(currentRequestId)
      } catch (error) {
        console.error('Cancel error:', error)
      }
    }
  }

  const toggleProgressDetails = () => {
    setShowProgressDetails(!showProgressDetails)
  }

  const isRefreshing = isPending || currentRequestId !== null
  const progress = refreshStatus?.progress

  // Button content based on variant
  const getButtonContent = () => {
    const icon = (
      <svg 
        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
        />
      </svg>
    )

    switch (variant) {
      case 'icon-only':
        return icon
      case 'compact':
        return (
          <div className="flex items-center space-x-1">
            {icon}
            <span className="text-xs">
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </span>
          </div>
        )
      default:
        return (
          <div className="flex items-center space-x-2">
            {icon}
            <span>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </div>
        )
    }
  }

  // Button classes based on variant
  const getButtonClasses = () => {
    const baseClasses = `
      bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
      text-white font-medium shadow-lg transition-colors
      ${disabled ? 'cursor-not-allowed opacity-50' : ''}
    `

    switch (variant) {
      case 'icon-only':
        return `${baseClasses} p-2 rounded-full ${className}`
      case 'compact':
        return `${baseClasses} text-xs py-2 px-3 rounded-md ${className}`
      default:
        return `${baseClasses} text-sm py-3 px-4 rounded-full ${className}`
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || disabled}
          className={getButtonClasses()}
          title={tooltip || (symbols ? `Refresh prices for ${symbols.length} symbols` : 'Refresh all prices from API')}
        >
          {getButtonContent()}
        </button>

        {/* Cancel button when refreshing */}
        {currentRequestId && variant !== 'icon-only' && (
          <button
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-2 rounded-full shadow-lg transition-colors"
            title="Cancel refresh operation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Progress details toggle */}
        {showDetails && showProgress && progress && variant !== 'icon-only' && (
          <button
            onClick={toggleProgressDetails}
            className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-2 rounded-full shadow-lg transition-colors"
            title="Toggle progress details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress indicator */}
      {showProgress && progress && variant !== 'icon-only' && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg shadow-lg border p-3 z-50 min-w-64">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {symbols ? `Refreshing ${symbols.length} symbols` : 'Refreshing Prices'} ({progress.completed}/{progress.total})
            </span>
            <span className="text-sm text-gray-500">{progress.percentage}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {progress.currentSymbol && (
            <div className="text-xs text-gray-600 mb-1">
              Current: {progress.currentSymbol}
            </div>
          )}

          {progress.failed > 0 && (
            <div className="text-xs text-red-600">
              {progress.failed} failed
            </div>
          )}

          {/* Detailed progress */}
          {showProgressDetails && refreshStatus && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 space-y-1">
                <div>Status: {refreshStatus.status}</div>
                <div>Started: {new Date(refreshStatus.startTime).toLocaleTimeString()}</div>
                {refreshStatus.endTime && (
                  <div>Ended: {new Date(refreshStatus.endTime).toLocaleTimeString()}</div>
                )}
                {refreshStatus.results && (
                  <div>Duration: {refreshStatus.results.duration}ms</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                        bg-red-600 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg z-50">
          {error}
        </div>
      )}
    </div>
  )
}