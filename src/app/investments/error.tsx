'use client'

import { useEffect } from 'react'
import ErrorFallback from '../error-fallback'

interface InvestmentsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function InvestmentsError({ error, reset }: InvestmentsErrorProps) {
  useEffect(() => {
    console.error('Investments page error:', error)
  }, [error])

  const getErrorMessage = () => {
    if (error.message.includes('price') || error.message.includes('API')) {
      return 'We\'re having trouble fetching the latest investment prices. Your investments are shown with the last known values.'
    }
    
    if (error.message.includes('database')) {
      return 'We\'re having trouble accessing your investment data. Please try again in a moment.'
    }
    
    return 'We encountered an error while loading your investments. Some data may be temporarily unavailable.'
  }

  const getSuggestions = () => {
    const suggestions = ['Try refreshing the page']
    
    if (error.message.includes('price')) {
      suggestions.push('Investment values will update when price services are available')
      suggestions.push('Your investment records are safe and will be restored')
    }
    
    if (error.message.includes('database')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a few minutes')
    }
    
    return suggestions
  }

  return (
    <ErrorFallback
      title="Investment Data Error"
      message={getErrorMessage()}
      suggestions={getSuggestions()}
      onRetry={reset}
    />
  )
}