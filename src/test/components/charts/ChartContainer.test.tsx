import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ChartContainer from '@/components/charts/ChartContainer'

describe('ChartContainer', () => {
  it('renders title and children correctly', () => {
    render(
      <ChartContainer title="Test Chart">
        <div data-testid="chart-content">Chart Content</div>
      </ChartContainer>
    )

    expect(screen.getByText('Test Chart')).toBeInTheDocument()
    expect(screen.getByTestId('chart-content')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <ChartContainer title="Test Chart" loading={true}>
        <div>Chart Content</div>
      </ChartContainer>
    )

    expect(screen.getByText('Loading chart...')).toBeInTheDocument()
    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument()
  })

  it('shows error state', () => {
    render(
      <ChartContainer title="Test Chart" error="Failed to load data">
        <div>Chart Content</div>
      </ChartContainer>
    )

    expect(screen.getByText('Chart Error')).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(
      <ChartContainer 
        title="Test Chart" 
        actions={<button>Action Button</button>}
      >
        <div>Chart Content</div>
      </ChartContainer>
    )

    expect(screen.getByText('Action Button')).toBeInTheDocument()
  })

  it('applies custom height', () => {
    const { container } = render(
      <ChartContainer title="Test Chart" height="500px">
        <div>Chart Content</div>
      </ChartContainer>
    )

    const chartDiv = container.querySelector('div[style*="height: 500px"]')
    expect(chartDiv).toBeInTheDocument()
  })
})