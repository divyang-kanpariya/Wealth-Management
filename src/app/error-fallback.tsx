import ErrorState from '@/components/ui/ErrorState'
import { Layout } from '@/components/layout'

interface ErrorFallbackProps {
  title?: string
  message?: string
  suggestions?: string[]
  showRetry?: boolean
  onRetry?: () => void
}

export default function ErrorFallback({
  title = "Something went wrong",
  message = "We encountered an error while loading this page.",
  suggestions = [
    "Try refreshing the page",
    "Check your internet connection",
    "Contact support if the issue persists"
  ],
  showRetry = true,
  onRetry
}: ErrorFallbackProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState
          title={title}
          message={message}
          suggestions={suggestions}
          onRetry={showRetry ? handleRetry : undefined}
          retryText="Retry"
          className="max-w-2xl"
        />
      </div>
    </Layout>
  )
}