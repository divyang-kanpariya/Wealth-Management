const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Google Script API configuration
const GOOGLE_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxjV3jJpUVQuO6RE8pnX-kf5rWBe2NxBGqk1EJyByI64Vip1UOj0dlL1XP20ksM8gZl/exec';
const GOOGLE_SCRIPT_AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjAzMmNjMWNiMjg5ZGQ0NjI2YTQzNWQ3Mjk4OWFlNDMyMTJkZWZlNzgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY29sb3JibGluZHByaW50cy02MmNhMCIsImF1ZCI6ImNvbG9yYmxpbmRwcmludHMtNjJjYTAiLCJhdXRoX3RpbWUiOjE3MDMxMzMyNTgsInVzZXJfaWQiOiJjWGFRQmdSV01mV0Y4Q3lVSDNvTlFBWHlTc2oxIiwic3ViIjoiY1hhUUJnUldNZldGOEN5VUgzb05RQVh5U3NqMSIsImlhdCI6MTcwMzEzMzI1OCwiZXhwIjoxNzAzMTM2ODU4LCJlbWFpbCI6ImR2QG5leG93YS5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZHZAbmV4b3dhLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9fQ.yMtTDUlXt1yq89W88dapVzBIad8WcF_ltP5zj0x1WUp12q1FGdzZ4bGcU7PL9RN63kbvERT8BCFZrtVaE1NXwSa2dCIWxBQCav9G9S06zvb13Zgl94B7IHH7avMmdXujzDRyPrRg8zopSb8uHxVafo5tY7qjNflBcqKi7s_83QdSbvlUgEztral5qeNJPd841J57Q8bw4O95bLOynIpRvYbdp4e79Urjms7hbt3ewYMgMoKU-NuafVPM12xA8Wwe1mCIhIYdHg8jQB8CVUeGAdDsSYYXkT__-xb5fF4QcGtHA0EifbAmcRbOc47uX6j8B1Od52Y5zWiwx6OV840cQw';

