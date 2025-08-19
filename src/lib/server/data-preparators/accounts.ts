import { prisma } from '@/lib/prisma'
import { BaseDataPreparator, PageDataBase } from './base'
import { Account, Investment } from '@/types'


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



export class AccountsDataPreparator extends BaseDataPreparator {
  private readonly CACHE_KEY = 'accounts-data'

  async prepare(): Promise<AccountsPageData> {
    const startTime = Date.now()
    
    try {
      // Always fetch fresh user data from database - no caching for user CRUD operations
      console.log(`[AccountsDataPreparator] Fetching fresh user data (no cache)`)
      const freshData = await this.fetchFreshData()
      
      console.log(`[AccountsDataPreparator] Fresh data fetched in ${Date.now() - startTime}ms`)
      return freshData

    } catch (error) {
      console.error('Accounts data preparation failed:', error)
      
      // Return minimal fallback data
      return this.getFallbackData()
    }
  }

  private async fetchFreshData(): Promise<AccountsPageData> {
    try {
      // Always fetch fresh user data from database - no caching for user CRUD operations
      const accounts = await this.fetchAccounts()

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

  // No cache invalidation needed - user data is always fetched fresh
  static invalidateCache(): void {
    console.log('[AccountsDataPreparator] No cache invalidation needed - user data always fresh')
  }

  // Method to force refresh (only affects pricing data)
  async forceRefresh(): Promise<AccountsPageData> {
    // Set global flag to force refresh pricing data
    ;(global as any).forceRefreshPrices = true
    const result = await this.prepare()
    // Reset flag after use
    ;(global as any).forceRefreshPrices = false
    return result
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