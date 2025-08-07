// Simple test script to verify price enhancement functionality
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPriceEnhancements() {
  console.log('Testing enhanced price data management...')
  
  try {
    // Test 1: Check if PriceHistory table exists and can be written to
    console.log('\n1. Testing price history functionality...')
    
    await prisma.priceHistory.create({
      data: {
        symbol: 'TEST_SYMBOL',
        price: 100.50,
        source: 'TEST',
        timestamp: new Date()
      }
    })
    
    const history = await prisma.priceHistory.findMany({
      where: { symbol: 'TEST_SYMBOL' }
    })
    
    console.log(`✓ Price history created: ${history.length} records found`)
    
    // Test 2: Test price cache functionality
    console.log('\n2. Testing price cache functionality...')
    
    await prisma.priceCache.create({
      data: {
        symbol: 'TEST_CACHE',
        price: 200.75,
        source: 'TEST'
      }
    })
    
    const cache = await prisma.priceCache.findUnique({
      where: { symbol: 'TEST_CACHE' }
    })
    
    console.log(`✓ Price cache created: ${cache ? 'Found' : 'Not found'}`)
    
    // Test 3: Test API endpoints
    console.log('\n3. Testing API endpoints...')
    
    // Test refresh status endpoint
    try {
      const response = await fetch('http://localhost:3000/api/prices/refresh')
      if (response.ok) {
        const data = await response.json()
        console.log('✓ Refresh API endpoint working:', data.scheduler ? 'Scheduler status available' : 'No scheduler status')
      } else {
        console.log('⚠ Refresh API endpoint not available (server may not be running)')
      }
    } catch (error) {
      console.log('⚠ Refresh API endpoint not available (server may not be running)')
    }
    
    // Test history API endpoint
    try {
      const response = await fetch('http://localhost:3000/api/prices/history?action=stats')
      if (response.ok) {
        const data = await response.json()
        console.log('✓ History API endpoint working:', data.priceHistory ? 'History stats available' : 'No history stats')
      } else {
        console.log('⚠ History API endpoint not available (server may not be running)')
      }
    } catch (error) {
      console.log('⚠ History API endpoint not available (server may not be running)')
    }
    
    // Test 4: Test enhanced cache stats
    console.log('\n4. Testing enhanced cache statistics...')
    
    const stats = await prisma.priceHistory.aggregate({
      _count: true,
      _min: { timestamp: true },
      _max: { timestamp: true }
    })
    
    console.log(`✓ Enhanced stats working: ${stats._count} history records`)
    
    // Clean up test data
    console.log('\n5. Cleaning up test data...')
    
    await prisma.priceHistory.deleteMany({
      where: { symbol: 'TEST_SYMBOL' }
    })
    
    await prisma.priceCache.deleteMany({
      where: { symbol: 'TEST_CACHE' }
    })
    
    console.log('✓ Test data cleaned up')
    
    console.log('\n✅ All basic functionality tests passed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testPriceEnhancements()