import { prisma } from '@/lib/prisma'
import { BaseDataPreparator, PageDataBase } from './base'
import { Account, Investment } from '@/types'
import { unstable_cache } from 'next/cache'

export interface AccountWithTotals extends Account {
  totalValue: number
  investmentCount: number
}

export interface AccountsPageData extends PageDataBase {
  accounts: AccountWithTotals[]
  totalPortfolioValue: number
  totalInvestments: number
  totalAccounts: number
}

// In-memory cache for accounts data
interface CacheEntry {
  data: AccountsPageData
  timestamp: number
  expiresAt: number
}

class AccountsCache {
  private static instance: AccountsCache
  private cache: Map<string, CacheEntry> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly STALE_WHILE_REVALIDATE = 10 * 60 * 1000 // 10 minutes

  static getInstance(): AccountsCache {
    if (!AccountsCache.instance) {
      AccountsCache.instance = new AccountsCache()
    }
    return AccountsCache.instance
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    
    // If expired, remove from cache
    if (now > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry
  }

  set(key: string, data: AccountsPageData): void {
    const now = Date.now()
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    }
    
    this.cache.set(key, entry)
    
    // Clean up expired entries periodically
    this.cleanupExpired()
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return true

    const now = Date.now()
    return now > (entry.timestamp + this.CACHE_DURATION)
  }

  getStale(key: string): CacheEntry | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    
    // Return stale data if within stale-while-revalidate window
    if (now <= (entry.timestamp + this.STALE_WHILE_REVALIDATE)) {
      return entry
    }

    // Remove if too old
    this.cache.delete(key)
    return null
  }

  private cleanupExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export class AccountsDataPreparator extends BaseDataPreparator {
  private cache = AccountsCache.getInstance()
  private readonly CACHE_KEY = 'accounts-data'

  async prepare(): Promise<AccountsPageData> {
    const startTime = Date.now()
    
    try {
      // Try to get fresh data from cache
      const cachedEntry = this.cache.get(this.CACHE_KEY)
      if (cachedEntry) {
        console.log(`[AccountsDataPreparator] Cache HIT - served in ${Date.now() - startTime}ms`)
        return cachedEntry.data
      }

      // Check if we have stale data while we fetch fresh data
      const staleEntry = this.cache.getStale(this.CACHE_KEY)
      
      // If we have stale data, return it immediately and refresh in background
      if (staleEntry) {
        console.log(`[AccountsDataPreparator] Serving stale data while revalidating - served in ${Date.now() - startTime}ms`)
        
        // Refresh in background (don't await)
        this.refreshDataInBackground().catch(error => {
          console.error('Background refresh failed:', error)
        })
        
        return staleEntry.data
      }

      // No cached data available, fetch fresh data
      console.log(`[AccountsDataPreparator] Cache MISS - fetching fresh data`)
      const freshData = await this.fetchFreshData()
      
      // Cache the fresh data
      this.cache.set(this.CACHE_KEY, freshData)
      
      console.log(`[AccountsDataPreparator] Fresh data fetched and cached in ${Date.now() - startTime}ms`)
      return freshData

    } catch (error) {
      console.error('Accounts data preparation failed:', error)
      
      // Try to return stale data as fallback
      const staleEntry = this.cache.getStale(this.CACHE_KEY)
      if (staleEntry) {
        console.log(`[AccountsDataPreparator] Error occurred, serving stale data as fallback`)
        return staleEntry.data
      }
      
      // Last resort: return minimal fallback data
      return this.getFallbackData()
    }
  }

  private async refreshDataInBackground(): Promise<void> {
    try {
      const freshData = await this.fetchFreshData()
      this.cache.set(this.CACHE_KEY, freshData)
      console.log(`[AccountsDataPreparator] Background refresh completed`)
    } catch (error) {
      console.error('Background refresh failed:', error)
    }
  }

  private async fetchFreshData(): Promise<AccountsPageData> {
    try {
      // Use Next.js unstable_cache for database queries with shorter cache duration
      const getCachedAccounts = unstable_cache(
        async () => this.fetchAccounts(),
        ['accounts-list'],
        { 
          revalidate: 300, // 5 minutes
          tags: ['accounts', 'investments']
        }
      )

      // Fetch accounts with investments
      const accounts = await getCachedAccounts()

      // Transform accounts to include totals
      const accountsWithTotals = accounts.map(account => this.calculateAccountTotals(account))

      // Calculate summary statistics
      const totalPortfolioValue = accountsWithTotals.reduce((sum, account) => sum + account.totalValue, 0)
      const totalInvestments = accountsWithTotals.reduce((sum, account) => sum + account.investmentCount, 0)
      const totalAccounts = accountsWithTotals.length

      return {
        timestamp: new Date(),
        cacheKey: this.CACHE_KEY,
        accounts: accountsWithTotals,
        totalPortfolioValue,
        totalInvestments,
        totalAccounts
      }
    } catch (error) {
      console.error('Fresh accounts data fetch failed:', error)
      throw error
    }
  }

  private async fetchAccounts() {
    return await prisma.account.findMany({
      include: {
        investments: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  }

  private calculateAccountTotals(account: any): AccountWithTotals {
    const investments = account.investments || []
    let totalValue = 0

    investments.forEach((investment: Investment) => {
      if (investment.units && investment.buyPrice) {
        // Unit-based calculation (stocks, mutual funds, crypto)
        totalValue += investment.units * investment.buyPrice
      } else if (investment.totalValue) {
        // Total value calculation (real estate, jewelry, etc.)
        totalValue += investment.totalValue
      }
    })

    return {
      ...account,
      totalValue,
      investmentCount: investments.length,
    }
  }

  // Method to invalidate cache when data changes
  static invalidateCache(): void {
    const cache = AccountsCache.getInstance()
    cache.invalidate('accounts')
    console.log('[AccountsDataPreparator] Cache invalidated')
  }

  // Method to force refresh
  async forceRefresh(): Promise<AccountsPageData> {
    this.cache.invalidate(this.CACHE_KEY)
    return this.prepare()
  }

  private async getFallbackData(): Promise<AccountsPageData> {
    // Return minimal fallback data in case of errors
    return {
      timestamp: new Date(),
      accounts: [],
      totalPortfolioValue: 0,
      totalInvestments: 0,
      totalAccounts: 0
    }
  }
}