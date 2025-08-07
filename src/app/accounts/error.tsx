'use client'

import { useEffect } from 'react'
import ErrorFallback from '../error-fallback'

interface AccountsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AccountsError({ error, reset }: AccountsErrorProps) {
  useEffect(() => {
    console.error('Accounts page error:', error)
    
    // Send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      console.error('[ACCOUNTS ERROR]', {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        page: 'accounts',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      })
    }
  }, [error])

  const getErrorMessage = () => {
    if (error.message.includes('database') || error.message.includes('ECONNREFUSED')) {
      return 'We\'re having trouble accessing your account data. Please try again in a moment.'
    }
    
    if (error.message.includes('price') || error.message.includes('API')) {
      return 'We\'re having trouble fetching the latest investment values for your accounts. Account balances are shown with the last known values.'
    }
    
    if (error.message.includes('calculation') || error.message.includes('processing')) {
      return 'We encountered an error while calculating account summaries. Some calculations may be temporarily unavailable.'
    }
    
    return 'We encountered an error while loading your account information. Account balances and summaries may be temporarily unavailable.'
  }

  const getSuggestions = () => {
    const suggestions = ['Try refreshing the page']
    
    if (error.message.includes('database')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a few minutes')
    } else if (error.message.includes('price')) {
      suggestions.push('Account balances depend on current investment values')
      suggestions.push('Your account records are safely stored')
      suggestions.push('Balances will update when price data is available')
    } else if (error.message.includes('calculation')) {
      suggestions.push('Account summaries depend on current price data')
      suggestions.push('Calculations will update when all data is available')
    } else {
      suggestions.push('Account totals depend on current investment values')
      suggestions.push('Your account records are safely stored')
      suggestions.push('Balances will update when price data is available')
    }
    
    return suggestions
  }

  return (
    <ErrorFallback
      title="Account Data Error"
      message={getErrorMessage()}
      suggestions={getSuggestions()}
      onRetry={reset}
    />
  )
}