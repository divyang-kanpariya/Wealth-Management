'use client'

import { useEffect } from 'react'
import ErrorFallback from '../error-fallback'

interface GoalsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GoalsError({ error, reset }: GoalsErrorProps) {
  useEffect(() => {
    console.error('Goals page error:', error)
  }, [error])

  return (
    <ErrorFallback
      title="Goals Data Error"
      message="We encountered an error while loading your financial goals. Goal progress calculations may be temporarily unavailable."
      suggestions={[
        'Try refreshing the page',
        'Goal progress depends on current investment values',
        'Your goals and allocations are safely stored',
        'Progress will update when price data is available'
      ]}
      onRetry={reset}
    />
  )
}