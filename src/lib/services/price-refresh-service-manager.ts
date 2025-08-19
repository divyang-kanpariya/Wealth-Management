import { backgroundPriceRefreshService } from '../background-price-refresh-service'

/**
 * Price Refresh Service Manager
 * 
 * Handles initialization and management of the background price refresh service.
 * This module should be imported and initialized when the application starts.
 */

let isInitialized = false

/**
 * Initialize the background price refresh service
 */
export async function initializePriceRefreshService(): Promise<void> {
  if (isInitialized) {
    console.log('[PriceRefreshServiceManager] Service already initialized')
    return
  }

  try {
    console.log('[PriceRefreshServiceManager] Initializing background price refresh service...')
    
    // Start the background service with default 1-hour interval
    await backgroundPriceRefreshService.startScheduledRefresh()
    
    isInitialized = true
    console.log('[PriceRefreshServiceManager] Background price refresh service initialized successfully')
    
    // Log service status
    const status = backgroundPriceRefreshService.getServiceStatus()
    console.log('[PriceRefreshServiceManager] Service status:', {
      running: status.running,
      intervalMinutes: status.intervalMs ? status.intervalMs / 1000 / 60 : null,
      batchSize: status.config.batchSize,
      rateLimitDelay: status.config.rateLimitDelay
    })

  } catch (error) {
    console.error('[PriceRefreshServiceManager] Failed to initialize service:', error)
    throw error
  }
}

/**
 * Shutdown the background price refresh service
 */
export function shutdownPriceRefreshService(): void {
  if (!isInitialized) {
    console.log('[PriceRefreshServiceManager] Service not initialized, nothing to shutdown')
    return
  }

  try {
    console.log('[PriceRefreshServiceManager] Shutting down background price refresh service...')
    backgroundPriceRefreshService.stopScheduledRefresh()
    isInitialized = false
    console.log('[PriceRefreshServiceManager] Service shutdown complete')
  } catch (error) {
    console.error('[PriceRefreshServiceManager] Error during shutdown:', error)
  }
}

/**
 * Get service initialization status
 */
export function getServiceInitializationStatus(): {
  initialized: boolean
  serviceStatus: ReturnType<typeof backgroundPriceRefreshService.getServiceStatus> | null
} {
  return {
    initialized: isInitialized,
    serviceStatus: isInitialized ? backgroundPriceRefreshService.getServiceStatus() : null
  }
}

/**
 * Restart the service with new configuration
 */
export async function restartPriceRefreshService(intervalMs?: number): Promise<void> {
  console.log('[PriceRefreshServiceManager] Restarting service...')
  
  shutdownPriceRefreshService()
  
  // Wait a moment before restarting
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  if (intervalMs) {
    await backgroundPriceRefreshService.startScheduledRefresh(intervalMs)
  } else {
    await initializePriceRefreshService()
  }
  
  isInitialized = true
  console.log('[PriceRefreshServiceManager] Service restarted successfully')
}

/**
 * Get comprehensive service health and statistics
 */
export async function getServiceHealthReport(): Promise<{
  initialization: ReturnType<typeof getServiceInitializationStatus>
  health: Awaited<ReturnType<typeof backgroundPriceRefreshService.healthCheck>>
  statistics: Awaited<ReturnType<typeof backgroundPriceRefreshService.getRefreshStatistics>>
}> {
  const [initialization, health, statistics] = await Promise.all([
    getServiceInitializationStatus(),
    backgroundPriceRefreshService.healthCheck(),
    backgroundPriceRefreshService.getRefreshStatistics()
  ])

  return {
    initialization,
    health,
    statistics
  }
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.log('[PriceRefreshServiceManager] Received SIGTERM, shutting down gracefully...')
    shutdownPriceRefreshService()
  })

  process.on('SIGINT', () => {
    console.log('[PriceRefreshServiceManager] Received SIGINT, shutting down gracefully...')
    shutdownPriceRefreshService()
  })
}