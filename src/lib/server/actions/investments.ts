'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { 
  validateInvestment, 
  validateUpdateInvestment,
  investmentSchema,
  updateInvestmentSchema 
} from '@/lib/validations'
import { CacheInvalidation } from '../cache-invalidation'

export type InvestmentActionResult = {
  success: boolean
  error?: string
  data?: any
}

/**
 * Create a new investment
 */
export async function createInvestment(formData: FormData): Promise<InvestmentActionResult> {
  try {
    // Extract data from FormData
    const data = {
      type: formData.get('type') as string,
      name: formData.get('name') as string,
      symbol: formData.get('symbol') as string || undefined,
      units: formData.get('units') ? Number(formData.get('units')) : undefined,
      buyPrice: formData.get('buyPrice') ? Number(formData.get('buyPrice')) : undefined,
      totalValue: formData.get('totalValue') ? Number(formData.get('totalValue')) : undefined,
      buyDate: new Date(formData.get('buyDate') as string),
      goalId: formData.get('goalId') as string || null,
      accountId: formData.get('accountId') as string,
      notes: formData.get('notes') as string || undefined,
    }

    // Validate the data
    const validatedData = validateInvestment(data)
    
    // Transform null values to undefined for Prisma and remove undefined fields
    const { goalId, ...restData } = validatedData
    const transformedData = {
      ...restData,
      ...(goalId && goalId !== null ? { goalId } : {})
    }
    
    // Create the investment
    const investment = await prisma.investment.create({
      data: transformedData as any,
      include: {
        goal: true,
        account: true,
      },
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateInvestments()
    
    return {
      success: true,
      data: investment
    }
  } catch (error) {
    console.error('Error creating investment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create investment'
    }
  }
}

/**
 * Create investment from JSON data (for programmatic use)
 */
export async function createInvestmentFromData(data: any): Promise<InvestmentActionResult> {
  try {
    const validatedData = validateInvestment(data)
    
    // Transform null values to undefined for Prisma and remove undefined fields
    const { goalId, ...restData } = validatedData
    const transformedData = {
      ...restData,
      ...(goalId && goalId !== null ? { goalId } : {})
    }
    
    const investment = await prisma.investment.create({
      data: transformedData as any,
      include: {
        goal: true,
        account: true,
      },
    })
    
    CacheInvalidation.invalidateInvestments()
    
    return {
      success: true,
      data: investment
    }
  } catch (error) {
    console.error('Error creating investment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create investment'
    }
  }
}

/**
 * Update an existing investment
 */
export async function updateInvestment(id: string, formData: FormData): Promise<InvestmentActionResult> {
  try {
    // Extract data from FormData
    const data = {
      type: formData.get('type') as string || undefined,
      name: formData.get('name') as string || undefined,
      symbol: formData.get('symbol') as string || undefined,
      units: formData.get('units') ? Number(formData.get('units')) : undefined,
      buyPrice: formData.get('buyPrice') ? Number(formData.get('buyPrice')) : undefined,
      totalValue: formData.get('totalValue') ? Number(formData.get('totalValue')) : undefined,
      buyDate: formData.get('buyDate') ? new Date(formData.get('buyDate') as string) : undefined,
      goalId: formData.get('goalId') as string || null,
      accountId: formData.get('accountId') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    )

    // Validate the data
    const validatedData = validateUpdateInvestment(cleanData)
    
    // Transform null values to undefined for Prisma
    const transformedData = {
      ...validatedData,
      goalId: validatedData.goalId === null ? undefined : validatedData.goalId,
    }
    
    // Update the investment
    const updatedInvestment = await prisma.investment.update({
      where: { id },
      data: transformedData,
      include: {
        goal: true,
        account: true,
      },
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateInvestments()
    
    return {
      success: true,
      data: updatedInvestment
    }
  } catch (error) {
    console.error('Error updating investment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update investment'
    }
  }
}

/**
 * Update investment from JSON data (for programmatic use)
 */
export async function updateInvestmentFromData(id: string, data: any): Promise<InvestmentActionResult> {
  try {
    const validatedData = validateUpdateInvestment(data)
    
    // Transform null values to undefined for Prisma
    const transformedData = {
      ...validatedData,
      goalId: validatedData.goalId === null ? undefined : validatedData.goalId,
    }
    
    const updatedInvestment = await prisma.investment.update({
      where: { id },
      data: transformedData,
      include: {
        goal: true,
        account: true,
      },
    })
    
    CacheInvalidation.invalidateInvestments()
    
    return {
      success: true,
      data: updatedInvestment
    }
  } catch (error) {
    console.error('Error updating investment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update investment'
    }
  }
}

/**
 * Delete an investment
 */
export async function deleteInvestment(id: string): Promise<InvestmentActionResult> {
  try {
    await prisma.investment.delete({
      where: { id },
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateInvestments()
    
    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting investment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete investment'
    }
  }
}

/**
 * Bulk delete investments
 */
export async function bulkDeleteInvestments(ids: string[]): Promise<InvestmentActionResult> {
  try {
    await prisma.investment.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateInvestments()
    
    return {
      success: true,
      data: { deletedCount: ids.length }
    }
  } catch (error) {
    console.error('Error bulk deleting investments:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete investments'
    }
  }
}

/**
 * Update investment goal assignment
 */
export async function updateInvestmentGoal(investmentId: string, goalId: string | null): Promise<InvestmentActionResult> {
  try {
    const updatedInvestment = await prisma.investment.update({
      where: { id: investmentId },
      data: { goalId: goalId || undefined },
      include: {
        goal: true,
        account: true,
      },
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateInvestments()
    CacheInvalidation.invalidateGoals()
    
    return {
      success: true,
      data: updatedInvestment
    }
  } catch (error) {
    console.error('Error updating investment goal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update investment goal'
    }
  }
}