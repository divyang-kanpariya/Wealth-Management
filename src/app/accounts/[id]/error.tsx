'use client'

import { useEffect } from 'react'
import ErrorFallback from '../../error-fallback'

interface AccountDetailErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AccountDetailError({ error, reset }: AccountDetailErrorProps) {
  useEffect(() => {
    console.error('Account detail page error:', error)
  }, [error])

  const getErrorMessage = () => {
    if (error.message.includes('not found') || error.message.includes('404')) {
      return 'The account you\'re looking for doesn\'t exist or has been removed.'
    }
    
    if (error.message.includes('database') || error.message.includes('ECONNREFUSED')) {
      return 'We\'re having trouble accessing account data. Please try again in a moment.'
    }
    
    if (error.message.includes('price') || error.message.includes('API')) {
      return 'We\'re having trouble fetching the latest investment values for this account. Account details are shown with the last known values.'
    }
    
    return 'We encountered an error while loading this account\'s details. Some information may be temporarily unavailable.'
  }

  const getSuggestions = () => {
    const suggestions = ['Try refreshing the page']
    
    if (error.message.includes('not found')) {
      suggestions.push('Check if the account ID is correct')
      suggestions.push('Go back to the accounts list')
      suggestions.push('Contact support if the account should exist')
    } else if (error.message.includes('database')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a few minutes')
    } else if (error.message.includes('price')) {
      suggestions.push('Investment values will update when price services are available')
      suggestions.push('Your account records are safe and will be restored')
    }
    
    return suggestions
  }

  return (
    <ErrorFallback
      title="Account Details Error"
      message={getErrorMessage()}
      suggestions={getSuggestions()}
      onRetry={reset}
    />
  )
}