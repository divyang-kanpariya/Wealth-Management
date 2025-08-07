'use server'

import { prisma } from '@/lib/prisma'
import { CacheInvalidation } from '../cache-invalidation'

export type BulkOperationResult = {
  success: boolean
  error?: string
  data?: {
    successCount: number
    failureCount: number
    errors?: string[]
  }
}

/**
 * Bulk delete investments
 */
export async function bulkDeleteInvestmentsBatch(investmentIds: string[]): Promise<BulkOperationResult> {
  try {
    const result = await prisma.investment.deleteMany({
      where: {
        id: {
          in: investmentIds
        }
      }
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateInvestments()
    
    return {
      success: true,
      data: {
        successCount: result.count,
        failureCount: 0
      }
    }
  } catch (error) {
    console.error('Error bulk deleting investments:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete investments',
      data: {
        successCount: 0,
        failureCount: investmentIds.length
      }
    }
  }
}

/**
 * Bulk update investment goals
 */
export async function bulkUpdateInvestmentGoals(
  investmentIds: string[], 
  goalId: string | null
): Promise<BulkOperationResult> {
  try {
    const result = await prisma.investment.updateMany({
      where: {
        id: {
          in: investmentIds
        }
      },
      data: {
        goalId: goalId || undefined
      }
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateInvestments()
    CacheInvalidation.invalidateGoals()
    
    return {
      success: true,
      data: {
        successCount: result.count,
        failureCount: 0
      }
    }
  } catch (error) {
    console.error('Error bulk updating investment goals:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update investment goals',
      data: {
        successCount: 0,
        failureCount: investmentIds.length
      }
    }
  }
}

/**
 * Process SIP transactions (for scheduled processing)
 */
export async function processSipTransactions(): Promise<BulkOperationResult> {
  try {
    // This would typically call the existing SIP processing logic
    // For now, we'll just return a placeholder
    console.log('Processing SIP transactions...')
    
    // Invalidate caches after processing
    CacheInvalidation.invalidateSIPs()
    CacheInvalidation.invalidateDashboard()
    
    return {
      success: true,
      data: {
        successCount: 0, // Would be actual count from processing
        failureCount: 0
      }
    }
  } catch (error) {
    console.error('Error processing SIP transactions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process SIP transactions',
      data: {
        successCount: 0,
        failureCount: 0
      }
    }
  }
}