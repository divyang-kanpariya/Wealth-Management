import { prisma } from '@/lib/prisma'
import { 
  calculateInvestmentsWithPrices,
  calculateGoalProgress
} from '@/lib/calculations'
import { BaseDataPreparator, PageDataBase } from './base'
import { 
  Goal, 
  Investment,
  GoalProgress,
  InvestmentWithCurrentValue
} from '@/types'


export interface GoalsPageData extends PageDataBase {
  goals: Goal[]
  goalProgress: GoalProgress[]
  totalGoals: number
  totalTargetAmount: number
  totalCurrentValue: number
  totalProgress: number
  priceData: Map<string, number>
  lastPriceUpdate: Date
}

export class GoalsDataPreparator extends BaseDataPreparator {
  async prepare(): Promise<GoalsPageData> {
    const startTime = Date.now()
    
    try {
      // Always fetch fresh user data from database - no caching for user CRUD operations
      console.log(`[GoalsDataPreparator] Fetching fresh user data (no cache)`)
      const [goals, investments] = await Promise.all([
        this.fetchGoals(),
        this.fetchInvestments()
      ])

      // Check if force refresh is requested
      const forceRefresh = (global as any).forceRefreshPrices || false

      // Get price data for all investments
      let priceData: Map<string, number>
      try {
        priceData = await this.fetchPriceData(investments, [], forceRefresh)
      } catch (priceError) {
        console.error('Price data fetch failed, using empty price data:', priceError)
        priceData = new Map()
      }

      // Transform data to match TypeScript types
      const transformedGoals = this.transformGoals(goals)
      const transformedInvestments = this.transformInvestments(investments)

      // Calculate investment values with current prices
      const investmentsWithValues = calculateInvestmentsWithPrices(transformedInvestments, priceData)

      // Calculate goal progress for each goal
      const goalProgress = transformedGoals.map(goal => 
        calculateGoalProgress(goal, investmentsWithValues)
      )

      // Calculate summary statistics
      const totalTargetAmount = transformedGoals.reduce((sum, goal) => sum + goal.targetAmount, 0)
      const totalCurrentValue = goalProgress.reduce((sum, progress) => sum + progress.currentValue, 0)
      const totalProgress = totalTargetAmount > 0 ? (totalCurrentValue / totalTargetAmount) * 100 : 0

      console.log(`[GoalsDataPreparator] Fresh data prepared in ${Date.now() - startTime}ms`)

      return {
        timestamp: new Date(),
        goals: transformedGoals,
        goalProgress,
        totalGoals: goals.length,
        totalTargetAmount,
        totalCurrentValue,
        totalProgress: Math.min(100, totalProgress), // Cap at 100%
        priceData,
        lastPriceUpdate: new Date()
      }

    } catch (error) {
      console.error('Goals data preparation failed:', error)
      
      // Return fallback data
      return this.getFallbackData()
    }
  }

  private async fetchGoals() {
    return await prisma.goal.findMany({
      include: {
        investments: {
          include: {
            account: true
          }
        },
      },
      orderBy: {
        targetDate: 'asc',
      },
    })
  }

  private async fetchInvestments() {
    return await prisma.investment.findMany({
      include: {
        goal: true,
        account: true,
      },
    })
  }

  private getFallbackData(): GoalsPageData {
    return {
      timestamp: new Date(),
      goals: [],
      goalProgress: [],
      totalGoals: 0,
      totalTargetAmount: 0,
      totalCurrentValue: 0,
      totalProgress: 0,
      priceData: new Map(),
      lastPriceUpdate: new Date()
    }
  }

  // No cache invalidation needed - user data is always fetched fresh
  static invalidateCache(): void {
    console.log('[GoalsDataPreparator] No cache invalidation needed - user data always fresh')
  }
}