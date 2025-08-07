import { ReactNode } from 'react'
import { PageDataBase } from '@/lib/server/data-preparators/base'
import ErrorState from '@/components/ui/ErrorState'

interface ErrorAwarePageProps {
  data: PageDataBase
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
}

export function ErrorAwarePage({ 
  data, 
  children, 
  fallbackTitle = "Data Loading Issues",
  fallbackMessage = "Some data could not be loaded, but we're showing what's available."
}: ErrorAwarePageProps) {
  // If there are critical errors that prevent rendering, show error state
  if (data.hasErrors && data.errorMessages?.some(msg => 
    msg.includes('database') || msg.includes('critical') || msg.includes('unavailable')
  )) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState
          title={fallbackTitle}
          message={fallbackMessage}
          suggestions={[
            'Try refreshing the page',
            'Some data may be temporarily unavailable',
            'Contact support if the issue persists'
          ]}
        />
      </div>
    )
  }

  return (
    <>
      {/* Show warning banner for degraded data */}
      {data.degradedData && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Notice:</strong> Some data may be outdated or unavailable due to temporary service issues.
                {data.errorMessages && data.errorMessages.length > 0 && (
                  <span className="block mt-1 text-xs">
                    {data.errorMessages.join(', ')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {children}
    </>
  )
}

// Higher-order component for wrapping pages with error handling
export function withErrorHandling<T extends PageDataBase>(
  Component: React.ComponentType<{ data: T }>,
  errorConfig?: {
    fallbackTitle?: string
    fallbackMessage?: string
  }
) {
  return function ErrorAwareComponent({ data, ...props }: { data: T }) {
    return (
      <ErrorAwarePage 
        data={data} 
        fallbackTitle={errorConfig?.fallbackTitle}
        fallbackMessage={errorConfig?.fallbackMessage}
      >
        <Component data={data} {...props} />
      </ErrorAwarePage>
    )
  }
}