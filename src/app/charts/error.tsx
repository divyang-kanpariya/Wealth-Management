'use client'

import { useEffect } from 'react'
import ErrorFallback from '../error-fallback'

interface ChartsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ChartsError({ error, reset }: ChartsErrorProps) {
  useEffect(() => {
    console.error('Charts page error:', error)
  }, [error])

  return (
    <ErrorFallback
      title="Charts Data Error"
      message="We encountered an error while preparing your investment charts. Some chart data may be temporarily unavailable."
      suggestions={[
        'Try refreshing the page',
        'Charts require data from multiple sources',
        'Some charts may work even if others don\'t',
        'Historical data will be restored when services are available'
      ]}
      onRetry={reset}
    />
  )
}