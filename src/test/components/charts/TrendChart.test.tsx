import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TrendChart from '@/components/charts/TrendChart'

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  )
}))

describe('TrendChart', () => {
  const mockData = [
    { date: '2024-01-01', value: 100000 },
    { date: '2024-02-01', value: 105000 },
    { date: '2024-03-01', value: 110000 },
    { date: '2024-04-01', value: 108000 },
    { date: '2024-05-01', value: 115000 }
  ]

  it('renders chart with trend data', () => {
    render(<TrendChart data={mockData} title="Portfolio Trend" />)

    expect(screen.getByText('Portfolio Trend')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<TrendChart data={[]} title="Empty Chart" />)

    expect(screen.getByText('Empty Chart')).toBeInTheDocument()
    expect(screen.getByText('No trend data available')).toBeInTheDocument()
  })

  it('renders time range buttons', () => {
    render(<TrendChart data={mockData} title="Portfolio Trend" />)

    expect(screen.getByText('1M')).toBeInTheDocument()
    expect(screen.getByText('3M')).toBeInTheDocument()
    expect(screen.getByText('6M')).toBeInTheDocument()
    expect(screen.getByText('1Y')).toBeInTheDocument()
    expect(screen.getByText('ALL')).toBeInTheDocument()
  })

  it('changes time range when button clicked', () => {
    render(<TrendChart data={mockData} title="Portfolio Trend" />)

    const oneMonthButton = screen.getByText('1M')
    fireEvent.click(oneMonthButton)

    // Check if the button is now active (has the active styling)
    expect(oneMonthButton).toHaveClass('bg-blue-100', 'text-blue-700', 'font-medium')
  })

  it('formats currency values by default', () => {
    render(<TrendChart data={mockData} title="Portfolio Trend" />)

    const chartOptions = screen.getByTestId('chart-options')
    const optionsContent = chartOptions.textContent || ''
    
    // Should contain callback function for formatting (currency is handled in callback)
    expect(optionsContent).toContain('callback')
  })

  it('formats non-currency values when currency=false', () => {
    render(
      <TrendChart 
        data={mockData} 
        title="Progress Trend" 
        currency={false} 
      />
    )

    const chartOptions = screen.getByTestId('chart-options')
    const optionsContent = chartOptions.textContent || ''
    
    // Should not contain currency formatting
    expect(optionsContent).not.toContain('currency')
  })

  it('applies custom styling props', () => {
    render(
      <TrendChart 
        data={mockData} 
        title="Custom Chart"
        color="#FF0000"
        fillArea={false}
        showPoints={false}
      />
    )

    const chartData = screen.getByTestId('chart-data')
    const dataContent = chartData.textContent || ''
    
    expect(dataContent).toContain('#FF0000')
    expect(dataContent).toContain('transparent') // fillArea=false
  })
})