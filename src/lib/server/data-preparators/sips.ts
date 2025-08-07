import { prisma } from '@/lib/prisma'
import { 
  calculateSipValue,
  calculateSipSummary
} from '@/lib/calculations'
import { BaseDataPreparator, PageDataBase } from './base'
import { 
  SIPWithCurrentValue, 
  SIP, 
  Goal, 
  Account,
  SIPSummary
} from '@/types'
import { unstable_cache } from 'next/cache'

export interface SIPsPageData extends PageDataBase {
  sips: SIP[]
  sipsWithValues: SIPWithCurrentValue[]
  goals: Goal[]
  accounts: Account[]
  summary: SIPSummary
  priceData: Map<string, number>
  lastPriceUpdate: Date
}

export class SIPsDataPreparator extends BaseDataPreparator {
  async prepare(): Promise<SIPsPageData> {
    const startTime = Date.now()
    
    try {
      // Use Next.js unstable_cache for database queries
      const getCachedSIPs = unstable_cache(
        async () => this.fetchSIPs(),
        ['sips-list'],
        { 
          revalidate: 300, // 5 minutes
          tags: ['sips']
        }
      )

      const getCachedGoals = unstable_cache(
        async () => this.fetchGoals(),
        ['sips-goals'],
        { 
          revalidate: 300, // 5 minutes
          tags: ['goals']
        }
      )

      const getCachedAccounts = unstable_cache(
        async () => this.fetchAccounts(),
        ['sips-accounts'],
        { 
          revalidate: 300, // 5 minutes
          tags: ['accounts']
        }
      )

      // Fetch all required data in parallel with caching
      const [sips, goals, accounts] = await Promise.all([
        getCachedSIPs(),
        getCachedGoals(),
        getCachedAccounts()
      ])

      // Get price data for all SIPs (mutual fund NAVs)
      let priceData: Map<string, number>
      try {
        priceData = await this.fetchPriceData([], sips)
      } catch (priceError) {
        console.error('Price data fetch failed, using empty price data:', priceError)
        priceData = new Map()
      }

      // Transform data to match TypeScript types
      const transformedSips = this.transformSips(sips)
      const transformedGoals = this.transformGoals(goals)
      const transformedAccounts = this.transformAccounts(accounts)

      // Calculate SIP values with current prices
      const sipsWithValues = transformedSips.map(sip => {
        const currentPrice = sip.symbol ? priceData.get(sip.symbol) : undefined
        return calculateSipValue(sip, sip.transactions || [], currentPrice)
      })

      // Calculate summary statistics
      const summary = calculateSipSummary(sipsWithValues)

      console.log(`[SIPsDataPreparator] Data prepared in ${Date.now() - startTime}ms`)

      return {
        timestamp: new Date(),
        sips: transformedSips,
        sipsWithValues,
        goals: transformedGoals,
        accounts: transformedAccounts,
        summary,
        priceData,
        lastPriceUpdate: new Date()
      }

    } catch (error) {
      console.error('SIPs data preparation failed:', error)
      
      // Return fallback data
      return this.getFallbackData()
    }
  }

  private async fetchSIPs() {
    return await prisma.sIP.findMany({
      include: {
        goal: true,
        account: true,
        transactions: {
          orderBy: {
            transactionDate: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  private async fetchGoals() {
    return await prisma.goal.findMany({
      include: {
        investments: true,
      },
    })
  }

  private async fetchAccounts() {
    return await prisma.account.findMany({
      include: {
        investments: true,
      },
    })
  }

  private transformAccounts(accounts: any[]) {
    return accounts.map(account => ({
      ...account,
      notes: account.notes ?? undefined,
      investments: account.investments?.map((investment: any) => ({
        ...investment,
        symbol: investment.symbol ?? undefined,
        units: investment.units ?? undefined,
        buyPrice: investment.buyPrice ?? undefined,
        quantity: investment.quantity ?? undefined,
        totalValue: investment.totalValue ?? undefined,
        goalId: investment.goalId ?? undefined,
        notes: investment.notes ?? undefined,
      })) || []
    }))
  }

  private getFallbackData(): SIPsPageData {
    return {
      timestamp: new Date(),
      sips: [],
      sipsWithValues: [],
      goals: [],
      accounts: [],
      summary: {
        totalSIPs: 0,
        activeSIPs: 0,
        totalMonthlyAmount: 0,
        totalInvested: 0,
        totalCurrentValue: 0,
        totalGainLoss: 0,
        totalGainLossPercentage: 0
      },
      priceData: new Map(),
      lastPriceUpdate: new Date()
    }
  }

  // Method to invalidate cache when data changes
  static invalidateCache(): void {
    // This would be called when SIPs are created/updated/deleted
    console.log('[SIPsDataPreparator] Cache invalidated')
  }
}