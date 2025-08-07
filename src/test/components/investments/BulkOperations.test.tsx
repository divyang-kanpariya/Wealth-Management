import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BulkOperations from '@/components/investments/BulkOperations'
import { Investment, InvestmentWithCurrentValue, BulkOperationResult } from '@/types'

const mockInvestments: Investment[] = [
  {
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
    updatedAt: new Date('2023-01-15')
  },
  {
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
    updatedAt: new Date('2023-02-10')
  }
]

const mockInvestmentsWithCurrentValue: InvestmentWithCurrentValue[] = mockInvestments.map(investment => ({
  investment,
  currentPrice: investment.buyPrice ? investment.buyPrice * 1.1 : 0,
  currentValue: investment.units && investment.buyPrice ? investment.units * investment.buyPrice * 1.1 : 0,
  gainLoss: investment.units && investment.buyPrice ? investment.units * investment.buyPrice * 0.1 : 0,
  gainLossPercentage: 10
}))

const defaultProps = {
  selectedInvestments: mockInvestmentsWithCurrentValue,
  onSelectionChange: vi.fn(),
  onBulkDelete: vi.fn(),
  onRefresh: vi.fn()
}

describe('BulkOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when no investments are selected', () => {
    render(
      <BulkOperations 
        {...defaultProps} 
        selectedInvestments={[]}
      />
    )
    
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
  })

  it('should show selected count', () => {
    render(<BulkOperations {...defaultProps} />)
    
    expect(screen.getByText('2 investments selected')).toBeInTheDocument()
  })

  it('should show singular form for single selection', () => {
    render(
      <BulkOperations 
        {...defaultProps} 
        selectedInvestments={[mockInvestmentsWithCurrentValue[0]]}
      />
    )
    
    expect(screen.getByText('1 investment selected')).toBeInTheDocument()
  })

  it('should call onSelectionChange when clear selection is clicked', () => {
    render(<BulkOperations {...defaultProps} />)
    
    const clearButton = screen.getByText('Clear Selection')
    fireEvent.click(clearButton)
    
    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith([])
  })

  it('should open delete modal when delete selected is clicked', () => {
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    expect(screen.getByText('Delete Selected Investments')).toBeInTheDocument()
  })

  it('should show list of investments to be deleted in modal', () => {
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    // Check that the modal shows the investments in the list
    const modal = screen.getByText('Delete Selected Investments')
    expect(modal).toBeInTheDocument()
    
    // Check that both investment names appear in the modal (they appear in multiple places)
    const appleElements = screen.getAllByText('Apple Inc')
    const sbiElements = screen.getAllByText('SBI Bluechip Fund')
    expect(appleElements.length).toBeGreaterThan(0)
    expect(sbiElements.length).toBeGreaterThan(0)
  })

  it('should call onBulkDelete when delete all is confirmed', async () => {
    const mockBulkDeleteResult: BulkOperationResult = {
      success: 2,
      failed: 0,
      errors: []
    }
    
    defaultProps.onBulkDelete.mockResolvedValue(mockBulkDeleteResult)
    
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    const confirmButton = screen.getByText('Delete 2 Investments')
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(defaultProps.onBulkDelete).toHaveBeenCalledWith(['1', '2'])
    })
  })

  it('should show success message after successful bulk delete', async () => {
    const mockBulkDeleteResult: BulkOperationResult = {
      success: 2,
      failed: 0,
      errors: []
    }
    
    defaultProps.onBulkDelete.mockResolvedValue(mockBulkDeleteResult)
    
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    const confirmButton = screen.getByText('Delete 2 Investments')
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(screen.getByText('Successfully deleted 2 investments')).toBeInTheDocument()
    })
  })

  it('should show error message after failed bulk delete', async () => {
    const mockBulkDeleteResult: BulkOperationResult = {
      success: 1,
      failed: 1,
      errors: ['Failed to delete investment 2: Not found']
    }
    
    defaultProps.onBulkDelete.mockResolvedValue(mockBulkDeleteResult)
    
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    const confirmButton = screen.getByText('Delete 2 Investments')
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(screen.getByText('Successfully deleted 1 investment')).toBeInTheDocument()
      expect(screen.getAllByText(/Failed to delete.*investment/).length).toBeGreaterThan(0)
      expect(screen.getByText('Failed to delete investment 2: Not found')).toBeInTheDocument()
    })
  })

  it('should handle bulk delete error', async () => {
    defaultProps.onBulkDelete.mockRejectedValue(new Error('Network error'))
    
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    const confirmButton = screen.getByText('Delete 2 Investments')
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to delete.*investment/)).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should call onRefresh after successful deletion', async () => {
    const mockBulkDeleteResult: BulkOperationResult = {
      success: 2,
      failed: 0,
      errors: []
    }
    
    defaultProps.onBulkDelete.mockResolvedValue(mockBulkDeleteResult)
    
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    const confirmButton = screen.getByText('Delete 2 Investments')
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(defaultProps.onRefresh).toHaveBeenCalled()
    })
  })

  it('should clear selection after successful deletion', async () => {
    const mockBulkDeleteResult: BulkOperationResult = {
      success: 2,
      failed: 0,
      errors: []
    }
    
    defaultProps.onBulkDelete.mockResolvedValue(mockBulkDeleteResult)
    
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    const confirmButton = screen.getByText('Delete 2 Investments')
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(defaultProps.onSelectionChange).toHaveBeenCalledWith([])
    })
  })

  it('should disable buttons while deleting', async () => {
    const mockBulkDeleteResult: BulkOperationResult = {
      success: 2,
      failed: 0,
      errors: []
    }
    
    defaultProps.onBulkDelete.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockBulkDeleteResult), 100))
    )
    
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    const confirmButton = screen.getByText('Delete 2 Investments')
    fireEvent.click(confirmButton)
    
    expect(screen.getByText('Deleting...')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  it('should close modal when cancel is clicked', () => {
    render(<BulkOperations {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete Selected')
    fireEvent.click(deleteButton)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(screen.queryByText('Delete Selected Investments')).not.toBeInTheDocument()
  })
})