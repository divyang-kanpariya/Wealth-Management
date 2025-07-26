import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InvestmentFiltersComponent from '@/components/investments/InvestmentFilters'
import { InvestmentFilters, Goal, Account } from '@/types'

const mockGoals: Goal[] = [
  {
    id: 'goal1',
    name: 'Retirement',
    targetAmount: 100000,
    targetDate: new Date('2030-01-01'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'goal2',
    name: 'House',
    targetAmount: 500000,
    targetDate: new Date('2025-01-01'),
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockAccounts: Account[] = [
  {
    id: 'account1',
    name: 'Zerodha',
    type: 'BROKER',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'account2',
    name: 'HDFC Bank',
    type: 'BANK',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const defaultProps = {
  filters: {} as InvestmentFilters,
  onFiltersChange: vi.fn(),
  goals: mockGoals,
  accounts: mockAccounts,
  onReset: vi.fn()
}

describe('InvestmentFiltersComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render search input', () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    expect(screen.getByPlaceholderText('Search investments by name, symbol, or notes...')).toBeInTheDocument()
  })

  it('should call onFiltersChange when search input changes', async () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search investments by name, symbol, or notes...')
    fireEvent.change(searchInput, { target: { value: 'apple' } })
    
    await waitFor(() => {
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({ search: 'apple' })
    })
  })

  it('should show expanded filters when expand button is clicked', async () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Investment Type')).toBeInTheDocument()
      expect(screen.getByText('Goal')).toBeInTheDocument()
      expect(screen.getByText('Account')).toBeInTheDocument()
    })
  })

  it('should show active filters indicator', () => {
    const filtersWithData: InvestmentFilters = {
      search: 'test',
      type: 'STOCK'
    }
    
    render(
      <InvestmentFiltersComponent 
        {...defaultProps} 
        filters={filtersWithData}
      />
    )
    
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should show reset button when filters are active', () => {
    const filtersWithData: InvestmentFilters = {
      search: 'test'
    }
    
    render(
      <InvestmentFiltersComponent 
        {...defaultProps} 
        filters={filtersWithData}
      />
    )
    
    expect(screen.getByText('Clear All')).toBeInTheDocument()
  })

  it('should call onReset when reset button is clicked', () => {
    const filtersWithData: InvestmentFilters = {
      search: 'test'
    }
    
    render(
      <InvestmentFiltersComponent 
        {...defaultProps} 
        filters={filtersWithData}
      />
    )
    
    const resetButton = screen.getByText('Clear All')
    fireEvent.click(resetButton)
    
    expect(defaultProps.onReset).toHaveBeenCalled()
  })

  it('should render investment type options when expanded', async () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Investment Type')).toBeInTheDocument()
    })
  })

  it('should render goal options when expanded', async () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Goal')).toBeInTheDocument()
    })
  })

  it('should render account options when expanded', async () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Account')).toBeInTheDocument()
    })
  })

  it('should render date range inputs when expanded', async () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Purchase Date Range')).toBeInTheDocument()
    })
  })

  it('should render value range inputs when expanded', async () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Current Value Range (₹)')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('No limit')).toBeInTheDocument()
    })
  })

  it('should handle date range changes', async () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      const fromDateInputs = screen.getAllByDisplayValue('')
      const dateInputs = fromDateInputs.filter(input => input.getAttribute('type') === 'date')
      fireEvent.change(dateInputs[0], { target: { value: '2023-01-01' } })
    })
    
    await waitFor(() => {
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
        dateRange: { start: new Date('2023-01-01') }
      })
    })
  })

  it('should handle value range changes', async () => {
    render(<InvestmentFiltersComponent {...defaultProps} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      const minValueInput = screen.getByPlaceholderText('0')
      fireEvent.change(minValueInput, { target: { value: '1000' } })
    })
    
    await waitFor(() => {
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({
        valueRange: { min: 1000 }
      })
    })
  })

  it('should clear search when empty string is provided', async () => {
    const filtersWithSearch: InvestmentFilters = { search: 'test' }
    
    render(
      <InvestmentFiltersComponent 
        {...defaultProps} 
        filters={filtersWithSearch}
      />
    )
    
    const searchInput = screen.getByDisplayValue('test')
    fireEvent.change(searchInput, { target: { value: '' } })
    
    await waitFor(() => {
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({ search: undefined })
    })
  })
})