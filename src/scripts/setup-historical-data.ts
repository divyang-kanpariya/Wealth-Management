#!/usr/bin/env tsx

/**
 * Historical Data Setup Script
 * 
 * This script helps you set up the historical data collection system:
 * 1. Creates database tables (if not exists)
 * 2. Backfills historical data for existing investments
 * 3. Collects historical prices for all symbols
 * 4. Creates initial portfolio snapshots
 * 
 * Usage:
 * npm run setup-historical-data
 * or
 * npx tsx src/scripts/setup-historical-data.ts
 */

import { PrismaClient } from '@prisma/client'
import { historicalDataCollector } from '../lib/historical-data-collector'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Historical Data Setup...\n')

  try {
    // Step 1: Check database connection
    console.log('1️⃣ Checking database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully\n')

    // Step 2: Get all unique symbols from investments
    console.log('2️⃣ Collecting symbols from existing investments...')
    const investments = await prisma.investment.findMany({
      where: {
        symbol: {
          not: null
        }
      },
      select: {
        symbol: true,
        buyDate: true
      }
    })

    const symbols = [...new Set(investments.map(inv => inv.symbol).filter(Boolean))] as string[]
    console.log(`✅ Found ${symbols.length} unique symbols: ${symbols.join(', ')}\n`)

    if (symbols.length === 0) {
      console.log('⚠️  No symbols found. Please add some investments with symbols first.')
      return
    }

    // Step 3: Determine date range for historical data
    const oldestInvestment = investments.reduce((oldest, inv) => 
      inv.buyDate < oldest.buyDate ? inv : oldest
    )
    const startDate = new Date(oldestInvestment.buyDate)
    startDate.setDate(startDate.getDate() - 30) // Start 30 days before oldest investment
    
    const endDate = new Date()
    
    console.log(`3️⃣ Historical data date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // Step 4: Collect historical prices
    console.log('4️⃣ Collecting historical prices...')
    console.log('⏳ This may take a while depending on the number of symbols and date range...')
    
    await historicalDataCollector.collectHistoricalPrices(symbols, startDate, endDate)
    console.log('✅ Historical prices collected\n')

    // Step 5: Backfill portfolio snapshots
    console.log('5️⃣ Backfilling portfolio snapshots...')
    console.log('⏳ Calculating historical portfolio values...')
    
    await historicalDataCollector.backfillHistoricalData(startDate, endDate)
    console.log('✅ Portfolio snapshots backfilled\n')

    // Step 6: Create today's snapshot
    console.log('6️⃣ Creating today\'s snapshot...')
    await historicalDataCollector.collectDailySnapshots()
    console.log('✅ Today\'s snapshot created\n')

    // Step 7: Show summary
    console.log('7️⃣ Setup Summary:')
    const [
      portfolioSnapshotCount,
      historicalPriceCount,
      goalHistoryCount,
      investmentHistoryCount
    ] = await Promise.all([
      prisma.portfolioSnapshot.count(),
      prisma.historicalPrice.count(),
      prisma.goalProgressHistory.count(),
      prisma.investmentValueHistory.count()
    ])

    console.log(`📊 Portfolio Snapshots: ${portfolioSnapshotCount}`)
    console.log(`📈 Historical Prices: ${historicalPriceCount}`)
    console.log(`🎯 Goal History Records: ${goalHistoryCount}`)
    console.log(`💰 Investment History Records: ${investmentHistoryCount}`)

    console.log('\n🎉 Historical Data Setup Complete!')
    console.log('\n📝 Next Steps:')
    console.log('1. Set up a daily cron job to run: POST /api/analytics/collect-snapshot with {"action": "daily"}')
    console.log('2. Visit /charts to see your historical data visualizations')
    console.log('3. The system will now show real historical trends instead of fake data')

  } catch (error) {
    console.error('❌ Error during setup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Handle script execution
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
  })
}

export { main as setupHistoricalData }