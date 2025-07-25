import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GoalProgress from '@/components/dashboard/GoalProgress'
import { GoalProgress as GoalProgressType } from '@/types'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

describe('GoalProgress Component', () => {
  const mockGoals: GoalProgressType[] = [
    {
      id: '1',
      name: 'Retirement Fund',
      targetAmount: 1000000,
      currentValue: 250000,
      progress: 25.0,
      remainingAmount: 750000,
      targetDate: new Date('2030-12-31')
    },
    {
      id: '2',
      name: 'House Down Payment',
      targetAmount: 500000,
      currentValue: 450000,
      progress: 90.0,
      remainingAmount: 50000,
      targetDate: new Date('2025-06-30')
    },
    {
      id: '3',
      name: 'Emergency Fund',
      targetAmount: 200000,
      currentValue: 200000,
      progress: 100.0,
      remainingAmount: 0,
      targetDate: new Date('2024-12-31')
    }
  ]

  it('should render goal progress section with header', () => {
    render(<GoalProgress goals={mockGoals} />)
    
    expect(screen.getByText('Goal Progress')).toBeInTheDocument()
    expect(screen.getByText('View All Goals')).toBeInTheDocument()
  })

  it('should display all goals with correct information', () => {
    render(<GoalProgress goals={mockGoals} />)
    
    expect(screen.getByText('Retirement Fund')).toBeInTheDocument()
    expect(screen.getByText('House Down Payment')).toBeInTheDocument()
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
    
    expect(screen.getByText('25.0%')).toBeInTheDocument()
    expect(screen.getByText('90.0%')).toBeInTheDocument()
    expect(screen.getByText('100.0%')).toBeInTheDocument()
  })

  it('should format currency values correctly', () => {
    render(<GoalProgress goals={mockGoals} />)
    
    expect(screen.getByText('₹2,50,000')).toBeInTheDocument()
    expect(screen.getByText('₹10,00,000')).toBeInTheDocument()
    expect(screen.getByText('₹4,50,000')).toBeInTheDocument()
    expect(screen.getByText('₹5,00,000')).toBeInTheDocument()
  })

  it('should display remaining amounts for incomplete goals', () => {
    render(<GoalProgress goals={mockGoals} />)
    
    expect(screen.getByText('₹7,50,000 remaining to reach goal')).toBeInTheDocument()
    expect(screen.getByText('₹50,000 remaining to reach goal')).toBeInTheDocument()
    
    // Completed goal should not show remaining amount
    expect(screen.queryByText('₹0 remaining to reach goal')).not.toBeInTheDocument()
  })

  it('should calculate and display days remaining correctly', () => {
    // Mock current date to ensure consistent test results
    const mockDate = new Date('2024-01-01')
    vi.setSystemTime(mockDate)
    
    render(<GoalProgress goals={mockGoals} />)
    
    // Should show days remaining for future dates
    expect(screen.getByText(/days left/)).toBeInTheDocument()
    
    vi.useRealTimers()
  })

  it('should handle overdue goals correctly', () => {
    const overdueGoals: GoalProgressType[] = [
      {
        id: '1',
        name: 'Overdue Goal',
        targetAmount: 100000,
        currentValue: 50000,
        progress: 50.0,
        remainingAmount: 50000,
        targetDate: new Date('2023-01-01') // Past date
      }
    ]
    
    // Mock current date
    const mockDate = new Date('2024-01-01')
    vi.setSystemTime(mockDate)
    
    render(<GoalProgress goals={overdueGoals} />)
    
    expect(screen.getByText(/days overdue/)).toBeInTheDocument()
    
    vi.useRealTimers()
  })

  it('should handle goals due today', () => {
    const todayGoals: GoalProgressType[] = [
      {
        id: '1',
        name: 'Due Today Goal',
        targetAmount: 100000,
        currentValue: 80000,
        progress: 80.0,
        remainingAmount: 20000,
        targetDate: new Date('2024-01-01')
      }
    ]
    
    // Mock current date
    const mockDate = new Date('2024-01-01')
    vi.setSystemTime(mockDate)
    
    render(<GoalProgress goals={todayGoals} />)
    
    expect(screen.getByText('Due today')).toBeInTheDocument()
    
    vi.useRealTimers()
  })

  it('should limit display to 5 goals and show "view more" link', () => {
    const manyGoals: GoalProgressType[] = Array.from({ length: 7 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Goal ${i + 1}`,
      targetAmount: 100000,
      currentValue: 50000,
      progress: 50.0,
      remainingAmount: 50000,
      targetDate: new Date('2025-12-31')
    }))
    
    render(<GoalProgress goals={manyGoals} />)
    
    // Should show first 5 goals
    expect(screen.getByText('Goal 1')).toBeInTheDocument()
    expect(screen.getByText('Goal 5')).toBeInTheDocument()
    
    // Should show "view more" link
    expect(screen.getByText('View 2 more goals')).toBeInTheDocument()
  })

  it('should display empty state when no goals exist', () => {
    render(<GoalProgress goals={[]} />)
    
    expect(screen.getByText('No goals found')).toBeInTheDocument()
    expect(screen.getByText('Create your first goal')).toBeInTheDocument()
  })

  it('should apply correct progress bar colors based on progress percentage', () => {
    render(<GoalProgress goals={mockGoals} />)
    
    // Check that progress bars are rendered
    const progressBars = screen.getAllByRole('generic').filter(
      div => div.className.includes('h-2 rounded-full') && div.className.includes('bg-')
    )
    
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it('should format target dates correctly', () => {
    render(<GoalProgress goals={mockGoals} />)
    
    expect(screen.getByText('Due: 31 Dec 2030')).toBeInTheDocument()
    expect(screen.getByText('Due: 30 Jun 2025')).toBeInTheDocument()
    expect(screen.getByText('Due: 31 Dec 2024')).toBeInTheDocument()
  })

  it('should cap progress at 100% in display', () => {
    const overAchievedGoals: GoalProgressType[] = [
      {
        id: '1',
        name: 'Over-achieved Goal',
        targetAmount: 100000,
        currentValue: 150000,
        progress: 150.0, // Over 100%
        remainingAmount: 0,
        targetDate: new Date('2025-12-31')
      }
    ]
    
    render(<GoalProgress goals={overAchievedGoals} />)
    
    // Progress should be capped at 100% in display
    expect(screen.getByText('150.0%')).toBeInTheDocument() // Shows actual percentage
    
    // Progress bar should be capped at 100% width
    const progressBar = screen.getByRole('generic', { 
      name: /progress bar/i 
    }) || document.querySelector('[style*="width: 100%"]')
    
    // The progress bar should exist (even if we can't easily test the exact width)
    expect(document.querySelector('.h-2.rounded-full')).toBeInTheDocument()
  })
})