'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/ui/ErrorState'
import { Layout } from '@/components/layout'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Page Error:', error)
    }

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service (e.g., Sentry, LogRocket)
      console.error('Production Error:', {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      })
    }
  }, [error])

  const getErrorMessage = () => {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('database')) {
      return 'We\'re having trouble connecting to our database. Please try again in a moment.'
    }
    
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return 'The request is taking longer than expected. Please try again.'
    }
    
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'We\'re having network connectivity issues. Please check your connection and try again.'
    }
    
    if (error.message.includes('price') || error.message.includes('API')) {
      return 'We\'re having trouble fetching the latest data. Some information might be outdated.'
    }
    
    return 'Something went wrong while loading this page. Please try again.'
  }

  const getSuggestions = () => {
    const suggestions = ['Refresh the page to try again']
    
    if (error.message.includes('database') || error.message.includes('ECONNREFUSED')) {
      suggestions.push('Check if you\'re connected to the internet')
      suggestions.push('Try again in a few minutes')
    }
    
    if (error.message.includes('price') || error.message.includes('API')) {
      suggestions.push('The page will work with cached data')
      suggestions.push('Price data will be updated when services are available')
    }
    
    return suggestions
  }

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState
          title="Page Error"
          message={getErrorMessage()}
          onRetry={reset}
          retryText="Try Again"
          errorCode={error.digest}
          suggestions={getSuggestions()}
          className="max-w-2xl"
        />
      </div>
    </Layout>
  )
}