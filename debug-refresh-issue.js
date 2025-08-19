const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugRefreshIssue() {
  try {
    console.log('Debugging refresh issue...\n');
    
    // Check what symbols should be tracked
    console.log('=== CHECKING TRACKED SYMBOLS ===');
    
    const investments = await prisma.investment.findMany({
      where: {
        symbol: { not: null },
        type: { in: ['STOCK', 'MUTUAL_FUND', 'CRYPTO'] }
      },
      select: { symbol: true, type: true, name: true }
    });
    
    const sips = await prisma.sIP.findMany({
      select: { symbol: true, name: true }
    });
    
    console.log('Investments with symbols:', investments.length);
    console.log('Sample investments:', investments.slice(0, 5));
    
    console.log('SIPs with symbols:', sips.length);
    console.log('Sample SIPs:', sips.slice(0, 5));
    
    // Get all unique symbols that should be tracked
    const allSymbols = [
      ...investments.map(inv => inv.symbol),
      ...sips.map(sip => sip.symbol)
    ];
    const uniqueSymbols = [...new Set(allSymbols.filter(s => s))];
    
    console.log('Total unique symbols to track:', uniqueSymbols.length);
    console.log('Symbols:', uniqueSymbols);
    
    // Check current cache coverage
    console.log('\n=== CACHE COVERAGE ANALYSIS ===');
    
    const cachedSymbols = await prisma.priceCache.findMany({
      select: { symbol: true, lastUpdated: true, source: true }
    });
    
    const cachedSymbolSet = new Set(cachedSymbols.map(c => c.symbol));
    const missingFromCache = uniqueSymbols.filter(symbol => !cachedSymbolSet.has(symbol));
    
    console.log('Symbols in cache:', cachedSymbols.length);
    console.log('Symbols missing from cache:', missingFromCache.length);
    console.log('Missing symbols:', missingFromCache);
    
    // Check cache freshness
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const freshCache = cachedSymbols.filter(c => c.lastUpdated > oneHourAgo);
    const staleCache = cachedSymbols.filter(c => c.lastUpdated <= oneHourAgo);
    
    console.log('Fresh cache entries (< 1 hour):', freshCache.length);
    console.log('Stale cache entries (> 1 hour):', staleCache.length);
    
    if (staleCache.length > 0) {
      console.log('Stale entries:', staleCache);
    }
    
    // Test API call directly
    console.log('\n=== TESTING API CALL ===');
    
    if (uniqueSymbols.length > 0) {
      const testSymbol = uniqueSymbols[0];
      console.log(`Testing API call for symbol: ${testSymbol}`);
      
      try {
        // Test the refresh API endpoint
        const response = await fetch('http://localhost:3000/api/pricing/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbols: [testSymbol],
            forceRefresh: true
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('API Response:', JSON.stringify(result, null, 2));
          
          // Check if the price was actually saved to database
          console.log('\nChecking database after API call...');
          const updatedCache = await prisma.priceCache.findUnique({
            where: { symbol: testSymbol }
          });
          console.log('Updated cache entry:', updatedCache);
          
        } else {
          console.log('API call failed:', response.status, response.statusText);
          const errorText = await response.text();
          console.log('Error response:', errorText);
        }
        
      } catch (apiError) {
        console.error('API call error:', apiError.message);
        console.log('This might be because the dev server is not running');
      }
    }
    
    await prisma.$disconnect();
    console.log('\nDebug completed');
    
  } catch (error) {
    console.error('Debug failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

debugRefreshIssue();