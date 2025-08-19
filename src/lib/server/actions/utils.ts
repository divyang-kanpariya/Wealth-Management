import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * Common action result type
 */
export type ActionResult<T = any> = {
  success: boolean
  error?: string
  data?: T
}

/**
 * Handle server action errors consistently
 */
export function handleActionError(error: unknown, context: string): ActionResult {
  console.error(`Error in ${context}:`, error)
  
  if (error instanceof Error) {
    // Handle validation errors
    if (error.message.includes('validation') || error.message.includes('required')) {
      return {
        success: false,
        error: error.message
      }
    }
    
    // Handle Prisma errors
    if (error.message.includes('Unique constraint')) {
      return {
        success: false,
        error: 'A record with this information already exists'
      }
    }
    
    if (error.message.includes('Foreign key constraint')) {
      return {
        success: false,
        error: 'Cannot perform this action due to related data'
      }
    }
    
    return {
      success: false,
      error: error.message
    }
  }
  
  return {
    success: false,
    error: `Failed to ${context}`
  }
}

/**
 * Extract and clean form data
 */
export function extractFormData(formData: FormData, fields: string[]): Record<string, any> {
  const data: Record<string, any> = {}
  
  for (const field of fields) {
    const value = formData.get(field)
    if (value !== null && value !== '') {
      // Handle different data types
      if (field.includes('Date')) {
        data[field] = new Date(value as string)
      } else if (field.includes('Amount') || field.includes('Price') || field.includes('Value') || field.includes('units')) {
        data[field] = Number(value)
      } else if (field.includes('priority')) {
        data[field] = Number(value)
      } else {
        data[field] = value as string
      }
    }
  }
  
  return data
}

/**
 * Handle successful action with optional redirect
 */
export function handleActionSuccess<T>(
  data: T, 
  redirectPath?: string
): ActionResult<T> {
  if (redirectPath) {
    redirect(redirectPath)
  }
  
  return {
    success: true,
    data
  }
}

/**
 * No cache invalidation needed for user data operations
 * User data is always fetched fresh from database
 */
export function revalidateMultiplePaths(paths: string[]): void {
  console.log('[ActionUtils] No cache invalidation needed - user data always fresh')
}

/**
 * Convert server action result to JSON response format
 */
export function toJsonResponse(result: ActionResult): Response {
  if (result.success) {
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } else {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Validate required fields in form data
 */
export function validateRequiredFields(
  formData: FormData, 
  requiredFields: string[]
): string[] {
  const errors: string[] = []
  
  for (const field of requiredFields) {
    const value = formData.get(field)
    if (!value || value === '') {
      errors.push(`${field} is required`)
    }
  }
  
  return errors
}

/**
 * Create a standardized error response
 */
export function createErrorResult(message: string): ActionResult {
  return {
    success: false,
    error: message
  }
}

/**
 * Create a standardized success response
 */
export function createSuccessResult<T>(data?: T): ActionResult<T> {
  return {
    success: true,
    data
  }
}