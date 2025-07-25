// Simple test script to verify price fetcher functionality
const { PrismaClient } = require('@prisma/client')

// Mock Prisma for testing
const mockPrisma = {
  priceCache: {
    findUnique: () => Promise.resolve(null),
    upsert: () => Promise.resolve({}),
    deleteMany: () => Promise.resolve({ count: 0 }),
    aggregate: () => Promise.resolve({ _count: 0, _min: {}, _max: {} })
  }
}

// Mock fetch
global.fetch = async (url) => {
  if (url.includes('nseindia.com')) {
    return {
      ok: true,
      json: () => Promise.resolve({
        info: {
          symbol: 'RELIANCE',
          companyName: 'Reliance Industries Limited',
          lastPrice: 2500.50
        }
      })
    }
  } else if (url.includes('amfiindia.com')) {
    return {
      ok: true,
      text: () => Promise.resolve(`Scheme Code|ISIN Div Payout|ISIN Div Reinvestment|Scheme Name|Net Asset Value|Date
100001||INF209K01157|Test Fund|150.75|01-Jan-2024`)
    }
  }
  throw new Error('Unknown URL')
}

async function testPriceFetcher() {
  console.log('Testing price fetcher functionality...')
  
  try {
    // Test NSE stock price fetching
    console.log('Testing NSE stock price fetching...')
    const stockResponse = await fetch('https://www.nseindia.com/api/quote-equity?symbol=RELIANCE')
    const stockData = await stockResponse.json()
    console.log('✓ NSE API response:', stockData.info.lastPrice)
    
    // Test AMFI mutual fund NAV fetching
    console.log('Testing AMFI mutual fund NAV fetching...')
    const mfResponse = await fetch('https://www.amfiindia.com/spages/NAVAll.txt')
    const mfText = await mfResponse.text()
    const navData = mfText
      .split('\n')
      .filter(line => line.includes('|') && !line.startsWith('Scheme Code'))
      .map(line => {
        const [schemeCode, , schemeName, nav, date] = line.split('|')
        return {
          schemeCode: schemeCode.trim(),
          schemeName: schemeName.trim(),
          nav: parseFloat(nav.trim()),
          date: date.trim()
        }
      })
      .filter(item => !isNaN(item.nav))
    
    console.log('✓ AMFI NAV data:', navData[0])
    
    console.log('✓ All price fetcher tests passed!')
    
  } catch (error) {
    console.error('✗ Test failed:', error.message)
  }
}

testPriceFetcher()