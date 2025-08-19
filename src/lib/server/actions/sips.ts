'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { 
  validateSip, 
  validateUpdateSip,
  sipSchema,
  updateSipSchema 
} from '@/lib/validations'
import { calculateSipValue } from '@/lib/calculations'

import { SIPStatus } from '@prisma/client'

export type SipActionResult = {
  success: boolean
  error?: string
  data?: any
}

/**
 * Create a new SIP
 */
export async function createSip(formData: FormData): Promise<SipActionResult> {
  try {
    // Extract data from FormData
    const data = {
      name: formData.get('name') as string,
      symbol: formData.get('symbol') as string,
      amount: Number(formData.get('amount')),
      frequency: formData.get('frequency') as string,
      startDate: new Date(formData.get('startDate') as string),
      endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : null,
      goalId: formData.get('goalId') as string || null,
      accountId: formData.get('accountId') as string,
      notes: formData.get('notes') as string || undefined,
    }

    // Validate the data
    const validatedData = validateSip(data)
    
    // Create the SIP
    const sip = await prisma.sIP.create({
      data: {
        name: validatedData.name,
        symbol: validatedData.symbol,
        amount: validatedData.amount,
        frequency: validatedData.frequency,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        goalId: validatedData.goalId,
        accountId: validatedData.accountId,
        notes: validatedData.notes,
      },
      include: {
        goal: true,
        account: true,
        transactions: true
      }
    })

    // Transform the SIP to match our TypeScript types
    const { transactions, ...sipWithoutTransactions } = sip
    const transformedSip = {
      ...sipWithoutTransactions,
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
    
    // Transform transactions to match TypeScript types
    const transformedTransactions = sip.transactions.map(txn => ({
      ...txn,
      errorMessage: txn.errorMessage ?? undefined
    }))
    
    const sipWithValue = calculateSipValue(transformedSip, transformedTransactions)
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: sipWithValue
    }
  } catch (error) {
    console.error('Error creating SIP:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create SIP'
    }
  }
}

/**
 * Create SIP from JSON data (for programmatic use)
 */
export async function createSipFromData(data: any): Promise<SipActionResult> {
  try {
    const validatedData = validateSip(data)
    
    const sip = await prisma.sIP.create({
      data: {
        name: validatedData.name,
        symbol: validatedData.symbol,
        amount: validatedData.amount,
        frequency: validatedData.frequency,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        goalId: validatedData.goalId,
        accountId: validatedData.accountId,
        notes: validatedData.notes,
      },
      include: {
        goal: true,
        account: true,
        transactions: true
      }
    })

    // Transform the SIP to match our TypeScript types
    const { transactions, ...sipWithoutTransactions } = sip
    const transformedSip = {
      ...sipWithoutTransactions,
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
    
    // Transform transactions to match TypeScript types
    const transformedTransactions = sip.transactions.map(txn => ({
      ...txn,
      errorMessage: txn.errorMessage ?? undefined
    }))
    
    const sipWithValue = calculateSipValue(transformedSip, transformedTransactions)
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: sipWithValue
    }
  } catch (error) {
    console.error('Error creating SIP:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create SIP'
    }
  }
}

/**
 * Update an existing SIP
 */
export async function updateSip(id: string, formData: FormData): Promise<SipActionResult> {
  try {
    // Extract data from FormData
    const data = {
      name: formData.get('name') as string || undefined,
      symbol: formData.get('symbol') as string || undefined,
      amount: formData.get('amount') ? Number(formData.get('amount')) : undefined,
      frequency: formData.get('frequency') as string || undefined,
      startDate: formData.get('startDate') ? new Date(formData.get('startDate') as string) : undefined,
      endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : null,
      status: formData.get('status') as string || undefined,
      goalId: formData.get('goalId') as string || null,
      accountId: formData.get('accountId') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    }

    // Remove undefined values (but keep null for endDate and goalId)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([key, value]) => {
        if (key === 'endDate' || key === 'goalId') {
          return value !== undefined // Keep null values for these fields
        }
        return value !== undefined
      })
    )

    // Validate the data
    const validatedData = validateUpdateSip(cleanData)
    
    // Check if SIP exists
    const existingSip = await prisma.sIP.findUnique({
      where: { id }
    })

    if (!existingSip) {
      return {
        success: false,
        error: 'SIP not found'
      }
    }
    
    // Update the SIP
    const updatedSip = await prisma.sIP.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.symbol && { symbol: validatedData.symbol }),
        ...(validatedData.amount && { amount: validatedData.amount }),
        ...(validatedData.frequency && { frequency: validatedData.frequency }),
        ...(validatedData.startDate && { startDate: validatedData.startDate }),
        ...(validatedData.endDate !== undefined && { endDate: validatedData.endDate }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.goalId !== undefined && { goalId: validatedData.goalId }),
        ...(validatedData.accountId && { accountId: validatedData.accountId }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
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

    // Calculate current value
    const lastTransaction = updatedSip.transactions[0]
    const currentPrice = lastTransaction?.nav
    
    // Transform the SIP to match our TypeScript types
    const { transactions, ...sipWithoutTransactions } = updatedSip
    const transformedSip = {
      ...sipWithoutTransactions,
      endDate: updatedSip.endDate ?? undefined,
      goalId: updatedSip.goalId ?? undefined,
      notes: updatedSip.notes ?? undefined,
      goal: updatedSip.goal ? {
        ...updatedSip.goal,
        priority: updatedSip.goal.priority ?? undefined,
        description: updatedSip.goal.description ?? undefined,
      } : undefined,
      account: updatedSip.account ? {
        ...updatedSip.account,
        notes: updatedSip.account.notes ?? undefined,
      } : updatedSip.account,
    }
    
    // Transform transactions to match TypeScript types
    const transformedTransactions = updatedSip.transactions.map(txn => ({
      ...txn,
      errorMessage: txn.errorMessage ?? undefined
    }))
    
    const sipWithValue = calculateSipValue(transformedSip, transformedTransactions, currentPrice)
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: sipWithValue
    }
  } catch (error) {
    console.error('Error updating SIP:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update SIP'
    }
  }
}

