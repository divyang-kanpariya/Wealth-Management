import { prisma } from '@/lib/prisma'
import { calculateSipValue } from '@/lib/calculations'
import { BaseDataPreparator, PageDataBase } from './base'
import { 
  SIP, 
  SIPWithCurrentValue,
  SIPTransaction,
  Goal, 
  Account
} from '@/types'

import { notFound } from 'next/navigation'

export interface SIPDetailPageData extends PageDataBase {
  sip: SIP
  sipWithValue: SIPWithCurrentValue
  transactions: SIPTransaction[]
  goals: Goal[]
  accounts: Account[]
  currentPrice?: number
  priceData: Map<string, number>
  lastPriceUpdate: Date
}

export class SIPDetailDataPreparator extends BaseDataPreparator {
  async prepare(sipId: string): Promise<SIPDetailPageData> {
    const startTime = Date.now()
    
    try {
      // Fetch SIP data with caching (fallback to direct fetch in test environment)
      let sipData: any
      let goals: any[]
      let accounts: any[]

      // Always fetch fresh user data from database - no caching for user CRUD operations
      console.log(`[SIPDetailDataPreparator] Fetching fresh user data (no cache)`)
      const [sipResult, goalsResult, accountsResult] = await Promise.all([
        this.fetchSIP(sipId),
        this.fetchGoals(),
        this.fetchAccounts()
      ])

      sipData = sipResult
      goals = goalsResult
      accounts = accountsResult
      
      if (!sipData) {
        notFound()
      }

      // Transform data to match TypeScript types
      const { transactions, ...sipWithoutTransactions } = sipData
      const transformedSip = this.transformSip(sipWithoutTransactions)
      const transformedTransactions = this.transformTransactions(transactions || [])
      const transformedGoals = this.transformGoals(goals)
      const transformedAccounts = this.transformAccounts(accounts)

      // Check if force refresh is requested
      const forceRefresh = (global as any).forceRefreshPrices || false

      // Get price data for this SIP if it has a symbol (mutual fund NAV)
      let priceData: Map<string, number>
      let currentPrice: number | undefined
      
      try {
        if (sipData.symbol) {
          priceData = await this.fetchPriceData([], [sipData], forceRefresh)
          currentPrice = priceData.get(sipData.symbol)
        } else {
          priceData = new Map()
          // Use the latest transaction NAV as current price if no symbol
          currentPrice = transformedTransactions[0]?.nav
        }
      } catch (priceError) {
        console.error('Price data fetch failed, using latest transaction NAV:', priceError)
        priceData = new Map()
        currentPrice = transformedTransactions[0]?.nav
      }

      // Calculate SIP value with current price
      const sipWithValue = calculateSipValue(transformedSip, transformedTransactions, currentPrice)

      console.log(`[SIPDetailDataPreparator] Fresh data prepared in ${Date.now() - startTime}ms`)

      return {
        timestamp: new Date(),
        sip: transformedSip,
        sipWithValue,
        transactions: transformedTransactions,
        goals: transformedGoals,
        accounts: transformedAccounts,
        currentPrice,
        priceData,
        lastPriceUpdate: new Date()
      }

    } catch (error) {
      console.error('SIP detail data preparation failed:', error)
      
      // If it's a Next.js notFound error, re-throw it
      if (error && typeof error === 'object' && 'digest' in error) {
        throw error
      }
      
      // If it's our test notFound error, re-throw it
      if (error instanceof Error && error.message === 'NEXT_NOT_FOUND') {
        throw error
      }
      
      // For other errors, return fallback data or throw
      throw new Error('Failed to prepare SIP detail data')
    }
  }

  private async fetchSIP(sipId: string) {
    return await prisma.sIP.findUnique({
      where: { id: sipId },
      include: {
        goal: true,
        account: true,
        transactions: {
          orderBy: {
            transactionDate: 'desc'
          }
        }
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

  private transformSip(sip: any): SIP {
    return {
      ...sip,
      endDate: sip.endDate ?? undefined,
      goalId: sip.goalId ?? undefined,
      notes: sip.notes ?? undefined,
      goal: sip.goal ? {
        ...sip.goal,
        priority: sip.goal.priority ?? undefined,
        description: sip.goal.description ?? undefined,
      } : undefined,
      account: sip.account ? {
        ...sip.account,
        notes: sip.account.notes ?? undefined,
      } : sip.account,
    }
  }

  private transformTransactions(transactions: any[]): SIPTransaction[] {
    return transactions.map(txn => ({
      ...txn,
      errorMessage: txn.errorMessage ?? undefined
    }))
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

  // No cache invalidation needed - user data is always fetched fresh
  static invalidateCache(sipId: string): void {
    console.log(`[SIPDetailDataPreparator] No cache invalidation needed - user data always fresh`)
  }
}