import { describe, it, expect } from 'vitest'

describe('Dashboard Components Index', () => {
  it('should export all dashboard components', async () => {
    const dashboardComponents = await import('@/components/dashboard')
    
    expect(dashboardComponents.PortfolioSummary).toBeDefined()
    expect(dashboardComponents.AssetAllocation).toBeDefined()
    expect(dashboardComponents.GoalProgress).toBeDefined()
    expect(dashboardComponents.TopPerformers).toBeDefined()
  })
})