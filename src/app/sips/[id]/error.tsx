'use client'

import { useEffect } from 'react'
import ErrorFallback from '../../error-fallback'

interface SIPDetailErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SIPDetailError({ error, reset }: SIPDetailErrorProps) {
  useEffect(() => {
    console.error('SIP detail page error:', error)
  }, [error])

  const getErrorMessage = () => {
    if (error.message.includes('not found') || error.message.includes('404')) {
      return 'The SIP you\'re looking for doesn\'t exist or has been removed.'
    }
    
    if (error.message.includes('database') || error.message.includes('ECONNREFUSED')) {
      return 'We\'re having trouble accessing SIP data. Please try again in a moment.'
    }
    
    if (error.message.includes('price') || error.message.includes('API') || error.message.includes('NAV')) {
      return 'We\'re having trouble fetching the latest NAV data for this SIP. Current values are shown with the last known NAV.'
    }
    
    return 'We encountered an error while loading this SIP\'s details. Performance calculations may be temporarily unavailable.'
  }

  const getSuggestions = () => {
    const suggestions = ['Try refreshing the page']
    
    if (error.message.includes('not found')) {
      suggestions.push('Check if the SIP ID is correct')
      suggestions.push('Go back to the SIPs list')
      suggestions.push('Contact support if the SIP should exist')
    } else if (error.message.includes('database')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a few minutes')
    } else if (error.message.includes('price') || error.message.includes('NAV')) {
      suggestions.push('SIP values depend on current NAV data')
      suggestions.push('Performance calculations will update when NAV data is available')
      suggestions.push('Your SIP records and transactions are safe')
    }
    
    return suggestions
  }

  return (
    <ErrorFallback
      title="SIP Details Error"
      message={getErrorMessage()}
      suggestions={getSuggestions()}
      onRetry={reset}
    />
  )
}