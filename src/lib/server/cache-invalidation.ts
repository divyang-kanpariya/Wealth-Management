import { revalidateTag, revalidatePath } from 'next/cache'
import { DashboardDataPreparator } from './data-preparators/dashboard'

/**
 * Cache invalidation utilities for server-side data
 */
export class CacheInvalidation {
  
  /**
   * Invalidate dashboard cache when investments change
   */
  static invalidateDashboard(): void {
    // Invalidate Next.js cache tags
    revalidateTag('dashboard')
    revalidateTag('investments')
    revalidateTag('goals')
    revalidateTag('sips')
    revalidateTag('dashboard-investments')
    revalidateTag('dashboard-goals')
    revalidateTag('dashboard-sips')
    
    // Invalidate dashboard page
    revalidatePath('/')
    
    // Invalidate in-memory cache
    DashboardDataPreparator.invalidateCache()
    
    console.log('[CacheInvalidation] Dashboard cache invalidated')
  }

  /**
   * Invalidate investment-related caches
   */
  static invalidateInvestments(): void {
    // Invalidate Next.js cache tags
    revalidateTag('investments')
    revalidateTag('dashboard')
    revalidateTag('dashboard-investments')
    revalidateTag('dashboard-goals')
    revalidateTag('dashboard-sips')
    
    // Invalidate paths
    revalidatePath('/')
    revalidatePath('/investments')
    
    // Invalidate in-memory cache
    DashboardDataPreparator.invalidateCache()
    
    console.log('[CacheInvalidation] Investment cache invalidated')
  }

  /**
   * Invalidate goal-related caches
   */
  static invalidateGoals(): void {
    revalidateTag('goals')
    revalidateTag('dashboard')
    revalidatePath('/')
    revalidatePath('/goals')
    
    DashboardDataPreparator.invalidateCache()
    
    console.log('[CacheInvalidation] Goals cache invalidated')
  }

  /**
   * Invalidate SIP-related caches
   */
  static invalidateSIPs(): void {
    revalidateTag('sips')
    revalidateTag('dashboard')
    revalidatePath('/')
    revalidatePath('/sips')
    
    DashboardDataPreparator.invalidateCache()
    
    console.log('[CacheInvalidation] SIPs cache invalidated')
  }

  /**
   * Invalidate price-related caches
   */
  static invalidatePrices(): void {
    revalidateTag('prices')
    revalidateTag('dashboard')
    revalidatePath('/')
    
    DashboardDataPreparator.invalidateCache()
    
    console.log('[CacheInvalidation] Price cache invalidated')
  }

  /**
   * Invalidate all caches (nuclear option)
   */
  static invalidateAll(): void {
    revalidateTag('dashboard')
    revalidateTag('investments')
    revalidateTag('goals')
    revalidateTag('sips')
    revalidateTag('prices')
    
    revalidatePath('/')
    revalidatePath('/investments')
    revalidatePath('/goals')
    revalidatePath('/sips')
    revalidatePath('/charts')
    
    DashboardDataPreparator.invalidateCache()
    
    console.log('[CacheInvalidation] All caches invalidated')
  }
}