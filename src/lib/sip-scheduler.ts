import { processSIPBatch, retryFailedSIPTransactions, cleanupOldFailedTransactions } from '@/lib/sip-processor'

// Configuration constants
const DEFAULT_PROCESSING_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
const DEFAULT_RETRY_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours
const DEFAULT_CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000 // 7 days

// Scheduler state
let processingInterval: NodeJS.Timeout | null = null
let retryInterval: NodeJS.Timeout | null = null
let cleanupInterval: NodeJS.Timeout | null = null

// Scheduler configuration
interface SIPSchedulerConfig {
  processingIntervalMs?: number
  retryIntervalMs?: number
  cleanupIntervalMs?: number
  enableProcessing?: boolean
  enableRetry?: boolean
  enableCleanup?: boolean
}

// Default configuration
const defaultConfig: Required<SIPSchedulerConfig> = {
  processingIntervalMs: DEFAULT_PROCESSING_INTERVAL,
  retryIntervalMs: DEFAULT_RETRY_INTERVAL,
  cleanupIntervalMs: DEFAULT_CLEANUP_INTERVAL,
  enableProcessing: true,
  enableRetry: true,
  enableCleanup: true
}

let currentConfig: Required<SIPSchedulerConfig> = { ...defaultConfig }

/**
 * Process SIPs scheduled for today
 */
async function scheduledSIPProcessing(): Promise<void> {
  try {
    console.log('Starting scheduled SIP processing...')
    const today = new Date()
    
    // Set time to start of day for consistent processing
    today.setHours(0, 0, 0, 0)
    
    const result = await processSIPBatch(today)
    
    console.log(`Scheduled SIP processing completed:`, {
      totalProcessed: result.totalProcessed,
      successful: result.successful,
      failed: result.failed,
      processingTime: result.processingTime
    })
    
    // Log any failures for monitoring
    if (result.failed > 0) {
      const failedSIPs = result.results.filter(r => !r.success)
      console.warn(`${result.failed} SIP transactions failed:`, 
        failedSIPs.map(r => ({ sipId: r.sipId, error: r.error }))
      )
    }
    
  } catch (error) {
    console.error('Scheduled SIP processing failed:', error)
  }
}

/**
 * Retry failed SIP transactions
 */
async function scheduledSIPRetry(): Promise<void> {
  try {
    console.log('Starting scheduled SIP retry...')
    
    const result = await retryFailedSIPTransactions()
    
    console.log(`Scheduled SIP retry completed:`, {
      totalProcessed: result.totalProcessed,
      successful: result.successful,
      failed: result.failed,
      processingTime: result.processingTime
    })
    
  } catch (error) {
    console.error('Scheduled SIP retry failed:', error)
  }
}

/**
 * Clean up old failed transactions
 */
async function scheduledSIPCleanup(): Promise<void> {
  try {
    console.log('Starting scheduled SIP cleanup...')
    
    const deletedCount = await cleanupOldFailedTransactions()
    
    console.log(`Scheduled SIP cleanup completed: ${deletedCount} old failed transactions removed`)
    
  } catch (error) {
    console.error('Scheduled SIP cleanup failed:', error)
  }
}

/**
 * Start the SIP processing scheduler
 */
export function startSIPScheduler(config: SIPSchedulerConfig = {}): void {
  // Merge with default configuration
  currentConfig = { ...defaultConfig, ...config }
  
  console.log('Starting SIP scheduler with configuration:', currentConfig)
  
  // Start processing scheduler
  if (currentConfig.enableProcessing) {
    if (processingInterval) {
      clearInterval(processingInterval)
    }
    
    processingInterval = setInterval(
      scheduledSIPProcessing,
      currentConfig.processingIntervalMs
    )
    
    console.log(`SIP processing scheduler started with ${currentConfig.processingIntervalMs / 1000 / 60 / 60} hour intervals`)
  }
  
  // Start retry scheduler
  if (currentConfig.enableRetry) {
    if (retryInterval) {
      clearInterval(retryInterval)
    }
    
    retryInterval = setInterval(
      scheduledSIPRetry,
      currentConfig.retryIntervalMs
    )
    
    console.log(`SIP retry scheduler started with ${currentConfig.retryIntervalMs / 1000 / 60 / 60} hour intervals`)
  }
  
  // Start cleanup scheduler
  if (currentConfig.enableCleanup) {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
    }
    
    cleanupInterval = setInterval(
      scheduledSIPCleanup,
      currentConfig.cleanupIntervalMs
    )
    
    console.log(`SIP cleanup scheduler started with ${currentConfig.cleanupIntervalMs / 1000 / 60 / 60 / 24} day intervals`)
  }
}

