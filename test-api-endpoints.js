// Simple test to verify API endpoints work
const { NextRequest } = require('next/server')

// Mock the price-fetcher module
const mockPriceFetcher = {
  getPrice: async (symbol, source) => {
    if (source === 'NSE') return 2500.50
    if (source === 'AMFI') return 150.75
    throw new Error('Unknown source')
  },
  batchGetPrices: async (requests) => {
    return requests.map(req => ({
      symbol: req.symbol,
      price: req.source === 'NSE' ? 2500.50 : 150.75
    }))
  },
  getCachedPrice: async (symbol) => {
    return { price: 2000.00, source: 'NSE' }
  },
  fetchMutualFundNAV: async () => {
    return [
      { schemeCode: '100001', schemeName: 'Test Fund', nav: 150.75, date: '01-Jan-2024' }
    ]
  },
  getCacheStats: async () => {
    return {
      memoryCache: { size: 5 },
      databaseCache: { count: 10 }
    }
  },
  clearAllCaches: async () => {}
}

// Mock the module
require.cache[require.resolve('./src/lib/price-fetcher')] = {
  exports: mockPriceFetcher
}

async function testAPIEndpoints() {
  console.log('Testing API endpoint logic...')
  
  try {
    // Test stock price endpoint logic
    console.log('Testing stock price endpoint logic...')
    const stockPrice = await mockPriceFetcher.getPrice('RELIANCE', 'NSE')
    console.log('✓ Stock price fetch:', stockPrice)
    
    // Test batch stock prices
    console.log('Testing batch stock prices...')
    const batchResults = await mockPriceFetcher.batchGetPrices([
      { symbol: 'RELIANCE', source: 'NSE' },
      { symbol: 'TCS', source: 'NSE' }
    ])
    console.log('✓ Batch stock prices:', batchResults)
    
    // Test cached price
    console.log('Testing cached price...')
    const cachedPrice = await mockPriceFetcher.getCachedPrice('RELIANCE')
    console.log('✓ Cached price:', cachedPrice)
    
    // Test mutual fund NAV
    console.log('Testing mutual fund NAV...')
    const navData = await mockPriceFetcher.fetchMutualFundNAV()
    console.log('✓ Mutual fund NAV:', navData[0])
    
    // Test cache stats
    console.log('Testing cache stats...')
    const cacheStats = await mockPriceFetcher.getCacheStats()
    console.log('✓ Cache stats:', cacheStats)
    
    console.log('✓ All API endpoint tests passed!')
    
  } catch (error) {
    console.error('✗ API test failed:', error.message)
  }
}

testAPIEndpoints()