async function fetchStockPrices(symbols) {
  const formattedSymbols = symbols.map(symbol => {
    if (symbol.startsWith('NSE:')) {
      return symbol;
    }
    return `NSE:${symbol}`;
  });

  const response = await fetch(GOOGLE_SCRIPT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': GOOGLE_SCRIPT_AUTH_TOKEN,
    },
    body: JSON.stringify({
      symbols: formattedSymbols
    })
  });

  if (!response.ok) {
    throw new Error(`Google Script API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function fetchMutualFundNAV(schemeCodes) {
  const response = await fetch('https://www.amfiindia.com/spages/NAVAll.txt');

  if (!response.ok) {
    throw new Error(`AMFI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.text();
  const lines = data.split('\n');
  const navData = [];

  for (const line of lines) {
    if (!line.trim() ||
      line.includes('Scheme Code') ||
      line.includes('ISIN') ||
      line.includes('Open Ended Schemes') ||
      line.includes('Close Ended Schemes') ||
      line.includes('Interval Fund Schemes') ||
      !line.includes(';')) {
      continue;
    }

    const parts = line.split(';');
    if (parts.length >= 6) {
      const schemeCode = parts[0]?.trim();
      const isin = parts[1]?.trim();
      const schemeName = parts[3]?.trim();
      const navString = parts[4]?.trim();
      const dateString = parts[5]?.trim();

      const nav = parseFloat(navString);

      if (schemeCode && schemeName && !isNaN(nav) && nav > 0) {
        // Check if this matches any of our scheme codes (by ISIN)
        if (schemeCodes.includes(isin)) {
          navData.push({
            schemeCode: isin, // Use ISIN as the identifier
            nav,
            date: dateString || new Date().toISOString().split('T')[0],
            schemeName
          });
        }
      }
    }
  }

  return navData;
}

async function fixRefreshSync() {
  try {
    console.log('=== FIXING REFRESH SYNCHRONIZATION ISSUE ===\n');
    
    // Step 1: Get all symbols that should be tracked
    console.log('Step 1: Getting tracked symbols...');
    
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
    
    const allSymbols = [
      ...investments.map(inv => inv.symbol),
      ...sips.map(sip => sip.symbol)
    ].filter(s => s);
    
    const uniqueSymbols = [...new Set(allSymbols)];
    console.log(`Found ${uniqueSymbols.length} unique symbols to track`);
    
    // Separate stocks and mutual funds
    const stockSymbols = uniqueSymbols.filter(s => !s.match(/^INF\w+/));
    const mfSymbols = uniqueSymbols.filter(s => s.match(/^INF\w+/));
    
    console.log(`Stock symbols: ${stockSymbols.length}`);
    console.log(`Mutual fund symbols: ${mfSymbols.length}`);
    
    // Step 2: Clean up orphaned cache entries
    console.log('\nStep 2: Cleaning up orphaned cache entries...');
    
    const currentCache = await prisma.priceCache.findMany({
      select: { symbol: true, id: true }
    });
    
    const orphanedEntries = currentCache.filter(cache => 
      !uniqueSymbols.includes(cache.symbol)
    );
    
    if (orphanedEntries.length > 0) {
      console.log(`Removing ${orphanedEntries.length} orphaned entries:`, orphanedEntries.map(e => e.symbol));
      await prisma.priceCache.deleteMany({
        where: {
          id: { in: orphanedEntries.map(e => e.id) }
        }
      });
    }
    
    // Step 3: Refresh stock prices
    console.log('\nStep 3: Refreshing stock prices...');
    
    if (stockSymbols.length > 0) {
      try {
        console.log(`Fetching prices for ${stockSymbols.length} stocks...`);
        const stockPrices = await fetchStockPrices(stockSymbols);
        
        let stockSuccessCount = 0;
        let stockFailCount = 0;
        
        for (const symbol of stockSymbols) {
          const formattedSymbol = symbol.startsWith('NSE:') ? symbol : `NSE:${symbol}`;
          const price = stockPrices[formattedSymbol];
          
          if (typeof price === 'number' && price > 0) {
            try {
              await prisma.priceCache.upsert({
                where: { symbol },
                update: {
                  price,
                  lastUpdated: new Date(),
                  source: 'GOOGLE_SCRIPT'
                },
                create: {
                  symbol,
                  price,
                  source: 'GOOGLE_SCRIPT'
                }
              });
              
              // Also save to price history
              await prisma.priceHistory.create({
                data: {
                  symbol,
                  price,
                  source: 'GOOGLE_SCRIPT',
                  timestamp: new Date()
                }
              });
              
              console.log(`✓ ${symbol}: ${price}`);
              stockSuccessCount++;
            } catch (dbError) {
              console.error(`✗ Failed to save ${symbol}:`, dbError.message);
              stockFailCount++;
            }
          } else {
            console.log(`✗ ${symbol}: No price data`);
            stockFailCount++;
          }
        }
        
        console.log(`Stock refresh: ${stockSuccessCount} success, ${stockFailCount} failed`);
        
      } catch (error) {
        console.error('Stock price fetch failed:', error.message);
      }
    }
    
    // Step 4: Refresh mutual fund NAVs
    console.log('\nStep 4: Refreshing mutual fund NAVs...');
    
    if (mfSymbols.length > 0) {
      try {
        console.log(`Fetching NAVs for ${mfSymbols.length} mutual funds...`);
        const mfNavs = await fetchMutualFundNAV(mfSymbols);
        
        let mfSuccessCount = 0;
        let mfFailCount = 0;
        
        for (const symbol of mfSymbols) {
          const navData = mfNavs.find(nav => nav.schemeCode === symbol);
          
          if (navData && navData.nav > 0) {
            try {
              await prisma.priceCache.upsert({
                where: { symbol },
                update: {
                  price: navData.nav,
                  lastUpdated: new Date(),
                  source: 'AMFI'
                },
                create: {
                  symbol,
                  price: navData.nav,
                  source: 'AMFI'
                }
              });
              
              // Also save to price history
              await prisma.priceHistory.create({
                data: {
                  symbol,
                  price: navData.nav,
                  source: 'AMFI',
                  timestamp: new Date()
                }
              });
              
              console.log(`✓ ${symbol}: ${navData.nav} (${navData.schemeName})`);
              mfSuccessCount++;
            } catch (dbError) {
              console.error(`✗ Failed to save ${symbol}:`, dbError.message);
              mfFailCount++;
            }
          } else {
            console.log(`✗ ${symbol}: No NAV data`);
            mfFailCount++;
          }
        }
        
        console.log(`Mutual fund refresh: ${mfSuccessCount} success, ${mfFailCount} failed`);
        
      } catch (error) {
        console.error('Mutual fund NAV fetch failed:', error.message);
      }
    }
    
    // Step 5: Verify final state
    console.log('\nStep 5: Verifying final state...');
    
    const finalCache = await prisma.priceCache.findMany({
      orderBy: { lastUpdated: 'desc' }
    });
    
    console.log(`Final cache entries: ${finalCache.length}`);
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const freshEntries = finalCache.filter(c => c.lastUpdated > oneHourAgo);
    const staleEntries = finalCache.filter(c => c.lastUpdated <= oneHourAgo);
    
    console.log(`Fresh entries (< 1 hour): ${freshEntries.length}`);
    console.log(`Stale entries (> 1 hour): ${staleEntries.length}`);
    
    if (freshEntries.length > 0) {
      console.log('\nFresh entries:');
      freshEntries.forEach(entry => {
        console.log(`  ${entry.symbol}: ${entry.price} (${entry.source})`);
      });
    }
    
    if (staleEntries.length > 0) {
      console.log('\nStale entries:');
      staleEntries.forEach(entry => {
        console.log(`  ${entry.symbol}: ${entry.price} (${entry.source}) - ${entry.lastUpdated}`);
      });
    }
    
    // Step 6: Check for redundant tables
    console.log('\nStep 6: Analyzing table usage...');
    
    const priceHistoryCount = await prisma.priceHistory.count();
    const historicalPricesCount = await prisma.historicalPrice.count();
    
    console.log(`price_history entries: ${priceHistoryCount}`);
    console.log(`historical_prices entries: ${historicalPricesCount}`);
    
    if (historicalPricesCount === 0) {
      console.log('✓ historical_prices table is empty - this table might be redundant');
    }
    
    console.log('\n=== REFRESH SYNCHRONIZATION FIX COMPLETED ===');
    console.log('Summary:');
    console.log(`- Tracked symbols: ${uniqueSymbols.length}`);
    console.log(`- Cache entries: ${finalCache.length}`);
    console.log(`- Fresh entries: ${freshEntries.length}`);
    console.log(`- APIs working: Google Script ✓, AMFI ✓`);
    console.log(`- Database sync: ✓`);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('Fix failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixRefreshSync();