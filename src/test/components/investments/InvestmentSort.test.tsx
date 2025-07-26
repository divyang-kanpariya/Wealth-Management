import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InvestmentSort from '@/components/investments/InvestmentSort'
import { InvestmentSortOptions } from '@/types'

const defaultProps = {
  sortOptions: {
    field: 'name' as const,
    direction: 'asc' as const
  },
  onSortChange: vi.fn()
}

describe('InvestmentSort', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render sort field select', () => {
    render(<InvestmentSort {...defaultProps} />)
    
    expect(screen.getByText('Sort by:')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Name')).toBeInTheDocument()
  })

  it('should call onSortChange when field changes', () => {
    render(<InvestmentSort {...defaultProps} />)
    
    const fieldSelect = screen.getByDisplayValue('Name')
    fireEvent.change(fieldSelect, { target: { value: 'currentValue' } })
    
    expect(defaultProps.onSortChange).toHaveBeenCalledWith({
      field: 'currentValue',
      direction: 'asc'
    })
  })

  it('should toggle direction when direction button is clicked', () => {
    render(<InvestmentSort {...defaultProps} />)
    
    const directionButton = screen.getByTitle('Sort ascending')
    fireEvent.click(directionButton)
    
    expect(defaultProps.onSortChange).toHaveBeenCalledWith({
      field: 'name',
      direction: 'desc'
    })
  })

  it('should show descending icon when direction is desc', () => {
    const descProps = {
      ...defaultProps,
      sortOptions: {
        field: 'name' as const,
        direction: 'desc' as const
      }
    }
    
    render(<InvestmentSort {...descProps} />)
    
    expect(screen.getByTitle('Sort descending')).toBeInTheDocument()
  })

  it('should render all sort field options', () => {
    render(<InvestmentSort {...defaultProps} />)
    
    const fieldSelect = screen.getByDisplayValue('Name')
    
    // Check that all options are available
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Current Value')).toBeInTheDocument()
    expect(screen.getByText('Gain/Loss Amount')).toBeInTheDocument()
    expect(screen.getByText('Gain/Loss %')).toBeInTheDocument()
    expect(screen.getByText('Purchase Date')).toBeInTheDocument()
    expect(screen.getByText('Investment Type')).toBeInTheDocument()
  })

  it('should handle different sort fields correctly', () => {
    const gainLossProps = {
      ...defaultProps,
      sortOptions: {
        field: 'gainLoss' as const,
        direction: 'desc' as const
      }
    }
    
    render(<InvestmentSort {...gainLossProps} />)
    
    expect(screen.getByDisplayValue('Gain/Loss Amount')).toBeInTheDocument()
    expect(screen.getByTitle('Sort descending')).toBeInTheDocument()
  })
})