/**
 * No-Cache Behavior Tests Configuration
 * 
 * This configuration file sets up the test environment specifically
 * for no-cache behavior tests to ensure proper isolation and setup.
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'no-cache-behavior-tests',
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000, // 30 seconds timeout for integration tests
    hookTimeout: 10000, // 10 seconds for setup/teardown
    
    // Test file patterns for no-cache behavior tests
    include: [
      'src/test/integration/comprehensive-no-cache-behavior.test.ts',
      'src/test/integration/background-price-refresh-comprehensive.test.ts',
      'src/test/integration/enhanced-refresh-functionality.test.ts',
      'src/test/integration/database-only-pricing-cache.test.ts',
      'src/test/integration/no-cache-behavior-test-suite.test.ts',
      'src/test/unit/user-data-no-cache.test.ts',
      'src/test/lib/database-only-caching.test.ts'
    ],
    
    // Exclude other tests to focus on no-cache behavior
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'src/test/e2e/**',
      'src/test/performance/**',
      'src/test/components/**'
    ],
    
    // Global test configuration
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/no-cache-behavior',
      include: [
        'src/lib/server/actions/**',
        'src/lib/server/data-preparators/**',
        'src/lib/server/cache-invalidation.ts',
        'src/lib/background-price-refresh-service.ts',
        'src/lib/server/refresh-service.ts',
        'src/lib/price-fetcher.ts',
        'src/lib/pricing-error-handler.ts'
      ],
      exclude: [
        'src/test/**',
        'node_modules/**',
        'dist/**',
        '.next/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Parallel execution configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Retry configuration for flaky tests
    retry: 2,
    
    // Reporter configuration
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/no-cache-behavior-results.json'
    },
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL || 'mysql://localhost:3306/test_db',
      VITEST_POOL_ID: '1'
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../..')
    }
  }
})

/**
 * Test execution helper functions
 */
export const testHelpers = {
  /**
   * Run all no-cache behavior tests
   */
  async runAllTests() {
    console.log('🚀 Starting No-Cache Behavior Test Suite...')
    console.log('📋 Test Categories:')
    console.log('  1. User Data No-Cache Behavior')
    console.log('  2. Background Price Refresh Service')
    console.log('  3. Enhanced Refresh Functionality')
    console.log('  4. Database-Only Pricing Cache')
    console.log('  5. Integration Test Suite')
    console.log('')
  },

  /**
   * Validate test environment
   */
  validateEnvironment() {
    const requiredEnvVars = ['DATABASE_URL']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }
    
    console.log('✅ Test environment validated')
  },

  /**
   * Generate test report summary
   */
  generateSummary(results: any) {
    console.log('\n📊 Test Execution Summary:')
    console.log(`Total Tests: ${results.numTotalTests}`)
    console.log(`Passed: ${results.numPassedTests}`)
    console.log(`Failed: ${results.numFailedTests}`)
    console.log(`Skipped: ${results.numPendingTests}`)
    console.log(`Duration: ${results.testResults?.[0]?.perfStats?.runtime || 'N/A'}ms`)
    
    if (results.numFailedTests > 0) {
      console.log('\n❌ Failed Tests:')
      results.testResults?.forEach((result: any) => {
        if (result.numFailingTests > 0) {
          console.log(`  - ${result.testFilePath}`)
        }
      })
    }
    
    console.log('\n✅ No-Cache Behavior Test Suite Complete!')
  }
}

/**
 * Test data factories for consistent test data creation
 */
export const testDataFactories = {
  createTestAccount: () => ({
    name: `TEST_NO_CACHE_ACCOUNT_${Date.now()}`,
    type: 'BROKER' as const
  }),

  createTestGoal: () => ({
    name: `TEST_NO_CACHE_GOAL_${Date.now()}`,
    targetAmount: 100000,
    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  }),

  createTestInvestment: (accountId: string, goalId?: string) => ({
    type: 'STOCK' as const,
    name: `TEST_NO_CACHE_INVESTMENT_${Date.now()}`,
    symbol: 'TEST',
    units: 100,
    buyPrice: 50,
    buyDate: new Date(),
    accountId,
    goalId
  }),

  createTestSip: (accountId: string, goalId?: string) => ({
    name: `TEST_NO_CACHE_SIP_${Date.now()}`,
    symbol: '120503',
    amount: 5000,
    frequency: 'MONTHLY' as const,
    startDate: new Date(),
    accountId,
    goalId
  }),

  createTestPriceCache: (symbol: string, ageInMinutes: number = 30) => ({
    symbol,
    price: Math.random() * 1000,
    source: 'GOOGLE_SCRIPT' as const,
    lastUpdated: new Date(Date.now() - ageInMinutes * 60 * 1000)
  })
}

/**
 * Performance benchmarks for test validation
 */
export const performanceBenchmarks = {
  userDataCRUD: 500, // ms
  dataPreparatorFetch: 2000, // ms
  databaseCacheRetrieval: 100, // ms
  backgroundRefresh: 30000, // ms
  manualRefresh: 10000, // ms
  concurrentOperations: 5000 // ms
}

/**
 * Test cleanup utilities
 */
export const testCleanup = {
  async cleanupTestData(prisma: any) {
    await prisma.priceCache.deleteMany({
      where: {
        symbol: { contains: 'TEST' }
      }
    })
    
    await prisma.investment.deleteMany({
      where: {
        name: { contains: 'TEST_NO_CACHE' }
      }
    })
    
    await prisma.sIP.deleteMany({
      where: {
        name: { contains: 'TEST_NO_CACHE' }
      }
    })
    
    await prisma.goal.deleteMany({
      where: {
        name: { contains: 'TEST_NO_CACHE' }
      }
    })
    
    await prisma.account.deleteMany({
      where: {
        name: { contains: 'TEST_NO_CACHE' }
      }
    })
  }
}