/**
 * Stop the SIP processing scheduler
 */
export function stopSIPScheduler(): void {
  console.log('Stopping SIP scheduler...')
  
  if (processingInterval) {
    clearInterval(processingInterval)
    processingInterval = null
    console.log('SIP processing scheduler stopped')
  }
  
  if (retryInterval) {
    clearInterval(retryInterval)
    retryInterval = null
    console.log('SIP retry scheduler stopped')
  }
  
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.log('SIP cleanup scheduler stopped')
  }
}

/**
 * Get scheduler status
 */
export function getSIPSchedulerStatus(): {
  running: boolean
  config: Required<SIPSchedulerConfig>
  schedulers: {
    processing: { running: boolean; intervalMs: number }
    retry: { running: boolean; intervalMs: number }
    cleanup: { running: boolean; intervalMs: number }
  }
} {
  return {
    running: processingInterval !== null || retryInterval !== null || cleanupInterval !== null,
    config: currentConfig,
    schedulers: {
      processing: {
        running: processingInterval !== null,
        intervalMs: currentConfig.processingIntervalMs
      },
      retry: {
        running: retryInterval !== null,
        intervalMs: currentConfig.retryIntervalMs
      },
      cleanup: {
        running: cleanupInterval !== null,
        intervalMs: currentConfig.cleanupIntervalMs
      }
    }
  }
}

/**
 * Update scheduler configuration
 */
export function updateSIPSchedulerConfig(config: SIPSchedulerConfig): void {
  console.log('Updating SIP scheduler configuration:', config)
  
  // Stop current schedulers
  stopSIPScheduler()
  
  // Start with new configuration
  startSIPScheduler(config)
}

/**
 * Run manual SIP processing for a specific date
 */
export async function runManualSIPProcessing(targetDate?: Date): Promise<{
  success: boolean
  result?: any
  error?: string
}> {
  try {
    console.log(`Running manual SIP processing for ${targetDate?.toISOString().split('T')[0] || 'today'}`)
    
    const processDate = targetDate || new Date()
    processDate.setHours(0, 0, 0, 0)
    
    const result = await processSIPBatch(processDate)
    
    console.log('Manual SIP processing completed:', result)
    
    return {
      success: true,
      result
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Manual SIP processing failed:', errorMessage)
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Run manual SIP retry
 */
export async function runManualSIPRetry(): Promise<{
  success: boolean
  result?: any
  error?: string
}> {
  try {
    console.log('Running manual SIP retry...')
    
    const result = await retryFailedSIPTransactions()
    
    console.log('Manual SIP retry completed:', result)
    
    return {
      success: true,
      result
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Manual SIP retry failed:', errorMessage)
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Run manual SIP cleanup
 */
export async function runManualSIPCleanup(): Promise<{
  success: boolean
  result?: number
  error?: string
}> {
  try {
    console.log('Running manual SIP cleanup...')
    
    const result = await cleanupOldFailedTransactions()
    
    console.log(`Manual SIP cleanup completed: ${result} transactions removed`)
    
    return {
      success: true,
      result
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Manual SIP cleanup failed:', errorMessage)
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Initialize SIP scheduler on application startup
 */
export function initializeSIPScheduler(): void {
  console.log('Initializing SIP scheduler...')
  
  // Start with default configuration
  startSIPScheduler()
  
  // Run initial processing for any missed transactions
  setTimeout(async () => {
    try {
      console.log('Running initial SIP processing check...')
      await scheduledSIPProcessing()
    } catch (error) {
      console.error('Initial SIP processing check failed:', error)
    }
  }, 5000) // Wait 5 seconds after startup
}

/**
 * Graceful shutdown of SIP scheduler
 */
export function shutdownSIPScheduler(): void {
  console.log('Shutting down SIP scheduler...')
  stopSIPScheduler()
}

// Export scheduler functions for external use
export {
  scheduledSIPProcessing,
  scheduledSIPRetry,
  scheduledSIPCleanup
}