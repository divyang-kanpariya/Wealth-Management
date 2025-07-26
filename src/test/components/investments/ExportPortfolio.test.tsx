import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExportPortfolio from '@/components/investments/ExportPortfolio'
import { InvestmentWithCurrentValue } from '@/types'
import * as portfolioUtils from '@/lib/portfolio-utils'

// Mock the portfolio utils
vi.mock('@/lib/portfolio-utils', () => ({
  exportToCSV: vi.fn(),
  exportToJSON: vi.fn(),
  generateExportFilename: vi.fn(),
  downloadFile: vi.fn()
}))

const mockInvestmentsWithValues: InvestmentWithCurrentValue[] = [
  {
    investment: {
      id: '1',
      type: 'STOCK',
      name: 'Apple Inc',
      symbol: 'AAPL',
      units: 10,
      buyPrice: 150,
      totalValue: undefined,
      buyDate: new Date('2023-01-15'),
      goalId: 'goal1',
      accountId: 'account1',
      notes: 'Tech stock investment',
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2023-01-15'),
      goal: { id: 'goal1', name: 'Retirement', targetAmount: 100000, targetDate: new Date('2030-01-01'), createdAt: new Date(), updatedAt: new Date() },
      account: { id: 'account1', name: 'Zerodha', type: 'BROKER', createdAt: new Date(), updatedAt: new Date() }
    },
    currentPrice: 180,
    currentValue: 1800,
    gainLoss: 300,
    gainLossPercentage: 20
  },
  {
    investment: {
      id: '2',
      type: 'MUTUAL_FUND',
      name: 'SBI Bluechip Fund',
      symbol: 'SBI001',
      units: 100,
      buyPrice: 50,
      totalValue: undefined,
      buyDate: new Date('2023-02-10'),
      goalId: 'goal2',
      accountId: 'account2',
      notes: 'Diversified equity fund',
      createdAt: new Date('2023-02-10'),
      updatedAt: new Date('2023-02-10'),
      goal: { id: 'goal2', name: 'House', targetAmount: 500000, targetDate: new Date('2025-01-01'), createdAt: new Date(), updatedAt: new Date() },
      account: { id: 'account2', name: 'HDFC Bank', type: 'BANK', createdAt: new Date(), updatedAt: new Date() }
    },
    currentPrice: 45,
    currentValue: 4500,
    gainLoss: -500,
    gainLossPercentage: -10
  }
]

const defaultProps = {
  investments: mockInvestmentsWithValues,
  isOpen: true,
  onClose: vi.fn()
}

