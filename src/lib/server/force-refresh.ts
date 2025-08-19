/**
 * Force refresh utilities for pricing data updates
 * 
 * This module provides utilities to force refresh pricing data only.
 * User data is always fetched fresh from database and doesn't need cache invalidation.
 */

import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Force refresh pricing data only
 * User data is always fresh, so only pricing data needs cache invalidation
 */
export function forceRefreshPrices(): void {
  console.log('[ForceRefresh] Force refreshing pricing data only...')
  
  // Only invalidate pricing-related cache tags
  const pricingTags = [
    'prices', 'price-cache', 'external-api-cache'
  ]
  
  pricingTags.forEach(tag => {
    try {
      revalidateTag(tag)
      console.log(`[ForceRefresh] Invalidated pricing tag: ${tag}`)
    } catch (error) {
      console.warn(`[ForceRefresh] Failed to invalidate pricing tag ${tag}:`, error)
    }
  })
  
  // Invalidate pages that display pricing data
  const pricingPaths = [
    '/',           // Dashboard shows pricing
    '/investments', // Investment list shows current values
    '/charts'      // Charts show pricing data
  ]
  
  pricingPaths.forEach(path => {
    try {
      revalidatePath(path, 'page')
      console.log(`[ForceRefresh] Invalidated pricing path: ${path}`)
    } catch (error) {
      console.warn(`[ForceRefresh] Failed to invalidate pricing path ${path}:`, error)
    }
  })
  
  console.log('[ForceRefresh] Pricing data refresh completed')
}

/**
 * No cache invalidation needed for user data operations
 * User data is always fetched fresh from database
 */
export function forceRefreshInvestments(): void {
  console.log('[ForceRefresh] No cache invalidation needed - investment data always fresh')
}

/**
 * No cache invalidation needed for user data operations
 * User data is always fetched fresh from database
 */
export function forceRefreshGoals(): void {
  console.log('[ForceRefresh] No cache invalidation needed - goal data always fresh')
}

/**
 * No cache invalidation needed for user data operations
 * User data is always fetched fresh from database
 */
export function forceRefreshSIPs(): void {
  console.log('[ForceRefresh] No cache invalidation needed - SIP data always fresh')
}

/**
 * No cache invalidation needed for user data operations
 * User data is always fetched fresh from database
 */
export function forceRefreshAccounts(): void {
  console.log('[ForceRefresh] No cache invalidation needed - account data always fresh')
}

/**
 * No cache invalidation needed for user data operations
 * User data is always fetched fresh from database
 */
export function forceRefreshDashboard(): void {
  console.log('[ForceRefresh] No cache invalidation needed - dashboard data always fresh')
}