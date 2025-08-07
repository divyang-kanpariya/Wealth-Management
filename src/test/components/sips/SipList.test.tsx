import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SipList } from '@/components/sips/SipList'
import { SIPWithCurrentValue, Goal, Account, SIPSummary } from '@/types'

// Mock the UI components
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Select: ({ label, value, onChange, options }: any) => (
    <div>
      <label>{label}</label>
      <select value={value} onChange={onChange}>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  ),
  Input: ({ label, value, onChange, placeholder }: any) => (
    <div>
      <label>{label}</label>
      <input value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  ),
  Modal: ({ isOpen, children, title }: any) => 
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
  CompactCard: ({ children, title }: any) => (
    <div>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  ),
  DataGrid: ({ items }: any) => (
    <div>
      {items.map((item: any, index: number) => (
        <div key={index}>{item.label}: {item.value}</div>
      ))}
    </div>
  ),
  LoadingState: ({ message }: any) => <div>{message}</div>,
  ErrorState: ({ title, message }: any) => <div>{title}: {message}</div>
}))

// Mock the SipCard and SipForm components
vi.mock('@/components/sips', () => ({
  SipCard: ({ sipWithValue }: any) => (
    <div data-testid="sip-card">{sipWithValue.sip.name}</div>
  ),
  SipForm: ({ goals, accounts }: any) => (
    <div data-testid="sip-form">
      Goals: {goals.length}, Accounts: {accounts.length}
    </div>
  )
}))

describe('SipList', () => {
  const mockSips: SIPWithCurrentValue[] = [
    {
      sip: {
        id: '1',
        name: 'Test SIP 1',
        symbol: 'TEST1',
        amount: 5000,
        frequency: 'MONTHLY',
        startDate: new Date('2024-01-01'),
        status: 'ACTIVE',
        accountId: 'acc1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      totalInvested: 5000,
      totalUnits: 50,
      currentValue: 5500,
      averageNAV: 100,
      gainLoss: 500,
      gainLossPercentage: 10
    }
  ]

  const mockGoals: Goal[] = [
    {
      id: 'goal1',
      name: 'Test Goal',
      targetAmount: 100000,
      targetDate: new Date('2025-12-31'),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  const mockAccounts: Account[] = [
    {
      id: 'acc1',
      name: 'Test Account',
      type: 'DEMAT',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  const mockSummary: SIPSummary = {
    totalSIPs: 1,
    activeSIPs: 1,
    totalMonthlyAmount: 5000,
    totalInvested: 5000,
    totalCurrentValue: 5500,
    totalGainLoss: 500,
    totalGainLossPercentage: 10
  }

  it('should render SIP list with provided data', () => {
    render(
      <SipList
        initialSips={mockSips}
        goals={mockGoals}
        accounts={mockAccounts}
        summary={mockSummary}
      />
    )

    expect(screen.getByText('My SIPs')).toBeInTheDocument()
    expect(screen.getByText('1 SIP • 1 active')).toBeInTheDocument()
    expect(screen.getByTestId('sip-card')).toBeInTheDocument()
    expect(screen.getByText('Test SIP 1')).toBeInTheDocument()
  })

  it('should show summary statistics', () => {
    render(
      <SipList
        initialSips={mockSips}
        goals={mockGoals}
        accounts={mockAccounts}
        summary={mockSummary}
      />
    )

    expect(screen.getByText('Total Invested')).toBeInTheDocument()
    expect(screen.getByText('₹5,000')).toBeInTheDocument()
    expect(screen.getByText('Current Value')).toBeInTheDocument()
    expect(screen.getByText('₹5,500')).toBeInTheDocument()
  })

  it('should show empty state when no SIPs', () => {
    render(
      <SipList
        initialSips={[]}
        goals={mockGoals}
        accounts={mockAccounts}
        summary={{
          totalSIPs: 0,
          activeSIPs: 0,
          totalMonthlyAmount: 0,
          totalInvested: 0,
          totalCurrentValue: 0,
          totalGainLoss: 0,
          totalGainLossPercentage: 0
        }}
      />
    )

    expect(screen.getByText('No SIPs found')).toBeInTheDocument()
    expect(screen.getByText('Create Your First SIP')).toBeInTheDocument()
  })
})