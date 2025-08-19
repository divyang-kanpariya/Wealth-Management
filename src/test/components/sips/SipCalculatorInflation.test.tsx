import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SipCalculator } from '@/components/sips/SipCalculator'

// Mock the UI components
vi.mock('@/components/ui', () => ({
  Input: ({ label, value, onChange, placeholder, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e)}
        data-testid={placeholder ? `input-${placeholder}` : `input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
        placeholder={placeholder}
        {...props}
      />
    </div>
  ),
  Select: ({ value, onChange, options, ...props }: any) => (
    <select
      value={value}
      onChange={(e) => onChange(e)}
      data-testid="select"
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
    <button onClick={onClick} data-testid="button" {...props}>
      {children}
    </button>
  ),
  CompactCard: ({ title, children }: any) => (
    <div data-testid="compact-card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
  DataGrid: ({ items }: any) => (
    <div data-testid="data-grid">
      {items?.map((item: any, index: number) => (
        <div key={index}>
          <span>{item.label}: {item.value}</span>
        </div>
      ))}
    </div>
  ),
  Toggle: ({ checked, onChange, label, description }: any) => (
    <div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={`toggle-${label?.toLowerCase().replace(/\s+/g, '-')}`}
      />
      <label>{label}</label>
      {description && <p>{description}</p>}
    </div>
  ),
  Tooltip: ({ children, content }: any) => (
    <div title={content}>
      {children}
    </div>
  )
}))

describe('SipCalculator Inflation Features', () => {
  const mockOnResults = vi.fn()

  beforeEach(() => {
    mockOnResults.mockClear()
  })

  it('should render inflation adjustment toggle', () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    expect(screen.getByTestId('toggle-adjust-for-inflation')).toBeInTheDocument()
    expect(screen.getByText('Adjust for inflation')).toBeInTheDocument()
  })

  it('should show inflation rate input when inflation adjustment is enabled', async () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    const inflationToggle = screen.getByTestId('toggle-adjust-for-inflation')
    fireEvent.click(inflationToggle)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('6')).toBeInTheDocument()
    })
  })

  it('should show inflation impact for target-based calculation', async () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    // Enable inflation adjustment
    const inflationToggle = screen.getByTestId('toggle-adjust-for-inflation')
    fireEvent.click(inflationToggle)
    
    // Set target amount
    const targetAmountInput = screen.getByTestId('input-target-amount-(₹)')
    fireEvent.change(targetAmountInput, { target: { value: '1000000' } })
    
    await waitFor(() => {
      expect(screen.getByText(/Inflation Impact/)).toBeInTheDocument()
      expect(screen.getByText(/Present Value \(Today's Money\):/)).toBeInTheDocument()
      expect(screen.getByText(/Future Value \(After/)).toBeInTheDocument()
    })
  })

  it('should show step-up SIP toggle', () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    expect(screen.getByTestId('toggle-enable-step-up-sip')).toBeInTheDocument()
    expect(screen.getByText('Enable step-up SIP')).toBeInTheDocument()
  })

  it('should show step-up rate input when step-up is enabled', async () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    const stepUpToggle = screen.getByTestId('toggle-enable-step-up-sip')
    fireEvent.click(stepUpToggle)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    })
  })

  it('should calculate and display results with inflation adjustment', async () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    // Set up calculation inputs
    const targetAmountInput = screen.getByTestId('input-e.g., 1000000')
    fireEvent.change(targetAmountInput, { target: { value: '1000000' } })
    
    const yearsInput = screen.getByDisplayValue('10')
    fireEvent.change(yearsInput, { target: { value: '10' } })
    
    const returnInput = screen.getByDisplayValue('12')
    fireEvent.change(returnInput, { target: { value: '12' } })
    
    // Enable inflation adjustment
    const inflationToggle = screen.getByTestId('toggle-adjust-for-inflation')
    fireEvent.click(inflationToggle)
    
    // Wait for calculation to complete
    await waitFor(() => {
      expect(screen.getByText(/SIP Calculation Results/)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    // Check if results are displayed
    expect(screen.getByTestId('data-grid')).toBeInTheDocument()
  })

  it('should show real vs nominal value toggle when inflation is enabled', async () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    // Enable inflation adjustment
    const inflationToggle = screen.getByTestId('toggle-adjust-for-inflation')
    fireEvent.click(inflationToggle)
    
    // Set inputs to trigger calculation
    const targetAmountInput = screen.getByTestId('input-e.g., 1000000')
    fireEvent.change(targetAmountInput, { target: { value: '1000000' } })
    
    // Wait for results and toggle to appear
    await waitFor(() => {
      expect(screen.getByText(/Nominal Value/)).toBeInTheDocument()
      expect(screen.getByText(/Real Value \(Inflation Adjusted\)/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should display inflation impact summary when enabled', async () => {
    render(<SipCalculator onResults={mockOnResults} />)
    
    // Enable inflation adjustment
    const inflationToggle = screen.getByTestId('toggle-adjust-for-inflation')
    fireEvent.click(inflationToggle)
    
    // Set inputs
    const targetAmountInput = screen.getByTestId('input-e.g., 1000000')
    fireEvent.change(targetAmountInput, { target: { value: '1000000' } })
    
    const yearsInput = screen.getByDisplayValue('10')
    fireEvent.change(yearsInput, { target: { value: '10' } })
    
    // Wait for inflation impact summary
    await waitFor(() => {
      expect(screen.getByText(/Inflation Impact Summary/)).toBeInTheDocument()
      expect(screen.getByText(/Nominal Wealth:/)).toBeInTheDocument()
      expect(screen.getByText(/Real Wealth:/)).toBeInTheDocument()
      expect(screen.getByText(/Inflation Loss:/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})