/**
 * Test script for BackgroundPriceRefreshService integration
 * 
 * This script tests the background price refresh service with real data
 * to ensure it integrates properly with the existing price-fetcher.
 */

const { backgroundPriceRefreshService } = require('./src/lib/background-price-refresh-service.ts')
const { 
  initializePriceRefreshService, 
  getServiceHealthReport,
  shutdownPriceRefreshService 
} = require('./src/lib/services/price-refresh-service-manager.ts')

async function testBackgroundService() {
  console.log('🚀 Testing Background Price Refresh Service Integration')
  console.log('=' .repeat(60))

  try {
    // Test 1: Service initialization
    console.log('\n📋 Test 1: Service Initialization')
    await initializePriceRefreshService()
    
    const status = backgroundPriceRefreshService.getServiceStatus()
    console.log('✅ Service Status:', {
      running: status.running,
      intervalMinutes: status.intervalMs ? status.intervalMs / 1000 / 60 : null,
      batchSize: status.config.batchSize,
      rateLimitDelay: status.config.rateLimitDelay
    })

    // Test 2: Health check
    console.log('\n🏥 Test 2: Health Check')
    const healthReport = await getServiceHealthReport()
    console.log('✅ Health Report:', {
      status: healthReport.health.status,
      running: healthReport.health.running,
      issues: healthReport.health.issues,
      totalCachedPrices: healthReport.statistics.totalCachedPrices,
      uniqueSymbolsTracked: healthReport.statistics.uniqueSymbolsTracked
    })

    // Test 3: Manual refresh with sample symbols
    console.log('\n🔄 Test 3: Manual Refresh (Sample Symbols)')
    const sampleSymbols = ['RELIANCE', 'INFY', '120503'] // Mix of stock and mutual fund
    
    console.log(`Refreshing symbols: ${sampleSymbols.join(', ')}`)
    const refreshResult = await backgroundPriceRefreshService.refreshSpecificSymbols(sampleSymbols)
    
    console.log('✅ Refresh Result:', {
      success: refreshResult.success,
      failed: refreshResult.failed,
      totalSymbols: refreshResult.results.length
    })

    // Show detailed results
    refreshResult.results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.symbol}: ₹${result.price}`)
      } else {
        console.log(`  ❌ ${result.symbol}: ${result.error}`)
      }
    })

    // Test 4: Statistics after refresh
    console.log('\n📊 Test 4: Statistics After Refresh')
    const stats = await backgroundPriceRefreshService.getRefreshStatistics()
    console.log('✅ Updated Statistics:', {
      totalCachedPrices: stats.totalCachedPrices,
      freshPrices: stats.freshPrices,
      stalePrices: stats.stalePrices,
      priceHistoryCount: stats.priceHistoryCount,
      lastRefreshTime: stats.lastRefreshTime
    })

    // Test 5: API endpoint test
    console.log('\n🌐 Test 5: API Endpoint Test')
    try {
      const response = await fetch('http://localhost:3000/api/price-refresh?action=status')
      if (response.ok) {
        const data = await response.json()
        console.log('✅ API Response:', data.success ? 'Success' : 'Failed')
      } else {
        console.log('⚠️  API not available (server not running)')
      }
    } catch (error) {
      console.log('⚠️  API not available (server not running)')
    }

    console.log('\n🎉 All tests completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...')
    shutdownPriceRefreshService()
    console.log('✅ Service shutdown complete')
  }
}

// Run the test
if (require.main === module) {
  testBackgroundService()
    .then(() => {
      console.log('\n✨ Test script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test script failed:', error)
      process.exit(1)
    })
}

module.exports = { testBackgroundService }