describe('ExportPortfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(portfolioUtils.generateExportFilename as any).mockReturnValue('portfolio-export-2023-12-01.csv')
  })

  it('should not render when modal is closed', () => {
    render(
      <ExportPortfolio 
        {...defaultProps} 
        isOpen={false}
      />
    )
    
    expect(screen.queryByText('Export Portfolio')).not.toBeInTheDocument()
  })

  it('should render export modal when open', () => {
    render(<ExportPortfolio {...defaultProps} />)
    
    expect(screen.getByText('Export Portfolio')).toBeInTheDocument()
    expect(screen.getByText('Export your investment portfolio data for analysis or backup purposes.')).toBeInTheDocument()
  })

  it('should show investment count', () => {
    render(<ExportPortfolio {...defaultProps} />)
    
    expect(screen.getByText('2 of 2 investments will be exported')).toBeInTheDocument()
  })

  it('should have CSV format selected by default', () => {
    render(<ExportPortfolio {...defaultProps} />)
    
    const formatSelect = screen.getByDisplayValue('CSV (Excel Compatible)')
    expect(formatSelect).toBeInTheDocument()
  })

  it('should have include current prices checked by default', () => {
    render(<ExportPortfolio {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /include current prices/i })
    expect(checkbox).toBeChecked()
  })

  it('should change export format when selected', () => {
    render(<ExportPortfolio {...defaultProps} />)
    
    const formatSelect = screen.getByDisplayValue('CSV (Excel Compatible)')
    fireEvent.change(formatSelect, { target: { value: 'json' } })
    
    expect(screen.getByDisplayValue('JSON (Data Format)')).toBeInTheDocument()
  })

  it('should toggle include current prices checkbox', () => {
    render(<ExportPortfolio {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /include current prices/i })
    fireEvent.click(checkbox)
    
    expect(checkbox).not.toBeChecked()
  })

  it('should handle date range changes', () => {
    render(<ExportPortfolio {...defaultProps} />)
    
    const fromDateInput = screen.getByPlaceholderText('From date')
    fireEvent.change(fromDateInput, { target: { value: '2023-01-01' } })
    
    expect(fromDateInput).toHaveValue('2023-01-01')
  })

  it('should update filtered count when date range is applied', () => {
    render(<ExportPortfolio {...defaultProps} />)
    
    const fromDateInput = screen.getByPlaceholderText('From date')
    const toDateInput = screen.getByPlaceholderText('To date')
    
    fireEvent.change(fromDateInput, { target: { value: '2023-01-01' } })
    fireEvent.change(toDateInput, { target: { value: '2023-01-31' } })
    
    // Should show 1 investment (Apple Inc bought on 2023-01-15)
    expect(screen.getByText('1 of 2 investments will be exported')).toBeInTheDocument()
  })

  it('should call exportToCSV when exporting CSV format', async () => {
    ;(portfolioUtils.exportToCSV as any).mockReturnValue('csv content')
    
    render(<ExportPortfolio {...defaultProps} />)
    
    const exportButton = screen.getByText('Export 2 Investments')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(portfolioUtils.exportToCSV).toHaveBeenCalledWith(
        mockInvestmentsWithValues,
        expect.objectContaining({
          format: 'csv',
          includeCurrentPrices: true
        })
      )
    })
  })

  it('should call exportToJSON when exporting JSON format', async () => {
    ;(portfolioUtils.exportToJSON as any).mockReturnValue('{"data": "json content"}')
    
    render(<ExportPortfolio {...defaultProps} />)
    
    const formatSelect = screen.getByDisplayValue('CSV (Excel Compatible)')
    fireEvent.change(formatSelect, { target: { value: 'json' } })
    
    const exportButton = screen.getByText('Export 2 Investments')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(portfolioUtils.exportToJSON).toHaveBeenCalledWith(
        mockInvestmentsWithValues,
        expect.objectContaining({
          format: 'json',
          includeCurrentPrices: true
        })
      )
    })
  })

  it('should call downloadFile with correct parameters', async () => {
    ;(portfolioUtils.exportToCSV as any).mockReturnValue('csv content')
    
    render(<ExportPortfolio {...defaultProps} />)
    
    const exportButton = screen.getByText('Export 2 Investments')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(portfolioUtils.downloadFile).toHaveBeenCalledWith(
        'csv content',
        'portfolio-export-2023-12-01.csv',
        'text/csv'
      )
    })
  })

  it('should close modal after successful export', async () => {
    ;(portfolioUtils.exportToCSV as any).mockReturnValue('csv content')
    
    render(<ExportPortfolio {...defaultProps} />)
    
    const exportButton = screen.getByText('Export 2 Investments')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  it('should disable export button when no investments to export', () => {
    render(
      <ExportPortfolio 
        {...defaultProps} 
        investments={[]}
      />
    )
    
    const exportButton = screen.getByText('Export 0 Investments')
    expect(exportButton).toBeDisabled()
  })

  it('should show exporting state during export', async () => {
    ;(portfolioUtils.exportToCSV as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('csv content'), 100))
    )
    
    render(<ExportPortfolio {...defaultProps} />)
    
    const exportButton = screen.getByText('Export 2 Investments')
    fireEvent.click(exportButton)
    
    expect(screen.getByText('Exporting...')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  it('should call onClose when cancel button is clicked', () => {
    render(<ExportPortfolio {...defaultProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('should filter investments by date range before export', async () => {
    ;(portfolioUtils.exportToCSV as any).mockReturnValue('csv content')
    
    render(<ExportPortfolio {...defaultProps} />)
    
    // Set date range to include only first investment
    const fromDateInput = screen.getByPlaceholderText('From date')
    const toDateInput = screen.getByPlaceholderText('To date')
    
    fireEvent.change(fromDateInput, { target: { value: '2023-01-01' } })
    fireEvent.change(toDateInput, { target: { value: '2023-01-31' } })
    
    const exportButton = screen.getByText('Export 1 Investments')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(portfolioUtils.exportToCSV).toHaveBeenCalledWith(
        [mockInvestmentsWithValues[0]], // Only first investment should be included
        expect.any(Object)
      )
    })
  })
})