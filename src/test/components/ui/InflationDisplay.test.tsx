import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InflationDisplay } from '@/components/ui/InflationDisplay'

describe('InflationDisplay', () => {
  it('should render minimal variant correctly', () => {
    render(
      <InflationDisplay
        nominalValue={100000}
        realValue={80000}
        variant="minimal"
      />
    )

    expect(screen.getByText('Future Value:')).toBeInTheDocument()
    expect(screen.getByText('Present Value after Inflation:')).toBeInTheDocument()
    expect(screen.getByText('₹1,00,000')).toBeInTheDocument()
    expect(screen.getByText('₹80,000')).toBeInTheDocument()
  })

  it('should render compact variant with toggle', () => {
    render(
      <InflationDisplay
        nominalValue={100000}
        realValue={80000}
        variant="compact"
        showToggle={true}
        title="Test Inflation"
      />
    )

    expect(screen.getByText('Test Inflation')).toBeInTheDocument()
    expect(screen.getByText('Nominal')).toBeInTheDocument()
    expect(screen.getByText('Real')).toBeInTheDocument()
    expect(screen.getByText('Inflation Impact:')).toBeInTheDocument()
    expect(screen.getByText('-₹20,000')).toBeInTheDocument()
  })

  it('should render default variant with rate input', () => {
    const onRateChange = vi.fn()
    
    render(
      <InflationDisplay
        nominalValue={100000}
        inflationRate={6}
        years={10}
        onInflationRateChange={onRateChange}
        showRateInput={true}
        variant="default"
      />
    )

    expect(screen.getByText('Inflation Impact')).toBeInTheDocument()
    expect(screen.getByText('Rate:')).toBeInTheDocument()
    
    const rateInput = screen.getByDisplayValue('6')
    expect(rateInput).toBeInTheDocument()
    
    fireEvent.change(rateInput, { target: { value: '7' } })
    expect(onRateChange).toHaveBeenCalledWith(7)
  })

  it('should calculate real value when not provided', () => {
    render(
      <InflationDisplay
        nominalValue={100000}
        inflationRate={6}
        years={10}
        variant="minimal"
      />
    )

    // Real value should be calculated: 100000 / (1.06)^10 ≈ 55,839
    expect(screen.getByText(/₹55,839/)).toBeInTheDocument()
  })

  it('should show purchasing power loss information', () => {
    render(
      <InflationDisplay
        nominalValue={100000}
        inflationRate={6}
        years={10}
        variant="compact"
      />
    )

    expect(screen.getByText(/After 10 years at 6% inflation, you lose/)).toBeInTheDocument()
    expect(screen.getByText(/44.2% purchasing power/)).toBeInTheDocument()
  })

  it('should handle custom labels', () => {
    render(
      <InflationDisplay
        nominalValue={100000}
        realValue={80000}
        nominalLabel="Custom Future"
        realLabel="Custom Present"
        variant="minimal"
      />
    )

    expect(screen.getByText('Custom Future:')).toBeInTheDocument()
    expect(screen.getByText('Custom Present:')).toBeInTheDocument()
  })
})