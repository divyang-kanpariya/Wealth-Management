import { describe, it, expect } from 'vitest'

describe('Dashboard Components Index', () => {
  it('should export all dashboard components', async () => {
    const dashboardComponents = await import('@/components/dashboard')
    
    expect(dashboardComponents.CompactPortfolioSummary).toBeDefined()
    expect(dashboardComponents.CompactAssetAllocation).toBeDefined()
    expect(dashboardComponents.CompactGoalProgress).toBeDefined()
    expect(dashboardComponents.CompactTopPerformers).toBeDefined()
    expect(dashboardComponents.CompactQuickStats).toBeDefined()
  })
})