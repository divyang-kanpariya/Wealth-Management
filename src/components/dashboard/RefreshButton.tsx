'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { refreshDashboard, getRefreshStatus, cancelRefresh } from '@/app/actions/dashboard'
import { RefreshStatus, RefreshProgress } from '@/types'

interface RefreshButtonProps {
  className?: string
  showProgress?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export function RefreshButton({ 
  className = '', 
  showProgress = true,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes default
}: RefreshButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [message, setMessage] = useState<string>('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null)
  const [showProgressDetails, setShowProgressDetails] = useState(false)
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setMessageWithTimeout = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info', duration = 5000) => {
    setMessage(msg)
    setMessageType(type)
    
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current)
    }
    
    messageTimeoutRef.current = setTimeout(() => {
      setMessage('')
    }, duration)
  }, [])

  const startProgressPolling = useCallback((requestId: string) => {
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
            setLastRefresh(new Date())
            
            const results = statusResult.status.results
            if (results) {
              setMessageWithTimeout(
                `Refresh completed: ${results.success} success, ${results.failed} failed (${results.duration}ms)`,
                results.failed > 0 ? 'error' : 'success',
                results.failed > 0 ? 8000 : 5000
              )
            } else {
              setMessageWithTimeout('Refresh completed successfully', 'success')
            }
            
            setRefreshStatus(null)
          } else if (statusResult.status.status === 'failed') {
            clearInterval(pollIntervalRef.current!)
            setCurrentRequestId(null)
            setMessageWithTimeout(
              `Refresh failed: ${statusResult.status.error || 'Unknown error'}`,
              'error',
              8000
            )
            setRefreshStatus(null)
          } else if (statusResult.status.status === 'cancelled') {
            clearInterval(pollIntervalRef.current!)
            setCurrentRequestId(null)
            setMessageWithTimeout('Refresh cancelled', 'info')
            setRefreshStatus(null)
          }
        } else {
          // Status not found, stop polling
          clearInterval(pollIntervalRef.current!)
          setCurrentRequestId(null)
          setRefreshStatus(null)
        }
      } catch (error) {
        console.error('Error polling refresh status:', error)
        clearInterval(pollIntervalRef.current!)
        setCurrentRequestId(null)
        setMessageWithTimeout('Failed to track refresh progress', 'error')
        setRefreshStatus(null)
      }
    }, 1000) // Poll every second
  }, [setMessageWithTimeout])

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      try {
        setMessageWithTimeout('Starting fresh price refresh...', 'info')
        
        const result = await refreshDashboard()
        
        if (result.success && result.requestId) {
          setCurrentRequestId(result.requestId)
          setMessageWithTimeout('Fetching fresh prices from API...', 'info')
          
          if (showProgress) {
            startProgressPolling(result.requestId)
          } else {
            // Simple mode - just show completion after delay
            setTimeout(() => {
              setCurrentRequestId(null)
              setLastRefresh(new Date())
              setMessageWithTimeout('Fresh prices fetched successfully!', 'success')
            }, 3000)
          }
        } else {
          setMessageWithTimeout(result.message || 'Failed to start refresh', 'error')
        }
      } catch (error) {
        console.error('Refresh error:', error)
        setMessageWithTimeout('Refresh failed - please try again', 'error')
      }
    })
  }, [startTransition, setMessageWithTimeout, showProgress, startProgressPolling])

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      autoRefreshIntervalRef.current = setInterval(() => {
        if (!isPending && !currentRequestId) {
          handleRefresh()
        }
      }, refreshInterval)
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, isPending, currentRequestId, handleRefresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  const handleCancel = async () => {
    if (currentRequestId) {
      try {
        const result = await cancelRefresh(currentRequestId)
        if (result.success) {
          setMessageWithTimeout('Refresh cancelled', 'info')
        } else {
          setMessageWithTimeout('Could not cancel refresh', 'error')
        }
      } catch (error) {
        console.error('Cancel error:', error)
        setMessageWithTimeout('Failed to cancel refresh', 'error')
      }
    }
  }

  const toggleProgressDetails = () => {
    setShowProgressDetails(!showProgressDetails)
  }

  const isRefreshing = isPending || currentRequestId !== null
  const progress = refreshStatus?.progress

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`
            bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
            text-white text-sm font-medium py-3 px-4 rounded-full 
            shadow-lg transition-colors flex items-center space-x-2
            ${className}
          `}
          title="Refresh Dashboard with Fresh Prices from API"
        >
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
          <span>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </span>
        </button>

        {/* Cancel button when refreshing */}
        {currentRequestId && (
          <button
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-3 px-3 rounded-full shadow-lg transition-colors"
            title="Cancel refresh operation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Progress details toggle */}
        {showProgress && progress && (
          <button
            onClick={toggleProgressDetails}
            className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-3 px-3 rounded-full shadow-lg transition-colors"
            title="Toggle progress details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && progress && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg shadow-lg border p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Refreshing Prices ({progress.completed}/{progress.total})
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
      
      {/* Status message */}
      {message && (
        <div className={`
          absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
          text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg z-50
          ${messageType === 'success' ? 'bg-green-600' : 
            messageType === 'error' ? 'bg-red-600' : 'bg-gray-800'}
        `}>
          {message}
        </div>
      )}
      
      {/* Last refresh time */}
      {lastRefresh && !message && !isRefreshing && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                        bg-gray-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}