const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRefreshProcess() {
  try {
    console.log('Testing refresh process...\n');
    
    // Get the symbols that should be tracked
    const investments = await prisma.investment.findMany({
      where: {
        symbol: { not: null },
        type: { in: ['STOCK', 'MUTUAL_FUND', 'CRYPTO'] }
      },
      select: { symbol: true, type: true }
    });
    
    const trackedSymbols = investments.map(inv => inv.symbol).filter(s => s);
    console.log('Symbols to track:', trackedSymbols.length);
    
    // Clean up old cache entries that are not in current investments
    console.log('\n=== CLEANING UP ORPHANED CACHE ENTRIES ===');
    
    const currentCache = await prisma.priceCache.findMany({
      select: { symbol: true, id: true }
    });
    
    const orphanedEntries = currentCache.filter(cache => 
      !trackedSymbols.includes(cache.symbol)
    );
    
    console.log('Orphaned cache entries found:', orphanedEntries.length);
    console.log('Orphaned symbols:', orphanedEntries.map(e => e.symbol));
    
    if (orphanedEntries.length > 0) {
      // Delete orphaned entries
      const orphanedIds = orphanedEntries.map(e => e.id);
      const deleteResult = await prisma.priceCache.deleteMany({
        where: {
          id: { in: orphanedIds }
        }
      });
      console.log('Deleted orphaned entries:', deleteResult.count);
    }
    
    // Test manual price insertion for a few symbols
    console.log('\n=== TESTING MANUAL PRICE INSERTION ===');
    
    const testSymbols = trackedSymbols.slice(0, 3); // Test first 3 symbols
    console.log('Testing symbols:', testSymbols);
    
    for (const symbol of testSymbols) {
      try {
        // Insert a test price
        const testPrice = Math.random() * 1000 + 100; // Random price between 100-1100
        
        const upsertResult = await prisma.priceCache.upsert({
          where: { symbol },
          update: {
            price: testPrice,
            lastUpdated: new Date(),
            source: 'TEST_MANUAL'
          },
          create: {
            symbol,
            price: testPrice,
            source: 'TEST_MANUAL'
          }
        });
        
        console.log(`✓ Inserted/Updated ${symbol}: ${testPrice.toFixed(2)}`);
        
        // Also add to price history
        await prisma.priceHistory.create({
          data: {
            symbol,
            price: testPrice,
            source: 'TEST_MANUAL',
            timestamp: new Date()
          }
        });
        
      } catch (error) {
        console.error(`✗ Failed to insert ${symbol}:`, error.message);
      }
    }
    
    // Verify the insertions
    console.log('\n=== VERIFYING INSERTIONS ===');
    
    const updatedCache = await prisma.priceCache.findMany({
      orderBy: { lastUpdated: 'desc' }
    });
    
    console.log('Updated cache entries:', updatedCache.length);
    updatedCache.forEach(entry => {
      console.log(`${entry.symbol}: ${entry.price} (${entry.source}) - ${entry.lastUpdated}`);
    });
    
    // Test the actual price fetcher functions
    console.log('\n=== TESTING PRICE FETCHER FUNCTIONS ===');
    
    try {
      // Try to import and test the price fetcher
      console.log('Attempting to test price fetcher...');
      
      // Since we can't import TS directly, let's test the API approach
      // by simulating what the refresh should do
      
      // Check if we have any stock symbols vs mutual fund symbols
      const stockSymbols = trackedSymbols.filter(s => !s.match(/^INF\d+/)); // Not starting with INF (mutual funds)
      const mfSymbols = trackedSymbols.filter(s => s.match(/^INF\d+/)); // Starting with INF
      
      console.log('Stock symbols:', stockSymbols.length);
      console.log('Mutual fund symbols:', mfSymbols.length);
      
      console.log('Sample stock symbols:', stockSymbols.slice(0, 5));
      console.log('Sample MF symbols:', mfSymbols.slice(0, 5));
      
    } catch (error) {
      console.error('Price fetcher test failed:', error.message);
    }
    
    await prisma.$disconnect();
    console.log('\nTest completed');
    
  } catch (error) {
    console.error('Test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testRefreshProcess();