/**
 * Update SIP from JSON data (for programmatic use)
 */
export async function updateSipFromData(id: string, data: any): Promise<SipActionResult> {
  try {
    const validatedData = validateUpdateSip(data)
    
    const existingSip = await prisma.sIP.findUnique({
      where: { id }
    })

    if (!existingSip) {
      return {
        success: false,
        error: 'SIP not found'
      }
    }
    
    const updatedSip = await prisma.sIP.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.symbol && { symbol: validatedData.symbol }),
        ...(validatedData.amount && { amount: validatedData.amount }),
        ...(validatedData.frequency && { frequency: validatedData.frequency }),
        ...(validatedData.startDate && { startDate: validatedData.startDate }),
        ...(validatedData.endDate !== undefined && { endDate: validatedData.endDate }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.goalId !== undefined && { goalId: validatedData.goalId }),
        ...(validatedData.accountId && { accountId: validatedData.accountId }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
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

    // Calculate current value
    const lastTransaction = updatedSip.transactions[0]
    const currentPrice = lastTransaction?.nav
    
    // Transform the SIP to match our TypeScript types
    const { transactions, ...sipWithoutTransactions } = updatedSip
    const transformedSip = {
      ...sipWithoutTransactions,
      endDate: updatedSip.endDate ?? undefined,
      goalId: updatedSip.goalId ?? undefined,
      notes: updatedSip.notes ?? undefined,
      goal: updatedSip.goal ? {
        ...updatedSip.goal,
        priority: updatedSip.goal.priority ?? undefined,
        description: updatedSip.goal.description ?? undefined,
      } : undefined,
      account: updatedSip.account ? {
        ...updatedSip.account,
        notes: updatedSip.account.notes ?? undefined,
      } : updatedSip.account,
    }
    
    // Transform transactions to match TypeScript types
    const transformedTransactions = updatedSip.transactions.map(txn => ({
      ...txn,
      errorMessage: txn.errorMessage ?? undefined
    }))
    
    const sipWithValue = calculateSipValue(transformedSip, transformedTransactions, currentPrice)
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: sipWithValue
    }
  } catch (error) {
    console.error('Error updating SIP:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update SIP'
    }
  }
}

/**
 * Delete a SIP
 */
export async function deleteSip(id: string): Promise<SipActionResult> {
  try {
    const existingSip = await prisma.sIP.findUnique({
      where: { id },
      include: {
        transactions: true
      }
    })

    if (!existingSip) {
      return {
        success: false,
        error: 'SIP not found'
      }
    }

    // Delete SIP and all related transactions (cascade delete is configured in schema)
    await prisma.sIP.delete({
      where: { id }
    })
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting SIP:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete SIP'
    }
  }
}

/**
 * Update SIP status
 */
export async function updateSipStatus(id: string, status: SIPStatus): Promise<SipActionResult> {
  try {
    const existingSip = await prisma.sIP.findUnique({
      where: { id }
    })

    if (!existingSip) {
      return {
        success: false,
        error: 'SIP not found'
      }
    }

    const updatedSip = await prisma.sIP.update({
      where: { id },
      data: { status },
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

    // Calculate current value
    const lastTransaction = updatedSip.transactions[0]
    const currentPrice = lastTransaction?.nav
    
    // Transform the SIP to match our TypeScript types
    const { transactions, ...sipWithoutTransactions } = updatedSip
    const transformedSip = {
      ...sipWithoutTransactions,
      endDate: updatedSip.endDate ?? undefined,
      goalId: updatedSip.goalId ?? undefined,
      notes: updatedSip.notes ?? undefined,
      goal: updatedSip.goal ? {
        ...updatedSip.goal,
        priority: updatedSip.goal.priority ?? undefined,
        description: updatedSip.goal.description ?? undefined,
      } : undefined,
      account: updatedSip.account ? {
        ...updatedSip.account,
        notes: updatedSip.account.notes ?? undefined,
      } : updatedSip.account,
    }
    
    // Transform transactions to match TypeScript types
    const transformedTransactions = updatedSip.transactions.map(txn => ({
      ...txn,
      errorMessage: txn.errorMessage ?? undefined
    }))
    
    const sipWithValue = calculateSipValue(transformedSip, transformedTransactions, currentPrice)
    
    // No cache invalidation needed - user data is always fetched fresh
    
    return {
      success: true,
      data: sipWithValue
    }
  } catch (error) {
    console.error('Error updating SIP status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update SIP status'
    }
  }
}