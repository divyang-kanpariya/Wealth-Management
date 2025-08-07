'use client'

import React from 'react'
import { CompactCard } from '@/components/ui'

interface ChartContainerProps {
  title: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  loading?: boolean
  error?: string
  height?: string
}

export default function ChartContainer({
  title,
  children,
  className = '',
  actions,
  loading = false,
  error,
  height = '300px'
}: ChartContainerProps) {
  if (loading) {
    return (
      <CompactCard title={title} className={className} actions={actions}>
        <div 
          className="flex items-center justify-center bg-gray-50 rounded-lg"
          style={{ height }}
        >
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-sm">Loading chart...</span>
          </div>
        </div>
      </CompactCard>
    )
  }

  if (error) {
    return (
      <CompactCard title={title} className={className} actions={actions}>
        <div 
          className="flex items-center justify-center bg-red-50 rounded-lg"
          style={{ height }}
        >
          <div className="text-center text-red-600">
            <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium">Chart Error</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      </CompactCard>
    )
  }

  return (
    <CompactCard title={title} className={className} actions={actions}>
      <div style={{ height }} className="relative">
        {children}
      </div>
    </CompactCard>
  )
}