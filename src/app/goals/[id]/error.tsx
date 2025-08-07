'use client'

import { useEffect } from 'react'
import ErrorFallback from '../../error-fallback'

interface GoalDetailErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GoalDetailError({ error, reset }: GoalDetailErrorProps) {
  useEffect(() => {
    console.error('Goal detail page error:', error)
  }, [error])

  const getErrorMessage = () => {
    if (error.message.includes('not found') || error.message.includes('404')) {
      return 'The goal you\'re looking for doesn\'t exist or has been removed.'
    }
    
    if (error.message.includes('database') || error.message.includes('ECONNREFUSED')) {
      return 'We\'re having trouble accessing goal data. Please try again in a moment.'
    }
    
    if (error.message.includes('price') || error.message.includes('API')) {
      return 'We\'re having trouble calculating current goal progress. Progress is shown with the last known investment values.'
    }
    
    return 'We encountered an error while loading this goal\'s details. Progress calculations may be temporarily unavailable.'
  }

  const getSuggestions = () => {
    const suggestions = ['Try refreshing the page']
    
    if (error.message.includes('not found')) {
      suggestions.push('Check if the goal ID is correct')
      suggestions.push('Go back to the goals list')
      suggestions.push('Contact support if the goal should exist')
    } else if (error.message.includes('database')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a few minutes')
    } else if (error.message.includes('price')) {
      suggestions.push('Goal progress depends on current investment values')
      suggestions.push('Progress will update when price data is available')
      suggestions.push('Your goal and allocations are safely stored')
    }
    
    return suggestions
  }

  return (
    <ErrorFallback
      title="Goal Details Error"
      message={getErrorMessage()}
      suggestions={getSuggestions()}
      onRetry={reset}
    />
  )
}