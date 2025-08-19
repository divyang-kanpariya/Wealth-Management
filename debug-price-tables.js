const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzePriceTables() {
  try {
    console.log('Analyzing price-related tables...\n');
    
    // Check price_cache table
    console.log('=== PRICE_CACHE TABLE ===');
    const priceCacheData = await prisma.priceCache.findMany({
      orderBy: { lastUpdated: 'desc' }
    });
    console.log('Count:', priceCacheData.length);
    console.log('Sample data:', priceCacheData.slice(0, 5));
    
    // Check price_history table
    console.log('\n=== PRICE_HISTORY TABLE ===');
    const priceHistoryCount = await prisma.priceHistory.count();
    console.log('Count:', priceHistoryCount);
    
    if (priceHistoryCount > 0) {
      const priceHistoryData = await prisma.priceHistory.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' }
      });
      console.log('Sample data:', priceHistoryData);
    }
    
    // Check historical_prices table
    console.log('\n=== HISTORICAL_PRICES TABLE ===');
    const historicalPricesCount = await prisma.historicalPrice.count();
    console.log('Count:', historicalPricesCount);
    
    if (historicalPricesCount > 0) {
      const historicalPricesData = await prisma.historicalPrice.findMany({
        take: 5,
        orderBy: { date: 'desc' }
      });
      console.log('Sample data:', historicalPricesData);
    }
    
    // Check for overlapping symbols between tables
    console.log('\n=== SYMBOL OVERLAP ANALYSIS ===');
    
    const cacheSymbols = await prisma.priceCache.findMany({
      select: { symbol: true }
    });
    const cacheSymbolSet = new Set(cacheSymbols.map(p => p.symbol));
    console.log('Unique symbols in price_cache:', cacheSymbolSet.size);
    
    if (priceHistoryCount > 0) {
      const historySymbols = await prisma.$queryRaw`
        SELECT DISTINCT symbol FROM price_history LIMIT 100
      `;
      const historySymbolSet = new Set(historySymbols.map(p => p.symbol));
      console.log('Unique symbols in price_history:', historySymbolSet.size);
      
      // Find overlapping symbols
      const overlap = [...cacheSymbolSet].filter(symbol => historySymbolSet.has(symbol));
      console.log('Overlapping symbols between cache and history:', overlap.length);
    }
    
    if (historicalPricesCount > 0) {
      const historicalSymbols = await prisma.$queryRaw`
        SELECT DISTINCT symbol FROM historical_prices LIMIT 100
      `;
      const historicalSymbolSet = new Set(historicalSymbols.map(p => p.symbol));
      console.log('Unique symbols in historical_prices:', historicalSymbolSet.size);
      
      // Find overlapping symbols
      const overlap = [...cacheSymbolSet].filter(symbol => historicalSymbolSet.has(symbol));
      console.log('Overlapping symbols between cache and historical_prices:', overlap.length);
    }
    
    // Test a manual refresh to see what happens
    console.log('\n=== TESTING MANUAL REFRESH ===');
    
    // Import the price fetcher
    const { updatePriceCache, fetchStockPrices } = require('./src/lib/price-fetcher.ts');
    
    console.log('Testing price fetch and cache update...');
    
    try {
      // Try to fetch a price for a test symbol
      const testSymbol = 'RELIANCE';
      console.log(`Attempting to fetch price for ${testSymbol}...`);
      
      // Check if symbol exists in investments
      const investment = await prisma.investment.findFirst({
        where: { symbol: testSymbol }
      });
      console.log('Investment with RELIANCE symbol:', investment ? 'Found' : 'Not found');
      
      // Check current cache for this symbol
      const currentCache = await prisma.priceCache.findUnique({
        where: { symbol: testSymbol }
      });
      console.log('Current cache for RELIANCE:', currentCache);
      
    } catch (fetchError) {
      console.error('Error during price fetch test:', fetchError.message);
    }
    
    await prisma.$disconnect();
    console.log('\nAnalysis completed');
    
  } catch (error) {
    console.error('Analysis failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

analyzePriceTables();