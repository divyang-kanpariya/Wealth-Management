'use client'

import { useEffect } from 'react'
import ErrorFallback from '../error-fallback'

interface SIPsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SIPsError({ error, reset }: SIPsErrorProps) {
  useEffect(() => {
    console.error('SIPs page error:', error)
  }, [error])

  return (
    <ErrorFallback
      title="SIP Data Error"
      message="We encountered an error while loading your SIP information. Current values and performance data may be temporarily unavailable."
      suggestions={[
        'Try refreshing the page',
        'SIP values depend on current NAV data',
        'Your SIP records and transactions are safe',
        'Performance calculations will update when data is available'
      ]}
      onRetry={reset}
    />
  )
}