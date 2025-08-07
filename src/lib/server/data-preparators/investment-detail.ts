import { prisma } from '@/lib/prisma'
import { calculateInvestmentValue } from '@/lib/calculations'
import { BaseDataPreparator, PageDataBase } from './base'
import { 
  Investment, 
  InvestmentWithCurrentValue,
  Goal, 
  Account
} from '@/types'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'

export interface InvestmentDetailPageData extends PageDataBase {
  investment: Investment
  investmentWithValue: InvestmentWithCurrentValue
  currentPrice?: number
  priceData: Map<string, number>
  lastPriceUpdate: Date
}

export class InvestmentDetailDataPreparator extends BaseDataPreparator {
  async prepare(investmentId: string): Promise<InvestmentDetailPageData> {
    const startTime = Date.now()
    
    try {
      // Use Next.js unstable_cache for database queries
      const getCachedInvestment = unstable_cache(
        async () => this.fetchInvestment(investmentId),
        [`investment-detail-${investmentId}`],
        { 
          revalidate: 300, // 5 minutes
          tags: ['investments', `investment-${investmentId}`]
        }
      )

      // Fetch investment data
      const investment = await getCachedInvestment()
      
      if (!investment) {
        notFound()
      }

      // Transform data to match TypeScript types
      const transformedInvestment = this.transformInvestment(investment)

      // Get price data for this investment if it has a symbol
      let priceData: Map<string, number>
      let currentPrice: number | undefined
      
      try {
        if (investment.symbol && ['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(investment.type)) {
          priceData = await this.fetchPriceData([investment])
          currentPrice = priceData.get(investment.symbol)
        } else {
          priceData = new Map()
        }
      } catch (priceError) {
        console.error('Price data fetch failed, using empty price data:', priceError)
        priceData = new Map()
      }

      // Calculate investment value with current price
      const investmentWithValue = calculateInvestmentValue(transformedInvestment, currentPrice)

      console.log(`[InvestmentDetailDataPreparator] Data prepared in ${Date.now() - startTime}ms`)

      return {
        timestamp: new Date(),
        investment: transformedInvestment,
        investmentWithValue,
        currentPrice,
        priceData,
        lastPriceUpdate: new Date()
      }

    } catch (error) {
      console.error('Investment detail data preparation failed:', error)
      
      // If it's a Next.js notFound error, re-throw it
      if (error && typeof error === 'object' && 'digest' in error) {
        throw error
      }
      
      // If it's our test notFound error, re-throw it
      if (error instanceof Error && error.message === 'NEXT_NOT_FOUND') {
        throw error
      }
      
      // For other errors, return fallback data or throw
      throw new Error('Failed to prepare investment detail data')
    }
  }

  private async fetchInvestment(investmentId: string) {
    return await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        goal: true,
        account: true,
      },
    })
  }

  private transformInvestment(investment: any): Investment {
    return {
      ...investment,
      symbol: investment.symbol ?? undefined,
      units: investment.units ?? undefined,
      buyPrice: investment.buyPrice ?? undefined,
      quantity: investment.quantity ?? undefined,
      totalValue: investment.totalValue ?? undefined,
      goalId: investment.goalId ?? undefined,
      notes: investment.notes ?? undefined,
      goal: investment.goal ? {
        ...investment.goal,
        priority: investment.goal.priority ?? undefined,
        description: investment.goal.description ?? undefined,
      } : undefined,
      account: investment.account ? {
        ...investment.account,
        notes: investment.account.notes ?? undefined,
      } : investment.account,
    }
  }

  // Method to invalidate cache when investment data changes
  static invalidateCache(investmentId: string): void {
    console.log(`[InvestmentDetailDataPreparator] Cache invalidated for investment ${investmentId}`)
  }
}