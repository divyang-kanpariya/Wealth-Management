const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful:', result);
    
    // Check existing tables
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('Available tables:', tables);
    
    // Check PriceCache table structure
    const priceCacheStructure = await prisma.$queryRaw`DESCRIBE price_cache`;
    console.log('PriceCache table structure:', priceCacheStructure);
    
    // Check if there are any existing price cache entries
    const priceCacheCount = await prisma.priceCache.count();
    console.log('Existing price cache entries:', priceCacheCount);
    
    // Check for any duplicate or similar tables
    const similarTables = await prisma.$queryRaw`SHOW TABLES LIKE '%price%'`;
    console.log('Price-related tables:', similarTables);
    
    // Test inserting a sample price
    console.log('\nTesting price cache insertion...');
    const testSymbol = 'TEST_SYMBOL_' + Date.now();
    const testPrice = 100.50;
    
    await prisma.priceCache.upsert({
      where: { symbol: testSymbol },
      update: {
        price: testPrice,
        lastUpdated: new Date(),
        source: 'TEST'
      },
      create: {
        symbol: testSymbol,
        price: testPrice,
        source: 'TEST'
      }
    });
    
    console.log('Test price inserted successfully');
    
    // Verify the insertion
    const insertedPrice = await prisma.priceCache.findUnique({
      where: { symbol: testSymbol }
    });
    console.log('Inserted price verification:', insertedPrice);
    
    // Clean up test data
    await prisma.priceCache.delete({
      where: { symbol: testSymbol }
    });
    console.log('Test data cleaned up');
    
    await prisma.$disconnect();
    console.log('Database test completed successfully');
  } catch (error) {
    console.error('Database test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testDatabaseConnection();