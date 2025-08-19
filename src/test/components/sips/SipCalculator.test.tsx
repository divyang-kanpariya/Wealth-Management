import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SipCalculator } from '@/components/sips/SipCalculator'

// Mock the UI components
vi.mock('@/components/ui', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input 
      value={value} 
      onChange={onChange}
      data-testid={props['data-testid'] || 'input'}
      {...props}
    />
  ),
  Select: ({ value, onChange, options, ...props }: any) => (
    <select 
      value={value} 
      onChange={onChange}
      data-testid={props['data-testid'] || 'select'}
      {...props}
    >
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid={props['data-testid'] || 'button'} {...props}>
      {children}
    </button>
  ),
  CompactCard: ({ title, children }: any) => (
    <div data-testid="compact-card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  ),
  DataGrid: ({ items }: any) => (
    <div data-testid="data-grid">
      {items?.map((item: any, index: number) => (
        <div key={index}>
          {item.label}: {item.value}
        </div>
      ))}
    </div>
  )
}))

describe('SipCalculator', () => {
  const mockOnResults = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render SIP calculator with default values', () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    expect(screen.getByText('What do you want to calculate?')).toBeInTheDocument()
    expect(screen.getByText('Monthly amount needed for target')).toBeInTheDocument()
    expect(screen.getByText('Target amount from monthly investment')).toBeInTheDocument()
  })

  it('should show target amount input when target calculation is selected', () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    expect(screen.getByText('Target Amount (₹)')).toBeInTheDocument()
  })

  it('should show monthly amount input when amount calculation is selected', () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    // Switch to amount calculation
    const amountRadio = screen.getByDisplayValue('amount')
    fireEvent.click(amountRadio)
    
    expect(screen.getByText('Monthly Investment (₹)')).toBeInTheDocument()
  })

  it('should show advanced options when enabled', () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    expect(screen.getByText('Advanced Options')).toBeInTheDocument()
    expect(screen.getByText('Adjust for inflation')).toBeInTheDocument()
    expect(screen.getByText('Enable step-up SIP (increase amount annually)')).toBeInTheDocument()
  })

  it('should show inflation rate input when inflation adjustment is enabled', () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    const inflationCheckbox = screen.getByRole('checkbox', { name: /adjust for inflation/i })
    fireEvent.click(inflationCheckbox)
    
    expect(screen.getByText('Expected Inflation Rate (%)')).toBeInTheDocument()
  })

  it('should show step-up rate input when step-up is enabled', () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    const stepUpCheckbox = screen.getByRole('checkbox', { name: /enable step-up sip/i })
    fireEvent.click(stepUpCheckbox)
    
    expect(screen.getByText('Annual Step-up Rate (%)')).toBeInTheDocument()
  })

  it('should display calculation results', async () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    // Wait for auto-calculation to complete
    await waitFor(() => {
      expect(screen.getByText('SIP Calculation Results')).toBeInTheDocument()
    }, { timeout: 1000 })
    
    expect(screen.getByText('Monthly Investment')).toBeInTheDocument()
    expect(screen.getByText('Total Investment')).toBeInTheDocument()
    expect(screen.getByText('Maturity Amount')).toBeInTheDocument()
    expect(screen.getByText('Total Gains')).toBeInTheDocument()
  })

  it('should call onResults when "Create SIP with These Results" is clicked', async () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText('Create SIP with These Results')).toBeInTheDocument()
    }, { timeout: 1000 })
    
    const createButton = screen.getByText('Create SIP with These Results')
    fireEvent.click(createButton)
    
    expect(mockOnResults).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyAmount: expect.any(Number),
        targetAmount: expect.any(Number),
        years: expect.any(Number),
        expectedReturn: expect.any(Number),
        totalInvestment: expect.any(Number),
        maturityAmount: expect.any(Number),
        totalGains: expect.any(Number),
        monthlyBreakdown: expect.any(Array)
      })
    )
  })
})