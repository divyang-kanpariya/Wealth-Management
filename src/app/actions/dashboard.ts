'use server'

import { revalidatePath } from 'next/cache'
import { realTimeRefreshService } from '@/lib/server/refresh-service'
import { RefreshOptions } from '@/types'

/**
 * Server action to refresh dashboard data with enhanced progress tracking
 */
export async function refreshDashboard(options: RefreshOptions = {}) {
  try {
    console.log('[ServerAction] Starting enhanced dashboard refresh with fresh prices from API...')
    
    // Set flag to force fresh price fetching from API
    global.forceRefreshPrices = true
    
    // Start real-time refresh with progress tracking
    const requestId = await realTimeRefreshService.startRefresh({
      forceRefresh: true,
      batchSize: 10,
      timeout: 30000,
      ...options
    })
    
    console.log(`[ServerAction] Refresh started with ID: ${requestId}`)
    
    // Force revalidation of pages that display pricing data
    revalidatePath('/', 'page')
    revalidatePath('/investments', 'page')
    revalidatePath('/charts', 'page')
    
    // Reset the flag after a short delay
    setTimeout(() => {
      global.forceRefreshPrices = false
    }, 10000)
    
    return { 
      success: true, 
      message: 'Fresh price refresh started successfully',
      requestId,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('[ServerAction] Failed to start dashboard refresh:', error)
    return { 
      success: false, 
      message: 'Failed to start dashboard refresh',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Server action to get refresh status for progress tracking
 */
export async function getRefreshStatus(requestId: string) {
  try {
    const status = realTimeRefreshService.getRefreshStatus(requestId)
    
    if (!status) {
      return {
        success: false,
        message: 'Refresh status not found',
        error: 'Invalid request ID'
      }
    }
    
    return {
      success: true,
      status,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('[ServerAction] Failed to get refresh status:', error)
    return {
      success: false,
      message: 'Failed to get refresh status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Server action to cancel an ongoing refresh operation
 */
export async function cancelRefresh(requestId: string) {
  try {
    const cancelled = realTimeRefreshService.cancelRefresh(requestId)
    
    if (!cancelled) {
      return {
        success: false,
        message: 'Could not cancel refresh - operation may have already completed',
        error: 'Cancellation failed'
      }
    }
    
    return {
      success: true,
      message: 'Refresh operation cancelled successfully',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('[ServerAction] Failed to cancel refresh:', error)
    return {
      success: false,
      message: 'Failed to cancel refresh',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Server action for quick refresh of specific symbols
 */
export async function quickRefreshSymbols(symbols: string[]) {
  try {
    console.log(`[ServerAction] Starting quick refresh for ${symbols.length} symbols`)
    
    const requestId = await realTimeRefreshService.startRefresh({
      symbols,
      forceRefresh: true,
      batchSize: 5,
      timeout: 20000
    })
    
    // Force revalidation for affected pages
    revalidatePath('/', 'page')
    revalidatePath('/investments', 'page')
    
    return {
      success: true,
      message: `Quick refresh started for ${symbols.length} symbols`,
      requestId,
      symbols,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('[ServerAction] Failed to start quick refresh:', error)
    return {
      success: false,
      message: 'Failed to start quick refresh',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

