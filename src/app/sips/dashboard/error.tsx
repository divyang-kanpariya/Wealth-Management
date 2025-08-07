'use client'

import { useEffect } from 'react'
import ErrorFallback from '../../error-fallback'

interface SIPDashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SIPDashboardError({ error, reset }: SIPDashboardErrorProps) {
  useEffect(() => {
    console.error('SIP dashboard page error:', error)
  }, [error])

  const getErrorMessage = () => {
    if (error.message.includes('database') || error.message.includes('ECONNREFUSED')) {
      return 'We\'re having trouble accessing SIP dashboard data. Please try again in a moment.'
    }
    
    if (error.message.includes('price') || error.message.includes('API') || error.message.includes('NAV')) {
      return 'We\'re having trouble fetching the latest NAV data for your SIPs. Dashboard is shown with the last known values.'
    }
    
    return 'We encountered an error while loading your SIP dashboard. Some analytics may be temporarily unavailable.'
  }

  const getSuggestions = () => {
    const suggestions = ['Try refreshing the page']
    
    if (error.message.includes('database')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a few minutes')
    } else if (error.message.includes('price') || error.message.includes('NAV')) {
      suggestions.push('SIP analytics depend on current NAV data')
      suggestions.push('Dashboard will update when NAV data is available')
      suggestions.push('Your SIP records are safe and will be restored')
    }
    
    return suggestions
  }

  return (
    <ErrorFallback
      title="SIP Dashboard Error"
      message={getErrorMessage()}
      suggestions={getSuggestions()}
      onRetry={reset}
    />
  )
}