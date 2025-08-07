import { prisma } from '@/lib/prisma'
import { 
  calculateInvestmentsWithPrices,
  calculateGoalProgress
} from '@/lib/calculations'
import { BaseDataPreparator, PageDataBase } from './base'
import { 
  Goal, 
  Investment,
  InvestmentWithCurrentValue,
  GoalProgress
} from '@/types'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'

export interface GoalDetailPageData extends PageDataBase {
  goal: Goal
  goalProgress: GoalProgress
  investmentsWithValues: InvestmentWithCurrentValue[]
  priceData: Map<string, number>
  lastPriceUpdate: Date
  projections: {
    monthsToTarget: number
    requiredMonthlyInvestment: number
    projectedCompletionDate: Date
  }
}

export class GoalDetailDataPreparator extends BaseDataPreparator {
  async prepare(goalId: string): Promise<GoalDetailPageData> {
    const startTime = Date.now()
    
    try {
      // Use Next.js unstable_cache for database queries
      const getCachedGoal = unstable_cache(
        async () => this.fetchGoal(goalId),
        [`goal-detail-${goalId}`],
        { 
          revalidate: 300, // 5 minutes
          tags: ['goals', `goal-${goalId}`, 'investments']
        }
      )

      // Fetch goal data with investments
      const goal = await getCachedGoal()
      
      if (!goal) {
        notFound()
      }

      // Transform data to match TypeScript types
      const transformedGoal = this.transformGoal(goal)
      const transformedInvestments = this.transformInvestments(goal.investments || [])

      // Get price data for all investments in this goal
      let priceData: Map<string, number>
      try {
        priceData = await this.fetchPriceData(transformedInvestments)
      } catch (priceError) {
        console.error('Price data fetch failed, using empty price data:', priceError)
        priceData = new Map()
      }

      // Calculate investment values with current prices
      const investmentsWithValues = calculateInvestmentsWithPrices(transformedInvestments, priceData)

      // Calculate goal progress
      const goalProgress = calculateGoalProgress(transformedGoal, investmentsWithValues)

      // Calculate projections
      const projections = this.calculateProjections(transformedGoal, goalProgress)

      console.log(`[GoalDetailDataPreparator] Data prepared in ${Date.now() - startTime}ms`)

      return {
        timestamp: new Date(),
        goal: transformedGoal,
        goalProgress,
        investmentsWithValues,
        priceData,
        lastPriceUpdate: new Date(),
        projections
      }

    } catch (error) {
      console.error('Goal detail data preparation failed:', error)
      
      // If it's a not found error, re-throw it
      if (error && typeof error === 'object' && 'digest' in error) {
        throw error
      }
      
      // If the error message contains "Not found", re-throw it
      if (error instanceof Error && error.message.includes('Not found')) {
        throw error
      }
      
      // For other errors, return fallback data or throw
      throw new Error('Failed to prepare goal detail data')
    }
  }

  private async fetchGoal(goalId: string) {
    return await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        investments: {
          include: {
            account: true,
          },
        },
      },
    })
  }

  private transformGoal(goal: any): Goal {
    return {
      ...goal,
      priority: goal.priority ?? undefined,
      description: goal.description ?? undefined,
      investments: goal.investments?.map((investment: any) => ({
        ...investment,
        symbol: investment.symbol ?? undefined,
        units: investment.units ?? undefined,
        buyPrice: investment.buyPrice ?? undefined,
        quantity: investment.quantity ?? undefined,
        totalValue: investment.totalValue ?? undefined,
        goalId: investment.goalId ?? undefined,
        notes: investment.notes ?? undefined,
        account: investment.account ? {
          ...investment.account,
          notes: investment.account.notes ?? undefined,
        } : investment.account,
      })) || []
    }
  }

  private calculateProjections(goal: Goal, progress: GoalProgress) {
    const remainingAmount = goal.targetAmount - progress.currentValue
    const targetDate = new Date(goal.targetDate)
    const currentDate = new Date()
    
    // Calculate months remaining
    const monthsRemaining = Math.max(0, 
      (targetDate.getFullYear() - currentDate.getFullYear()) * 12 + 
      (targetDate.getMonth() - currentDate.getMonth())
    )

    // Calculate required monthly investment to reach target
    const requiredMonthlyInvestment = monthsRemaining > 0 ? remainingAmount / monthsRemaining : 0

    // Calculate projected completion date based on current progress rate
    let projectedCompletionDate = targetDate
    if (progress.currentValue > 0 && remainingAmount > 0) {
      // Estimate based on current investment rate (very basic projection)
      const monthsSinceStart = Math.max(1, 
        (currentDate.getFullYear() - new Date(goal.createdAt).getFullYear()) * 12 + 
        (currentDate.getMonth() - new Date(goal.createdAt).getMonth())
      )
      const currentMonthlyRate = progress.currentValue / monthsSinceStart
      
      if (currentMonthlyRate > 0) {
        const monthsToComplete = remainingAmount / currentMonthlyRate
        projectedCompletionDate = new Date()
        projectedCompletionDate.setMonth(projectedCompletionDate.getMonth() + Math.ceil(monthsToComplete))
      }
    }

    return {
      monthsToTarget: monthsRemaining,
      requiredMonthlyInvestment,
      projectedCompletionDate
    }
  }

  // Method to invalidate cache when goal data changes
  static invalidateCache(goalId: string): void {
    console.log(`[GoalDetailDataPreparator] Cache invalidated for goal ${goalId}`)
  }
}