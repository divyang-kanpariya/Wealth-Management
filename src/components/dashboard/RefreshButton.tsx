'use client'

import { useState, useTransition } from 'react'
import { refreshDashboard, forceRefreshDashboard } from '@/app/actions/dashboard'

interface RefreshButtonProps {
  variant?: 'normal' | 'force'
  className?: string
}

export function RefreshButton({ variant = 'normal', className = '' }: RefreshButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [message, setMessage] = useState<string>('')

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const result = variant === 'force' 
          ? await forceRefreshDashboard()
          : await refreshDashboard()
        
        if (result.success) {
          setLastRefresh(new Date())
          setMessage('Dashboard refreshed!')
          setTimeout(() => setMessage(''), 3000)
        } else {
          setMessage(result.message || 'Refresh failed')
          setTimeout(() => setMessage(''), 5000)
        }
      } catch (error) {
        setMessage('Refresh failed')
        setTimeout(() => setMessage(''), 5000)
      }
    })
  }

  return (
    <div className="relative">
      <button
        onClick={handleRefresh}
        disabled={isPending}
        className={`
          bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
          text-white text-sm font-medium py-3 px-4 rounded-full 
          shadow-lg transition-colors flex items-center space-x-2
          ${className}
        `}
        title={variant === 'force' ? 'Force Refresh Dashboard' : 'Refresh Dashboard'}
      >
        <svg 
          className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} 
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
          {isPending 
            ? 'Refreshing...' 
            : variant === 'force' 
              ? 'Force Refresh' 
              : 'Refresh'
          }
        </span>
      </button>
      
      {message && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                        bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {message}
        </div>
      )}
      
      {lastRefresh && !message && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                        bg-gray-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}