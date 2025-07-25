import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AssetAllocation from '@/components/dashboard/AssetAllocation'

describe('AssetAllocation Component', () => {
  const mockAssetAllocation = {
    STOCK: { value: 90000, percentage: 60 },
    MUTUAL_FUND: { value: 45000, percentage: 30 },
    GOLD: { value: 15000, percentage: 10 }
  }

  const mockAccountDistribution = {
    'Zerodha': { value: 75000, percentage: 50 },
    'HDFC Bank': { value: 45000, percentage: 30 },
    'SBI': { value: 30000, percentage: 20 }
  }

  it('should render asset allocation and account distribution sections', () => {
    render(
      <AssetAllocation 
        assetAllocation={mockAssetAllocation}
        accountDistribution={mockAccountDistribution}
      />
    )
    
    expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
    expect(screen.getByText('Account Distribution')).toBeInTheDocument()
  })

  it('should display asset types with correct labels and values', () => {
    render(
      <AssetAllocation 
        assetAllocation={mockAssetAllocation}
        accountDistribution={mockAccountDistribution}
      />
    )
    
    expect(screen.getByText('Stocks')).toBeInTheDocument()
    expect(screen.getByText('Mutual Funds')).toBeInTheDocument()
    expect(screen.getByText('Gold')).toBeInTheDocument()
    
    expect(screen.getByText('₹90,000')).toBeInTheDocument()
    expect(screen.getByText('₹45,000')).toBeInTheDocument()
    expect(screen.getByText('₹15,000')).toBeInTheDocument()
    
    expect(screen.getByText('60.0%')).toBeInTheDocument()
    expect(screen.getByText('30.0%')).toBeInTheDocument()
    expect(screen.getByText('10.0%')).toBeInTheDocument()
  })

  it('should display account names with correct values', () => {
    render(
      <AssetAllocation 
        assetAllocation={mockAssetAllocation}
        accountDistribution={mockAccountDistribution}
      />
    )
    
    expect(screen.getByText('Zerodha')).toBeInTheDocument()
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument()
    expect(screen.getByText('SBI')).toBeInTheDocument()
    
    expect(screen.getByText('₹75,000')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText('20.0%')).toBeInTheDocument()
  })

  it('should sort assets by value in descending order', () => {
    render(
      <AssetAllocation 
        assetAllocation={mockAssetAllocation}
        accountDistribution={mockAccountDistribution}
      />
    )
    
    const assetSection = screen.getByText('Asset Allocation').closest('div')
    const assetItems = assetSection?.querySelectorAll('div > div')
    
    // First item should be Stocks (highest value)
    expect(assetItems?.[1]).toHaveTextContent('Stocks')
    // Second item should be Mutual Funds
    expect(assetItems?.[2]).toHaveTextContent('Mutual Funds')
    // Third item should be Gold (lowest value)
    expect(assetItems?.[3]).toHaveTextContent('Gold')
  })

  it('should sort accounts by value in descending order', () => {
    render(
      <AssetAllocation 
        assetAllocation={mockAssetAllocation}
        accountDistribution={mockAccountDistribution}
      />
    )
    
    const accountSection = screen.getByText('Account Distribution').closest('div')
    const accountItems = accountSection?.querySelectorAll('div > div')
    
    // First item should be Zerodha (highest value)
    expect(accountItems?.[1]).toHaveTextContent('Zerodha')
    // Second item should be HDFC Bank
    expect(accountItems?.[2]).toHaveTextContent('HDFC Bank')
    // Third item should be SBI (lowest value)
    expect(accountItems?.[3]).toHaveTextContent('SBI')
  })

  it('should display empty state when no assets exist', () => {
    render(
      <AssetAllocation 
        assetAllocation={{}}
        accountDistribution={{}}
      />
    )
    
    expect(screen.getAllByText('No investments found')).toHaveLength(1)
    expect(screen.getAllByText('No accounts found')).toHaveLength(1)
  })

  it('should handle single asset type correctly', () => {
    const singleAsset = {
      STOCK: { value: 100000, percentage: 100 }
    }
    
    const singleAccount = {
      'Zerodha': { value: 100000, percentage: 100 }
    }
    
    render(
      <AssetAllocation 
        assetAllocation={singleAsset}
        accountDistribution={singleAccount}
      />
    )
    
    expect(screen.getByText('Stocks')).toBeInTheDocument()
    expect(screen.getByText('₹1,00,000')).toBeInTheDocument()
    expect(screen.getByText('100.0%')).toBeInTheDocument()
    
    expect(screen.getByText('Zerodha')).toBeInTheDocument()
  })

  it('should handle decimal percentages correctly', () => {
    const preciseAllocation = {
      STOCK: { value: 66667, percentage: 66.667 },
      MUTUAL_FUND: { value: 33333, percentage: 33.333 }
    }
    
    render(
      <AssetAllocation 
        assetAllocation={preciseAllocation}
        accountDistribution={{}}
      />
    )
    
    expect(screen.getByText('66.7%')).toBeInTheDocument()
    expect(screen.getByText('33.3%')).toBeInTheDocument()
  })

  it('should render color indicators for different asset types', () => {
    render(
      <AssetAllocation 
        assetAllocation={mockAssetAllocation}
        accountDistribution={mockAccountDistribution}
      />
    )
    
    // Check that color indicator divs are rendered
    const colorIndicators = screen.getAllByRole('generic').filter(
      div => div.className.includes('w-4 h-4 rounded-full')
    )
    
    expect(colorIndicators.length).toBeGreaterThan(0)
  })
})