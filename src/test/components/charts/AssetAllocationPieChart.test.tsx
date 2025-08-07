import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import AssetAllocationPieChart from '@/components/charts/AssetAllocationPieChart'

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Pie: ({ data, options }: any) => (
    <div data-testid="pie-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  )
}))

describe('AssetAllocationPieChart', () => {
  const mockAssetAllocation = {
    STOCK: { value: 100000, percentage: 50 },
    MUTUAL_FUND: { value: 75000, percentage: 37.5 },
    GOLD: { value: 25000, percentage: 12.5 }
  }

  beforeEach(() => {
    // Reset any mocks
  })

  it('renders chart with asset allocation data', () => {
    render(<AssetAllocationPieChart assetAllocation={mockAssetAllocation} />)

    expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<AssetAllocationPieChart assetAllocation={{}} />)

    expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
    expect(screen.getByText('No asset allocation data')).toBeInTheDocument()
  })

  it('formats asset type labels correctly', () => {
    render(<AssetAllocationPieChart assetAllocation={mockAssetAllocation} />)

    const chartData = screen.getByTestId('chart-data')
    const dataContent = chartData.textContent || ''
    
    expect(dataContent).toContain('Stocks')
    expect(dataContent).toContain('Mutual Funds')
    expect(dataContent).toContain('Gold')
  })

  it('includes correct data values', () => {
    render(<AssetAllocationPieChart assetAllocation={mockAssetAllocation} />)

    const chartData = screen.getByTestId('chart-data')
    const dataContent = chartData.textContent || ''
    
    expect(dataContent).toContain('100000')
    expect(dataContent).toContain('75000')
    expect(dataContent).toContain('25000')
  })

  it('applies custom height', () => {
    const { container } = render(
      <AssetAllocationPieChart 
        assetAllocation={mockAssetAllocation} 
        height="500px" 
      />
    )

    const chartContainer = container.querySelector('div[style*="height: 500px"]')
    expect(chartContainer).toBeInTheDocument()
  })
})