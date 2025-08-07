'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/ui/ErrorState'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log critical error
    console.error('Global Error:', error)
    
    // Send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service
      console.error('Critical Production Error:', {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        type: 'global-error'
      })
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <ErrorState
            title="Application Error"
            message="A critical error occurred in the application. Please refresh the page or contact support if the problem persists."
            onRetry={reset}
            retryText="Restart Application"
            errorCode={error.digest}
            suggestions={[
              'Refresh your browser',
              'Clear your browser cache',
              'Try using a different browser',
              'Contact support if the issue persists'
            ]}
            fullScreen={true}
          />
        </div>
      </body>
    </html>
  )
}