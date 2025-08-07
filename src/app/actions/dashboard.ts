'use server'

import { revalidatePath } from 'next/cache'
import { CacheInvalidation } from '@/lib/server/cache-invalidation'

/**
 * Server action to refresh dashboard data
 */
export async function refreshDashboard() {
  try {
    console.log('[ServerAction] Refreshing dashboard data...')
    
    // Invalidate all dashboard-related caches
    CacheInvalidation.invalidateDashboard()
    
    // Force revalidation of the dashboard page
    revalidatePath('/')
    
    return { success: true, message: 'Dashboard refreshed successfully' }
  } catch (error) {
    console.error('[ServerAction] Failed to refresh dashboard:', error)
    return { 
      success: false, 
      message: 'Failed to refresh dashboard',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Server action to force refresh with fresh data
 */
export async function forceRefreshDashboard() {
  try {
    console.log('[ServerAction] Force refreshing dashboard data...')
    
    // Clear all caches completely
    CacheInvalidation.invalidateAll()
    
    // Force revalidation
    revalidatePath('/', 'layout')
    
    return { success: true, message: 'Dashboard force refreshed successfully' }
  } catch (error) {
    console.error('[ServerAction] Failed to force refresh dashboard:', error)
    return { 
      success: false, 
      message: 'Failed to force refresh dashboard',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}