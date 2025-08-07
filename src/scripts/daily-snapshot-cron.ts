#!/usr/bin/env tsx

/**
 * Daily Snapshot Cron Job
 * 
 * This script should be run daily (preferably after market hours) to:
 * 1. Collect current portfolio snapshot
 * 2. Update investment value history
 * 3. Update goal progress history
 * 4. Collect latest prices
 * 
 * Setup as a cron job:
 * 0 18 * * 1-5 cd /path/to/your/app && npm run daily-snapshot
 * (Runs at 6 PM on weekdays)
 * 
 * Or use it as a serverless function/webhook
 */

import { historicalDataCollector } from '../lib/historical-data-collector'

async function runDailySnapshot() {
  console.log(`🕐 Starting daily snapshot collection at ${new Date().toISOString()}`)

  try {
    await historicalDataCollector.collectDailySnapshots()
    console.log('✅ Daily snapshot collection completed successfully')
    
    // Log success for monitoring
    console.log(`📊 Snapshot completed at ${new Date().toISOString()}`)
    
  } catch (error) {
    console.error('❌ Error during daily snapshot collection:', error)
    
    // You might want to send alerts here (email, Slack, etc.)
    // await sendAlert('Daily snapshot failed', error)
    
    process.exit(1)
  }
}

// Handle script execution
if (require.main === module) {
  runDailySnapshot().catch((error) => {
    console.error('❌ Unhandled error in daily snapshot:', error)
    process.exit(1)
  })
}

export { runDailySnapshot }