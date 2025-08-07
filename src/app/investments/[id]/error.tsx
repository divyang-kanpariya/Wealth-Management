'use client'

import { useEffect } from 'react'
import ErrorFallback from '../../error-fallback'

interface InvestmentDetailErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function InvestmentDetailError({ error, reset }: InvestmentDetailErrorProps) {
  useEffect(() => {
    console.error('Investment detail page error:', error)
  }, [error])

  return (
    <ErrorFallback
      title="Investment Details Error"
      message="We couldn't load the details for this investment. The investment may not exist or there may be a temporary issue."
      suggestions={[
        'Check if the investment ID is correct',
        'Try going back to the investments list',
        'Refresh the page to try again',
        'Contact support if the investment should exist'
      ]}
      onRetry={reset}
    />
  )
}