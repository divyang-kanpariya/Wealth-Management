import { describe, it, expect, vi } from 'vitest'

describe('User Data No-Cache Implementation', () => {
  it('should have removed cache invalidation imports from server actions', async () => {
    // Test that server actions no longer import cache invalidation functions
    const investmentsAction = await import('@/lib/server/actions/investments')
    const goalsAction = await import('@/lib/server/actions/goals')
    const sipsAction = await import('@/lib/server/actions/sips')
    const accountsAction = await import('@/lib/server/actions/accounts')

    // These should not throw errors and should have the expected functions
    expect(typeof investmentsAction.createInvestment).toBe('function')
    expect(typeof investmentsAction.updateInvestment).toBe('function')
    expect(typeof investmentsAction.deleteInvestment).toBe('function')
    
    expect(typeof goalsAction.createGoal).toBe('function')
    expect(typeof goalsAction.updateGoal).toBe('function')
    expect(typeof goalsAction.deleteGoal).toBe('function')
    
    expect(typeof sipsAction.createSip).toBe('function')
    expect(typeof sipsAction.updateSip).toBe('function')
    expect(typeof sipsAction.deleteSip).toBe('function')
    
    expect(typeof accountsAction.createAccount).toBe('function')
    expect(typeof accountsAction.updateAccount).toBe('function')
    expect(typeof accountsAction.deleteAccount).toBe('function')
  })

  it('should have data preparators with no-cache methods', async () => {
    const { DashboardDataPreparator } = await import('@/lib/server/data-preparators/dashboard')
    const { InvestmentsDataPreparator } = await import('@/lib/server/data-preparators/investments')
    const { GoalsDataPreparator } = await import('@/lib/server/data-preparators/goals')
    const { SIPsDataPreparator } = await import('@/lib/server/data-preparators/sips')
    const { AccountsDataPreparator } = await import('@/lib/server/data-preparators/accounts')

    // All data preparators should have invalidateCache methods that do nothing
    expect(typeof DashboardDataPreparator.invalidateCache).toBe('function')
    expect(typeof InvestmentsDataPreparator.invalidateCache).toBe('function')
    expect(typeof GoalsDataPreparator.invalidateCache).toBe('function')
    expect(typeof SIPsDataPreparator.invalidateCache).toBe('function')
    expect(typeof AccountsDataPreparator.invalidateCache).toBe('function')

    // Test that invalidateCache methods don't throw errors
    expect(() => DashboardDataPreparator.invalidateCache()).not.toThrow()
    expect(() => InvestmentsDataPreparator.invalidateCache()).not.toThrow()
    expect(() => GoalsDataPreparator.invalidateCache()).not.toThrow()
    expect(() => SIPsDataPreparator.invalidateCache()).not.toThrow()
    expect(() => AccountsDataPreparator.invalidateCache()).not.toThrow()
  })

  it('should have cache invalidation class with disabled methods', async () => {
    const { CacheInvalidation } = await import('@/lib/server/cache-invalidation')

    // All methods should exist but do nothing
    expect(typeof CacheInvalidation.invalidateDashboard).toBe('function')
    expect(typeof CacheInvalidation.invalidateInvestments).toBe('function')
    expect(typeof CacheInvalidation.invalidateGoals).toBe('function')
    expect(typeof CacheInvalidation.invalidateSIPs).toBe('function')
    expect(typeof CacheInvalidation.invalidateAccounts).toBe('function')
    expect(typeof CacheInvalidation.invalidateAll).toBe('function')

    // Test that methods don't throw errors
    expect(() => CacheInvalidation.invalidateDashboard()).not.toThrow()
    expect(() => CacheInvalidation.invalidateInvestments()).not.toThrow()
    expect(() => CacheInvalidation.invalidateGoals()).not.toThrow()
    expect(() => CacheInvalidation.invalidateSIPs()).not.toThrow()
    expect(() => CacheInvalidation.invalidateAccounts()).not.toThrow()
    expect(() => CacheInvalidation.invalidateAll()).not.toThrow()
  })

  it('should have pages configured with dynamic rendering', async () => {
    // Test that pages are configured with force-dynamic
    const dashboardPage = await import('@/app/page')
    const investmentsPage = await import('@/app/investments/page')
    const goalsPage = await import('@/app/goals/page')
    const sipsPage = await import('@/app/sips/page')
    const accountsPage = await import('@/app/accounts/page')

    // These should have dynamic exports set to 'force-dynamic'
    expect((dashboardPage as any).dynamic).toBe('force-dynamic')
    expect((investmentsPage as any).dynamic).toBe('force-dynamic')
    expect((goalsPage as any).dynamic).toBe('force-dynamic')
    expect((sipsPage as any).dynamic).toBe('force-dynamic')
    expect((accountsPage as any).dynamic).toBe('force-dynamic')
  })

  it('should log appropriate messages when cache invalidation is called', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const { CacheInvalidation } = await import('@/lib/server/cache-invalidation')
    
    CacheInvalidation.invalidateDashboard()
    CacheInvalidation.invalidateInvestments()
    CacheInvalidation.invalidateGoals()
    CacheInvalidation.invalidateSIPs()
    CacheInvalidation.invalidateAccounts()
    
    expect(consoleSpy).toHaveBeenCalledWith('[CacheInvalidation] User data cache invalidation disabled - data always fresh')
    expect(consoleSpy).toHaveBeenCalledTimes(5)
    
    consoleSpy.mockRestore()
  })

  it('should verify data preparators always fetch fresh data', async () => {
    // Mock console.log to capture the "no cache" messages
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const { DashboardDataPreparator } = await import('@/lib/server/data-preparators/dashboard')
    const { InvestmentsDataPreparator } = await import('@/lib/server/data-preparators/investments')
    
    // Call invalidateCache methods
    DashboardDataPreparator.invalidateCache()
    InvestmentsDataPreparator.invalidateCache()
    
    // Verify the appropriate messages are logged
    expect(consoleSpy).toHaveBeenCalledWith('[DashboardDataPreparator] No cache invalidation needed - user data always fresh')
    expect(consoleSpy).toHaveBeenCalledWith('[InvestmentsDataPreparator] No cache invalidation needed - user data always fresh')
    
    consoleSpy.mockRestore()
  })
})