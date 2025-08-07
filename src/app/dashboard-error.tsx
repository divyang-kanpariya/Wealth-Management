'use client'

import { useEffect } from 'react'
import ErrorFallback from './error-fallback'

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error('Dashboard page error:', error)
  }, [error])

  const getErrorMessage = () => {
    if (error.message.includes('database') || error.message.includes('ECONNREFUSED')) {
      return 'We\'re having trouble accessing your portfolio data. Please try again in a moment.'
    }
    
    if (error.message.includes('price') || error.message.includes('API')) {
      return 'We\'re having trouble fetching the latest investment prices. Your dashboard is shown with the last known values.'
    }
    
    if (error.message.includes('calculation') || error.message.includes('processing')) {
      return 'We encountered an error while calculating your portfolio metrics. Some calculations may be temporarily unavailable.'
    }
    
    return 'We encountered an error while loading your dashboard. Some data may be temporarily unavailable.'
  }

  const getSuggestions = () => {
    const suggestions = ['Try refreshing the page']
    
    if (error.message.includes('database')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a few minutes')
    } else if (error.message.includes('price')) {
      suggestions.push('Portfolio values will update when price services are available')
      suggestions.push('Your investment records are safe and will be restored')
      suggestions.push('Historical data and trends are preserved')
    } else if (error.message.includes('calculation')) {
      suggestions.push('Portfolio calculations depend on current price data')
      suggestions.push('Metrics will update when all data is available')
    }
    
    return suggestions
  }

  return (
    <ErrorFallback
      title="Dashboard Error"
      message={getErrorMessage()}
      suggestions={getSuggestions()}
      onRetry={reset}
    />
  )
}