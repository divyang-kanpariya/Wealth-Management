'use client'

import React, { Component, ReactNode } from 'react'
import ErrorState from '@/components/ui/ErrorState'
import { Layout } from '@/components/layout'

interface ServerErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  context?: string
}

interface ServerErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
}

export class ServerErrorBoundary extends Component<
  ServerErrorBoundaryProps,
  ServerErrorBoundaryState
> {
  private readonly maxRetries = 3

  constructor(props: ServerErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ServerErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console and monitoring service
    console.error('[ServerErrorBoundary] Caught error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context || 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      retryCount: this.state.retryCount,
      type: 'client-error-boundary'
    }

    // TODO: Send to actual monitoring service
    console.error('[ERROR BOUNDARY MONITORING]', JSON.stringify(errorData, null, 2))
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    } else {
      // Max retries reached, reload the page
      window.location.reload()
    }
  }

  private getErrorMessage(): string {
    const { error } = this.state
    
    if (!error) {
      return 'An unexpected error occurred while rendering this page.'
    }

    // Classify error types for user-friendly messages
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'There was a problem loading part of the application. This usually happens after an update.'
    }

    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'There was a network error while loading the page. Please check your internet connection.'
    }

    if (error.message.includes('hydration') || error.message.includes('Hydration')) {
      return 'There was a problem initializing the page. This is usually temporary.'
    }

    if (error.message.includes('database') || error.message.includes('server')) {
      return 'There was a server error while loading your data. Please try again.'
    }

    return 'An unexpected error occurred while rendering this page.'
  }

  private getSuggestions(): string[] {
    const { error } = this.state
    const suggestions = ['Try refreshing the page']

    if (!error) {
      return suggestions
    }

    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      suggestions.push('Clear your browser cache')
      suggestions.push('Try using an incognito/private window')
      suggestions.push('The application may have been updated')
    } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a few moments')
    } else if (error.message.includes('hydration')) {
      suggestions.push('Wait a moment and try again')
      suggestions.push('This is usually a temporary issue')
    } else if (error.message.includes('database') || error.message.includes('server')) {
      suggestions.push('The server may be temporarily unavailable')
      suggestions.push('Try again in a few minutes')
    }

    if (this.state.retryCount >= this.maxRetries) {
      suggestions.push('If the problem persists, contact support')
    }

    return suggestions
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      const retryText = this.state.retryCount >= this.maxRetries 
        ? 'Reload Page' 
        : `Try Again ${this.state.retryCount > 0 ? `(${this.state.retryCount}/${this.maxRetries})` : ''}`

      return (
        <Layout>
          <div className="min-h-[60vh] flex items-center justify-center">
            <ErrorState
              title="Page Error"
              message={this.getErrorMessage()}
              suggestions={this.getSuggestions()}
              onRetry={this.handleRetry}
              retryText={retryText}
              errorCode={this.state.error?.name}
              className="max-w-2xl"
            />
          </div>
        </Layout>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easy wrapping
export function withServerErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <ServerErrorBoundary context={context}>
        <Component {...props} />
      </ServerErrorBoundary>
    )
  }
}

export default ServerErrorBoundary