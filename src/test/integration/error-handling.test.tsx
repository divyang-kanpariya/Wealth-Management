import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorAwarePage } from '@/components/server/ErrorAwarePage'
import { PageDataBase } from '@/lib/server/data-preparators/base'

// Mock the Layout component
vi.mock('@/components/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  )
}))

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ErrorAwarePage', () => {
    it('should render children when no errors', () => {
      const mockData: PageDataBase = {
        timestamp: new Date(),
        hasErrors: false
      }

      render(
        <ErrorAwarePage data={mockData}>
          <div data-testid="page-content">Page content</div>
        </ErrorAwarePage>
      )

      expect(screen.getByTestId('page-content')).toBeInTheDocument()
      expect(screen.queryByText(/Notice:/)).not.toBeInTheDocument()
    })

    it('should show warning banner for degraded data', () => {
      const mockData: PageDataBase = {
        timestamp: new Date(),
        hasErrors: true,
        degradedData: true,
        errorMessages: ['Price data temporarily not available']
      }

      render(
        <ErrorAwarePage data={mockData}>
          <div data-testid="page-content">Page content</div>
        </ErrorAwarePage>
      )

      expect(screen.getByTestId('page-content')).toBeInTheDocument()
      expect(screen.getByText(/Notice:/)).toBeInTheDocument()
      expect(screen.getByText(/Some data may be outdated/)).toBeInTheDocument()
      expect(screen.getByText(/Price data temporarily not available/)).toBeInTheDocument()
    })

    it('should show error state for critical errors', () => {
      const mockData: PageDataBase = {
        timestamp: new Date(),
        hasErrors: true,
        errorMessages: ['Database connection failed', 'Service unavailable']
      }

      render(
        <ErrorAwarePage data={mockData}>
          <div data-testid="page-content">Page content</div>
        </ErrorAwarePage>
      )

      expect(screen.queryByTestId('page-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('error-state-container')).toBeInTheDocument()
      expect(screen.getByText(/Data Loading Issues/)).toBeInTheDocument()
    })

    it('should use custom error messages', () => {
      const mockData: PageDataBase = {
        timestamp: new Date(),
        hasErrors: true,
        errorMessages: ['Database connection unavailable']
      }

      render(
        <ErrorAwarePage 
          data={mockData}
          fallbackTitle="Custom Error Title"
          fallbackMessage="Custom error message"
        >
          <div data-testid="page-content">Page content</div>
        </ErrorAwarePage>
      )

      expect(screen.getByText('Custom Error Title')).toBeInTheDocument()
      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })
  })
})