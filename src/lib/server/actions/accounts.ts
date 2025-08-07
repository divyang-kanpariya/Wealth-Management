'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { 
  validateAccount, 
  validateUpdateAccount,
  accountSchema,
  updateAccountSchema 
} from '@/lib/validations'
import { CacheInvalidation } from '../cache-invalidation'

export type AccountActionResult = {
  success: boolean
  error?: string
  data?: any
}

/**
 * Create a new account
 */
export async function createAccount(formData: FormData): Promise<AccountActionResult> {
  try {
    // Extract data from FormData
    const data = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      notes: formData.get('notes') as string || undefined,
    }

    // Validate the data
    const validatedData = validateAccount(data)
    
    // Create the account
    const account = await prisma.account.create({
      data: validatedData,
      include: {
        investments: true,
      },
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateAll() // Accounts affect multiple areas
    
    return {
      success: true,
      data: account
    }
  } catch (error) {
    console.error('Error creating account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account'
    }
  }
}

/**
 * Create account from JSON data (for programmatic use)
 */
export async function createAccountFromData(data: any): Promise<AccountActionResult> {
  try {
    const validatedData = validateAccount(data)
    
    const account = await prisma.account.create({
      data: validatedData,
      include: {
        investments: true,
      },
    })
    
    CacheInvalidation.invalidateAll()
    
    return {
      success: true,
      data: account
    }
  } catch (error) {
    console.error('Error creating account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account'
    }
  }
}

/**
 * Update an existing account
 */
export async function updateAccount(id: string, formData: FormData): Promise<AccountActionResult> {
  try {
    // Extract data from FormData
    const data = {
      name: formData.get('name') as string || undefined,
      type: formData.get('type') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    )

    // Validate the data
    const validatedData = validateUpdateAccount(cleanData)
    
    // Update the account
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: validatedData,
      include: {
        investments: true,
      },
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateAll()
    
    return {
      success: true,
      data: updatedAccount
    }
  } catch (error) {
    console.error('Error updating account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update account'
    }
  }
}

/**
 * Update account from JSON data (for programmatic use)
 */
export async function updateAccountFromData(id: string, data: any): Promise<AccountActionResult> {
  try {
    const validatedData = validateUpdateAccount(data)
    
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: validatedData,
      include: {
        investments: true,
      },
    })
    
    CacheInvalidation.invalidateAll()
    
    return {
      success: true,
      data: updatedAccount
    }
  } catch (error) {
    console.error('Error updating account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update account'
    }
  }
}

/**
 * Delete an account
 */
export async function deleteAccount(id: string): Promise<AccountActionResult> {
  try {
    // Check if account has investments before deleting
    const investmentCount = await prisma.investment.count({
      where: { accountId: id },
    })
    
    if (investmentCount > 0) {
      return {
        success: false,
        error: 'Cannot delete account with linked investments'
      }
    }
    
    // Check if account has SIPs before deleting
    const sipCount = await prisma.sIP.count({
      where: { accountId: id },
    })
    
    if (sipCount > 0) {
      return {
        success: false,
        error: 'Cannot delete account with linked SIPs'
      }
    }
    
    await prisma.account.delete({
      where: { id },
    })
    
    // Invalidate caches
    CacheInvalidation.invalidateAll()
    
    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete account'
    }
  }
}