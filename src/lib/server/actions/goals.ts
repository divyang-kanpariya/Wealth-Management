'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { 
  validateGoal, 
  validateUpdateGoal,
  goalSchema,
  updateGoalSchema 
} from '@/lib/validations'


export type GoalActionResult = {
  success: boolean
  error?: string
  data?: any
}

/**
 * Create a new goal
 */
export async function createGoal(formData: FormData): Promise<GoalActionResult> {
  try {
    // Extract data from FormData
    const data = {
      name: formData.get('name') as string,
      targetAmount: Number(formData.get('targetAmount')),
      targetDate: new Date(formData.get('targetDate') as string),
      priority: formData.get('priority') ? Number(formData.get('priority')) : 1,
      description: formData.get('description') as string || undefined,
    }

    // Validate the data
    const validatedData = validateGoal(data)
    
    // Create the goal
    const goal = await prisma.goal.create({
      data: validatedData,
      include: {
        investments: true,
      },
    })
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: goal
    }
  } catch (error) {
    console.error('Error creating goal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create goal'
    }
  }
}

/**
 * Create goal from JSON data (for programmatic use)
 */
export async function createGoalFromData(data: any): Promise<GoalActionResult> {
  try {
    const validatedData = validateGoal(data)
    
    const goal = await prisma.goal.create({
      data: validatedData,
      include: {
        investments: true,
      },
    })
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: goal
    }
  } catch (error) {
    console.error('Error creating goal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create goal'
    }
  }
}

/**
 * Update an existing goal
 */
export async function updateGoal(id: string, formData: FormData): Promise<GoalActionResult> {
  try {
    // Extract data from FormData
    const data = {
      name: formData.get('name') as string || undefined,
      targetAmount: formData.get('targetAmount') ? Number(formData.get('targetAmount')) : undefined,
      targetDate: formData.get('targetDate') ? new Date(formData.get('targetDate') as string) : undefined,
      priority: formData.get('priority') ? Number(formData.get('priority')) : undefined,
      description: formData.get('description') as string || undefined,
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    )

    // Validate the data
    const validatedData = validateUpdateGoal(cleanData)
    
    // Check if goal exists
    const existingGoal = await prisma.goal.findUnique({
      where: { id },
    })
    
    if (!existingGoal) {
      return {
        success: false,
        error: 'Goal not found'
      }
    }
    
    // Update the goal
    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: validatedData,
      include: {
        investments: true,
      },
    })
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: updatedGoal
    }
  } catch (error) {
    console.error('Error updating goal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update goal'
    }
  }
}

/**
 * Update goal from JSON data (for programmatic use)
 */
export async function updateGoalFromData(id: string, data: any): Promise<GoalActionResult> {
  try {
    const validatedData = validateUpdateGoal(data)
    
    // Check if goal exists
    const existingGoal = await prisma.goal.findUnique({
      where: { id },
    })
    
    if (!existingGoal) {
      return {
        success: false,
        error: 'Goal not found'
      }
    }
    
    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: validatedData,
      include: {
        investments: true,
      },
    })
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: updatedGoal
    }
  } catch (error) {
    console.error('Error updating goal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update goal'
    }
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(id: string): Promise<GoalActionResult> {
  try {
    // Check if goal exists
    const existingGoal = await prisma.goal.findUnique({
      where: { id },
      include: {
        investments: true,
      },
    })
    
    if (!existingGoal) {
      return {
        success: false,
        error: 'Goal not found'
      }
    }
    
    // If goal has investments, update them to remove the goal association
    if (existingGoal.investments.length > 0) {
      await prisma.investment.updateMany({
        where: { goalId: id },
        data: { goalId: null as any },
      })
    }
    
    // Delete the goal
    await prisma.goal.delete({
      where: { id },
    })
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting goal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete goal'
    }
  }
}

/**
 * Assign investments to a goal
 */
export async function assignInvestmentsToGoal(goalId: string, investmentIds: string[]): Promise<GoalActionResult> {
  try {
    // Check if goal exists
    const existingGoal = await prisma.goal.findUnique({
      where: { id: goalId },
    })
    
    if (!existingGoal) {
      return {
        success: false,
        error: 'Goal not found'
      }
    }
    
    // Update investments to assign them to the goal
    await prisma.investment.updateMany({
      where: {
        id: {
          in: investmentIds
        }
      },
      data: {
        goalId: goalId
      }
    })
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: { assignedCount: investmentIds.length }
    }
  } catch (error) {
    console.error('Error assigning investments to goal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign investments to goal'
    }
  }
}

/**
 * Remove investments from a goal
 */
export async function removeInvestmentsFromGoal(investmentIds: string[]): Promise<GoalActionResult> {
  try {
    // Update investments to remove goal assignment
    await prisma.investment.updateMany({
      where: {
        id: {
          in: investmentIds
        }
      },
      data: {
        goalId: null as any
      }
    })
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: { removedCount: investmentIds.length }
    }
  } catch (error) {
    console.error('Error removing investments from goal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove investments from goal'
    }
  }
}