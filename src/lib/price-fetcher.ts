import { PrismaClient } from '@prisma/client'
import {
  fetchPriceWithEnhancedErrorHandling,
  batchFetchWithErrorHandling,
  StaleDataFallbackHandler,
  UserFriendlyErrorHandler,
  PricingError,
  APIRateLimitError,
  APITimeoutError,
  DataNotFoundError,
  executeWithRetry,
  executeWithTimeout,
  rateLimiter
} from './pricing-error-handler'

const prisma = new PrismaClient()

/**
 * Price Fetcher with Database-Only Caching
 * 
 * This implementation uses only the database PriceCache table for caching pricing data.
 * No in-memory caching is used to ensure consistency across multiple instances.
 * 
 * Staleness Check Implementation:
 * - Fresh data: < 1 hour old (served immediately)
 * - Stale data: 1-24 hours old (used as fallback when fresh fetch fails)
 * - Expired data: > 24 hours old (not used, fresh fetch required)
 */

// Configuration constants for database-only caching
const FRESH_CACHE_THRESHOLD = 60 * 60 * 1000 // 1 hour for fresh cache
const STALE_CACHE_THRESHOLD = 24 * 60 * 60 * 1000 // 24 hours for stale cache fallback
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1 second

// Background refresh is now handled by BackgroundPriceRefreshService
// This file focuses on individual price fetching and caching operations

// Google Apps Script API configuration
const GOOGLE_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxjV3jJpUVQuO6RE8pnX-kf5rWBe2NxBGqk1EJyByI64Vip1UOj0dlL1XP20ksM8gZl/exec'
const GOOGLE_SCRIPT_AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjAzMmNjMWNiMjg5ZGQ0NjI2YTQzNWQ3Mjk4OWFlNDMyMTJkZWZlNzgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY29sb3JibGluZHByaW50cy02MmNhMCIsImF1ZCI6ImNvbG9yYmxpbmRwcmludHMtNjJjYTAiLCJhdXRoX3RpbWUiOjE3MDMxMzMyNTgsInVzZXJfaWQiOiJjWGFRQmdSV01mV0Y4Q3lVSDNvTlFBWHlTc2oxIiwic3ViIjoiY1hhUUJnUldNZldGOEN5VUgzb05RQVh5U3NqMSIsImlhdCI6MTcwMzEzMzI1OCwiZXhwIjoxNzAzMTM2ODU4LCJlbWFpbCI6ImR2QG5leG93YS5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZHZAbmV4b3dhLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9fQ.yMtTDUlXt1yq89W88dapVzBIad8WcF_ltP5zj0x1WUp12q1FGdzZ4bGcU7PL9RN63kbvERT8BCFZrtVaE1NXwSa2dCIWxBQCav9G9S06zvb13Zgl94B7IHH7avMmdXujzDRyPrRg8zopSb8uHxVafo5tY7qjNflBcqKi7s_83QdSbvlUgEztral5qeNJPd841J57Q8bw4O95bLOynIpRvYbdp4e79Urjms7hbt3ewYMgMoKU-NuafVPM12xA8Wwe1mCIhIYdHg8jQB8CVUeGAdDsSYYXkT__-xb5fF4QcGtHA0EifbAmcRbOc47uX6j8B1Od52Y5zWiwx6OV840cQw'

// Types for API responses
interface GoogleScriptPriceResponse {
  [key: string]: number // e.g., { "NSE:RELIANCE": 1389.5, "NSE:INFY": 1532.3 }
}

// Database-only caching implementation - no in-memory caching

/**
 * Unified price fetching from Google Apps Script API with enhanced error handling
 * Handles both stocks (NSE:SYMBOL) and mutual funds (MUTF_IN:SCHEME_CODE)
 */
export async function fetchUnifiedPrices(symbols: string[]): Promise<GoogleScriptPriceResponse> {
  // Check rate limits before making the request
  await rateLimiter.checkRateLimit('GOOGLE_SCRIPT')

  const fetchOperation = async (): Promise<GoogleScriptPriceResponse> => {
    // Format symbols for Google Script API
    const formattedSymbols = symbols.map(symbol => {
      // Check if it's a mutual fund scheme code (pure numeric)
      if (symbol.includes("_")) {
        return `MUTF_IN:${symbol}`
      }
      // Handle stock symbols (add NSE: prefix if not present)
      if (symbol.startsWith('NSE:') || symbol.startsWith('MUTF_IN:')) {
        return symbol
      }

      return `NSE:${symbol}`
    })

    const response = await fetch(GOOGLE_SCRIPT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': GOOGLE_SCRIPT_AUTH_TOKEN,
      },
      body: JSON.stringify({
        symbols: formattedSymbols
      })
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new APIRateLimitError(`Google Script API rate limit exceeded: ${response.statusText}`)
      }
      throw new PricingError(
        `Google Script API error: ${response.status} ${response.statusText}`,
        'API_ERROR',
        undefined,
        undefined,
        response.status >= 500 // Server errors are retryable
      )
    }

    const data: GoogleScriptPriceResponse = await response.json()

    console.log(data, "-----");


    if (!data || typeof data !== 'object') {
      throw new PricingError(
        'Invalid response from Google Script API',
        'INVALID_RESPONSE',
        undefined,
        undefined,
        false
      )
    }

    return data
  }

  try {
    return await executeWithTimeout(
      () => executeWithRetry(fetchOperation, { operationType: 'Google Script API fetch' }),
      30000,
      'Google Script API call'
    )
  } catch (error) {
    console.error('Error fetching prices from Google Script API:', error)

    if (error instanceof PricingError || error instanceof APIRateLimitError || error instanceof APITimeoutError) {
      throw error
    }

    throw new PricingError(
      'Failed to fetch prices',
      'FETCH_FAILED',
      undefined,
      error instanceof Error ? error : new Error('Unknown error'),
      true
    )
  }
}

/**
 * @deprecated Use fetchUnifiedPrices instead. This function is kept for backward compatibility.
 * Fetch stock prices from Google Apps Script API with enhanced error handling
 */
export async function fetchStockPrices(symbols: string[]): Promise<GoogleScriptPriceResponse> {
  console.warn('fetchStockPrices is deprecated. Use fetchUnifiedPrices instead.')
  return fetchUnifiedPrices(symbols)
}

/**
 * Get price from database cache with staleness check
 * Returns fresh data (< 1 hour), stale data (1-24 hours), or null (> 24 hours)
 */
export async function getCachedPrice(symbol: string): Promise<{ price: number; source: string; isStale: boolean } | null> {
  try {
    const dbCache = await prisma.priceCache.findUnique({
      where: { symbol }
    })

    if (dbCache) {
      const cacheAge = Date.now() - dbCache.lastUpdated.getTime()

      // Fresh data (within 1 hour)
      if (cacheAge < FRESH_CACHE_THRESHOLD) {
        return {
          price: dbCache.price,
          source: dbCache.source,
          isStale: false
        }
      }

      // Stale data (1-24 hours old) - still usable as fallback
      if (cacheAge < STALE_CACHE_THRESHOLD) {
        return {
          price: dbCache.price,
          source: `${dbCache.source}_STALE`,
          isStale: true
        }
      }
    }
  } catch (error) {
    console.error('Error reading from database cache:', error)
  }

  return null
}

/**
 * Update price cache (database only)
 */
export async function updatePriceCache(symbol: string, price: number, source: string = 'GOOGLE_SCRIPT'): Promise<void> {
  try {
    await prisma.priceCache.upsert({
      where: { symbol },
      update: {
        price,
        lastUpdated: new Date(),
        source
      },
      create: {
        symbol,
        price,
        source
      }
    })
  } catch (error) {
    console.error('Error updating database cache:', error)
    throw error // Throw error since we only have database cache now
  }
}

/**
 * Get current price for a single symbol with enhanced error handling and fallbacks
 * Supports both stocks and mutual funds through unified API
 * Implements staleness check: 1 hour for fresh, 24 hours for fallback
 */
export async function getPrice(symbol: string, forceRefresh: boolean = false): Promise<number> {
  try {
    const result = await fetchPriceWithEnhancedErrorHandling(
      symbol,
      async () => {
        const prices = await fetchUnifiedPrices([symbol])

        // Determine the formatted symbol key based on symbol type
        let formattedSymbol: string
        if (symbol.includes("_")) {
          // Mutual fund scheme code
          formattedSymbol = `MUTF_IN:${symbol}`
        } else if (symbol.startsWith('NSE:') || symbol.startsWith('MUTF_IN:')) {
          // Already formatted
          formattedSymbol = symbol
        } else {
          // Stock symbol
          formattedSymbol = `NSE:${symbol}`
        }

        const price = prices[formattedSymbol]

        if (typeof price !== 'number') {
          throw new DataNotFoundError(`Price not found for symbol ${symbol}`, symbol)
        }

        // Update database cache with fresh data
        await updatePriceCache(symbol, price, 'GOOGLE_SCRIPT')
        await savePriceHistory(symbol, price, 'GOOGLE_SCRIPT')

        return price
      },
      'GOOGLE_SCRIPT',
      forceRefresh
    )

    return result.price
  } catch (error) {
    // Enhance error with user-friendly information
    const errorInstance = error instanceof Error ? error : new Error(String(error))
    const errorInfo = UserFriendlyErrorHandler.getErrorMessage(errorInstance, symbol)
    console.error(`Price fetch failed for ${symbol}:`, errorInfo.technicalMessage)

    throw errorInstance
  }
}

/**
 * Unified batch fetch prices for multiple symbols (stocks and mutual funds) with enhanced error handling
 * Makes a single bulk API request instead of individual requests per symbol
 */
export async function batchGetPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number | null; error?: string }>> {
  if (symbols.length === 0) {
    return []
  }

  console.log(`[batchGetPrices] Fetching prices for ${symbols.length} symbols (stocks and mutual funds) in single bulk request`)

  try {
    // Check rate limits before making the bulk request
    await rateLimiter.checkRateLimit('GOOGLE_SCRIPT')

    // Make a single bulk API request for all symbols (stocks and mutual funds)
    const prices = await executeWithRetry(
      () => executeWithTimeout(
        () => fetchUnifiedPrices(symbols), // Pass all symbols at once
        30000, // 30 seconds timeout
        'Google Script unified bulk price fetch'
      ),
      {
        operationType: 'Google Script unified bulk price fetch',
        symbol: `${symbols.length} symbols`
      }
    )

    // Process the bulk response and update cache for all symbols
    const results: Array<{ symbol: string; price: number | null; error?: string }> = []

    for (const symbol of symbols) {
      // Determine the formatted symbol key based on symbol type
      let formattedSymbol: string
      if (symbol.includes("_")) {
        // Mutual fund scheme code
        formattedSymbol = `MUTF_IN:${symbol}`
      } else if (symbol.startsWith('NSE:') || symbol.startsWith('MUTF_IN:')) {
        // Already formatted
        formattedSymbol = symbol
      } else {
        // Stock symbol
        formattedSymbol = `NSE:${symbol}`
      }

      const price = prices[formattedSymbol]

      if (typeof price === 'number' && !isNaN(price)) {
        // Update cache and history for successful fetches
        try {
          await updatePriceCache(symbol, price, 'GOOGLE_SCRIPT')
          await savePriceHistory(symbol, price, 'GOOGLE_SCRIPT')
          results.push({ symbol, price })
        } catch (cacheError) {
          console.warn(`Failed to update cache for ${symbol}:`, cacheError)
          // Still return the price even if cache update fails
          results.push({ symbol, price })
        }
      } else {
        results.push({
          symbol,
          price: null,
          error: `Price not available for ${symbol}`
        })
      }
    }

    console.log(`[batchGetPrices] Unified bulk request completed: ${results.filter(r => r.price !== null).length}/${symbols.length} successful`)
    return results

  } catch (error) {
    console.error(`[batchGetPrices] Unified bulk request failed for ${symbols.length} symbols:`, error)

    // If bulk request fails, try to get cached data for all symbols
    const fallbackResults: Array<{ symbol: string; price: number | null; error?: string }> = []

    for (const symbol of symbols) {
      try {
        const cached = await getCachedPrice(symbol)
        if (cached) {
          fallbackResults.push({
            symbol,
            price: cached.price,
            error: cached.isStale ? 'Using cached data (API unavailable)' : undefined
          })
        } else {
          fallbackResults.push({
            symbol,
            price: null,
            error: 'No cached data available'
          })
        }
      } catch (fallbackError) {
        fallbackResults.push({
          symbol,
          price: null,
          error: 'Failed to fetch price and no cached data available'
        })
      }
    }

    console.log(`[batchGetPrices] Fallback completed: ${fallbackResults.filter(r => r.price !== null).length}/${symbols.length} from cache`)
    return fallbackResults
  }
}

/**
 * Clear database cache
 */
export async function clearAllCaches(): Promise<void> {
  try {
    await prisma.priceCache.deleteMany()
  } catch (error) {
    console.error('Error clearing database cache:', error)
  }
}

/**
 * Clean up orphaned cache entries that are no longer tracked
 */
export async function cleanupOrphanedCacheEntries(): Promise<{ removed: number; symbols: string[] }> {
  try {
    const trackedSymbols = await getAllTrackedSymbols()
    const currentCache = await prisma.priceCache.findMany({
      select: { symbol: true, id: true }
    })

    const orphanedEntries = currentCache.filter(cache =>
      !trackedSymbols.includes(cache.symbol)
    )

    if (orphanedEntries.length > 0) {
      const orphanedSymbols = orphanedEntries.map(e => e.symbol)
      const orphanedIds = orphanedEntries.map(e => e.id)

      const deleteResult = await prisma.priceCache.deleteMany({
        where: {
          id: { in: orphanedIds }
        }
      })

      console.log(`[cleanupOrphanedCacheEntries] Removed ${deleteResult.count} orphaned entries:`, orphanedSymbols)

      return {
        removed: deleteResult.count,
        symbols: orphanedSymbols
      }
    }

    return { removed: 0, symbols: [] }
  } catch (error) {
    console.error('Error cleaning up orphaned cache entries:', error)
    return { removed: 0, symbols: [] }
  }
}

/**
 * Get cache statistics (database-only caching)
 */
export async function getCacheStats(): Promise<{
  databaseCache: {
    count: number;
    freshCount: number;
    staleCount: number;
    expiredCount: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }
}> {
  try {
    const dbStats = await prisma.priceCache.aggregate({
      _count: true,
      _min: { lastUpdated: true },
      _max: { lastUpdated: true }
    })

    // Get counts by freshness
    const now = new Date()
    const freshThreshold = new Date(now.getTime() - FRESH_CACHE_THRESHOLD)
    const staleThreshold = new Date(now.getTime() - STALE_CACHE_THRESHOLD)

    const [freshCount, staleCount, expiredCount] = await Promise.all([
      prisma.priceCache.count({
        where: { lastUpdated: { gte: freshThreshold } }
      }),
      prisma.priceCache.count({
        where: {
          lastUpdated: {
            gte: staleThreshold,
            lt: freshThreshold
          }
        }
      }),
      prisma.priceCache.count({
        where: { lastUpdated: { lt: staleThreshold } }
      })
    ])

    return {
      databaseCache: {
        count: dbStats._count,
        freshCount,
        staleCount,
        expiredCount,
        oldestEntry: dbStats._min.lastUpdated || undefined,
        newestEntry: dbStats._max.lastUpdated || undefined
      }
    }
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return {
      databaseCache: {
        count: 0,
        freshCount: 0,
        staleCount: 0,
        expiredCount: 0
      }
    }
  }
}

/**
 * @deprecated Use fetchUnifiedPrices instead. This function is kept for backward compatibility.
 * Fetch mutual fund NAV from AMFI API with enhanced error handling
 */
export async function fetchMutualFundNAV(schemeCodes?: string[]): Promise<Array<{ schemeCode: string; nav: number; date: string; schemeName: string }>> {
  console.warn('fetchMutualFundNAV is deprecated. Use fetchUnifiedPrices instead.')

  // Use the unified price fetcher instead of the old AMFI scraping
  if (!schemeCodes || schemeCodes.length === 0) {
    // If no specific scheme codes requested, return empty array
    // The old function would fetch all NAVs which is not efficient
    console.warn('fetchMutualFundNAV called without scheme codes. Use fetchUnifiedPrices with specific symbols instead.')
    return []
  }

  try {
    const prices = await fetchUnifiedPrices(schemeCodes)
    const results: Array<{ schemeCode: string; nav: number; date: string; schemeName: string }> = []

    for (const schemeCode of schemeCodes) {
      const formattedSymbol = `MUTF_IN:${schemeCode}`
      const price = prices[formattedSymbol]

      if (typeof price === 'number' && !isNaN(price)) {
        results.push({
          schemeCode,
          nav: price,
          date: new Date().toISOString().split('T')[0],
          schemeName: `Scheme ${schemeCode}` // Generic name since we don't have scheme names from unified API
        })
      }
    }

    return results
  } catch (error) {
    console.error('Error in deprecated fetchMutualFundNAV:', error)
    throw error
  }
}

/**
 * @deprecated Use getPrice instead. This function is kept for backward compatibility.
 * Get mutual fund NAV for a specific scheme code with enhanced error handling and fallbacks
 * Implements staleness check: 1 hour for fresh, 24 hours for fallback
 */
export async function getMutualFundNAV(schemeCode: string, forceRefresh: boolean = false): Promise<number> {
  console.warn('getMutualFundNAV is deprecated. Use getPrice instead.')
  return getPrice(schemeCode, forceRefresh)
}

/**
 * @deprecated Use batchGetPrices instead. This function is kept for backward compatibility.
 * Batch fetch mutual fund NAVs for multiple scheme codes with enhanced error handling
 */
export async function batchGetMutualFundNAVs(schemeCodes: string[]): Promise<Array<{ schemeCode: string; nav: number | null; error?: string }>> {
  console.warn('batchGetMutualFundNAVs is deprecated. Use batchGetPrices instead.')

  // Convert to the new format and call the unified function
  const results = await batchGetPrices(schemeCodes)

  // Convert back to the expected format for backward compatibility
  return results.map(result => ({
    schemeCode: result.symbol,
    nav: result.price,
    error: result.error
  }))
}
/**

 * Enhanced price fetching with retry mechanism and fallback
 */
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchFn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, lastError.message)

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
  }

  throw lastError
}

/**
 * Save price to history for trend analysis
 */
export async function savePriceHistory(symbol: string, price: number, source: string): Promise<void> {
  try {
    await prisma.priceHistory.create({
      data: {
        symbol,
        price,
        source,
        timestamp: new Date()
      }
    })
  } catch (error) {
    console.error('Error saving price history:', error)
    // Don't throw here as this is supplementary data
  }
}

/**
 * Get price history for a symbol within a date range
 */
export async function getPriceHistory(
  symbol: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
): Promise<Array<{ price: number; timestamp: Date; source: string }>> {
  try {
    const whereClause: any = { symbol }

    if (startDate || endDate) {
      whereClause.timestamp = {}
      if (startDate) whereClause.timestamp.gte = startDate
      if (endDate) whereClause.timestamp.lte = endDate
    }

    const history = await prisma.priceHistory.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        price: true,
        timestamp: true,
        source: true
      }
    })

    return history
  } catch (error) {
    console.error('Error fetching price history:', error)
    return []
  }
}

/**
 * Get price trend analysis for a symbol
 */
export async function getPriceTrend(
  symbol: string,
  days: number = 30
): Promise<{
  currentPrice: number | null
  previousPrice: number | null
  change: number | null
  changePercent: number | null
  trend: 'up' | 'down' | 'stable' | 'unknown'
  dataPoints: number
}> {
  try {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    const history = await getPriceHistory(symbol, startDate, endDate)

    if (history.length === 0) {
      return {
        currentPrice: null,
        previousPrice: null,
        change: null,
        changePercent: null,
        trend: 'unknown',
        dataPoints: 0
      }
    }

    const currentPrice = history[0].price
    const previousPrice = history.length > 1 ? history[history.length - 1].price : null

    let change: number | null = null
    let changePercent: number | null = null
    let trend: 'up' | 'down' | 'stable' | 'unknown' = 'unknown'

    if (previousPrice !== null) {
      change = currentPrice - previousPrice
      changePercent = (change / previousPrice) * 100

      if (Math.abs(changePercent) < 0.1) {
        trend = 'stable'
      } else if (change > 0) {
        trend = 'up'
      } else {
        trend = 'down'
      }
    }

    return {
      currentPrice,
      previousPrice,
      change,
      changePercent,
      trend,
      dataPoints: history.length
    }
  } catch (error) {
    console.error('Error calculating price trend:', error)
    return {
      currentPrice: null,
      previousPrice: null,
      change: null,
      changePercent: null,
      trend: 'unknown',
      dataPoints: 0
    }
  }
}

/**
 * Enhanced unified price fetching with comprehensive error handling and fallback mechanisms
 * Supports both stocks and mutual funds through unified API
 * Implements simple staleness check: 1 hour for fresh, 24 hours for fallback
 */
export async function getPriceWithFallback(symbol: string, forceRefresh: boolean = false): Promise<{
  price: number
  source: string
  cached: boolean
  fallbackUsed: boolean
  warnings?: string[]
  confidence?: 'high' | 'medium' | 'low'
}> {
  try {
    const result = await fetchPriceWithEnhancedErrorHandling(
      symbol,
      async () => {
        const prices = await fetchUnifiedPrices([symbol])

        // Determine the formatted symbol key based on symbol type
        let formattedSymbol: string
        if (symbol.includes("_")) {
          // Mutual fund scheme code
          formattedSymbol = `MUTF_IN:${symbol}`
        } else if (symbol.startsWith('NSE:') || symbol.startsWith('MUTF_IN:')) {
          // Already formatted
          formattedSymbol = symbol
        } else {
          // Stock symbol
          formattedSymbol = `NSE:${symbol}`
        }

        const fetchedPrice = prices[formattedSymbol]

        if (typeof fetchedPrice !== 'number') {
          throw new DataNotFoundError(`Price not found for symbol ${symbol}`, symbol)
        }

        // Update database cache and save to history
        await updatePriceCache(symbol, fetchedPrice, 'GOOGLE_SCRIPT')
        await savePriceHistory(symbol, fetchedPrice, 'GOOGLE_SCRIPT')

        return fetchedPrice
      },
      'GOOGLE_SCRIPT',
      forceRefresh
    )

    return {
      price: result.price,
      source: result.source,
      cached: result.cached,
      fallbackUsed: result.fallbackUsed,
      warnings: result.warnings,
      confidence: result.confidence
    }
  } catch (error) {
    // Log the error with user-friendly information
    const errorInstance = error instanceof Error ? error : new Error(String(error))
    const errorInfo = UserFriendlyErrorHandler.getErrorMessage(errorInstance, symbol)
    console.error(`Enhanced unified price fetch failed for ${symbol}:`, errorInfo.technicalMessage)

    throw errorInstance
  }
}

/**
 * @deprecated Use getPriceWithFallback instead. This function is kept for backward compatibility.
 * Enhanced mutual fund NAV fetching with comprehensive error handling and fallback mechanisms
 */
export async function getMutualFundNAVWithFallback(schemeCode: string, forceRefresh: boolean = false): Promise<{
  nav: number
  source: string
  cached: boolean
  fallbackUsed: boolean
  warnings?: string[]
  confidence?: 'high' | 'medium' | 'low'
}> {
  console.warn('getMutualFundNAVWithFallback is deprecated. Use getPriceWithFallback instead.')

  // Use the unified function and convert the result format for backward compatibility
  const result = await getPriceWithFallback(schemeCode, forceRefresh)

  return {
    nav: result.price,
    source: result.source,
    cached: result.cached,
    fallbackUsed: result.fallbackUsed,
    warnings: result.warnings,
    confidence: result.confidence
  }
}

/**
 * Get all unique symbols from investments and SIPs that need price tracking
 * Updated to work with background refresh service and handle edge cases
 */
export async function getAllTrackedSymbols(): Promise<string[]> {
  try {
    const [investments, sips] = await Promise.all([
      prisma.investment.findMany({
        where: {
          symbol: { not: null },
          type: { in: ['STOCK', 'MUTUAL_FUND', 'CRYPTO'] }
        },
        select: { symbol: true }
      }),
      prisma.sIP.findMany({
        select: { symbol: true }
      })
    ])

    // Combine and deduplicate symbols, filtering out null/empty values
    const allSymbols = [
      ...investments.map(inv => inv.symbol!),
      ...sips.map(sip => sip.symbol).filter(s => s) // Filter out null symbols from SIPs
    ]

    const uniqueSymbols = [...new Set(allSymbols.filter(s => s && s.trim().length > 0))]

    console.log(`[getAllTrackedSymbols] Found ${uniqueSymbols.length} unique symbols to track`)
    return uniqueSymbols
  } catch (error) {
    console.error('Error fetching tracked symbols:', error)
    return []
  }
}

/**
 * Refresh prices for all tracked symbols with cleanup
 */
export async function refreshAllPrices(): Promise<{
  success: number
  failed: number
  errors: Array<{ symbol: string; error: string }>
  cleanup?: { removed: number; symbols: string[] }
}> {
  // First, clean up orphaned cache entries
  const cleanup = await cleanupOrphanedCacheEntries()

  const symbols = await getAllTrackedSymbols()
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ symbol: string; error: string }>,
    cleanup
  }

  console.log(`Starting refresh for ${symbols.length} tracked symbols`)

  // Process symbols in batches to avoid overwhelming the APIs
  const batchSize = 10
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (symbol) => {
        try {
          // Determine if it's a stock or mutual fund based on symbol format
          if (symbol.match(/^INF\w+/)) {
            // ISIN format symbols are mutual fund scheme codes
            await getMutualFundNAVWithFallback(symbol, true)
          } else if (symbol.includes("_")) {
            // Pure numeric symbols are also mutual fund scheme codes
            await getMutualFundNAVWithFallback(symbol, true)
          } else {
            // Other symbols are stock symbols
            await getPriceWithFallback(symbol, true)
          }
          results.success++
        } catch (error) {
          results.failed++
          results.errors.push({
            symbol,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })
    )

    // Small delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(`Price refresh completed: ${results.success} success, ${results.failed} failed`)
  if (cleanup.removed > 0) {
    console.log(`Cleanup: removed ${cleanup.removed} orphaned entries`)
  }

  return results
}

/**
 * Manual price refresh for specific symbols (used by UI refresh buttons)
 */
export async function manualPriceRefresh(symbols: string[]): Promise<{
  success: number
  failed: number
  results: Array<{
    symbol: string
    success: boolean
    price?: number
    error?: string
    refreshTime: number
  }>
}> {
  console.log(`[manualPriceRefresh] Manual refresh requested for ${symbols.length} symbols`)

  const results = {
    success: 0,
    failed: 0,
    results: [] as Array<{
      symbol: string
      success: boolean
      price?: number
      error?: string
      refreshTime: number
    }>
  }

  // Use the unified batch price fetching
  try {
    const batchResults = await batchGetPrices(symbols)

    for (const result of batchResults) {
      const refreshTime = Date.now()

      if (result.price !== null && result.price > 0) {
        results.success++
        results.results.push({
          symbol: result.symbol,
          success: true,
          price: result.price,
          refreshTime
        })
      } else {
        results.failed++
        results.results.push({
          symbol: result.symbol,
          success: false,
          error: result.error || 'Price not available',
          refreshTime
        })
      }
    }
  } catch (error) {
    // If batch fails, mark all as failed
    symbols.forEach(symbol => {
      results.failed++
      results.results.push({
        symbol,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        refreshTime: Date.now()
      })
    })
  }

  console.log(`[manualPriceRefresh] Completed: ${results.success} success, ${results.failed} failed`)
  return results
}

/**
 * Legacy scheduling functions - now handled by BackgroundPriceRefreshService
 * These are kept for backward compatibility but delegate to the new service
 */
export function startPriceRefreshScheduler(intervalMs?: number): void {
  console.warn('startPriceRefreshScheduler is deprecated. Use BackgroundPriceRefreshService instead.')
  // Import and start the new service
  import('./background-price-refresh-service').then(({ backgroundPriceRefreshService }) => {
    backgroundPriceRefreshService.startScheduledRefresh(intervalMs)
  })
}

export function stopPriceRefreshScheduler(): void {
  console.warn('stopPriceRefreshScheduler is deprecated. Use BackgroundPriceRefreshService instead.')
  // Import and stop the new service
  import('./background-price-refresh-service').then(({ backgroundPriceRefreshService }) => {
    backgroundPriceRefreshService.stopScheduledRefresh()
  })
}

export function getRefreshSchedulerStatus(): {
  running: boolean
  intervalMs: number | null
} {
  console.warn('getRefreshSchedulerStatus is deprecated. Use BackgroundPriceRefreshService instead.')
  console.warn('getRefreshSchedulerStatus is deprecated. Use BackgroundPriceRefreshService.getServiceStatus() instead.')
  return {
    running: false,
    intervalMs: null
  }
}

/**
 * Clean up old price history data
 */
export async function cleanupPriceHistory(daysToKeep: number = 365): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000))

    const result = await prisma.priceHistory.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    })

    console.log(`Cleaned up ${result.count} old price history records`)
    return result.count
  } catch (error) {
    console.error('Error cleaning up price history:', error)
    return 0
  }
}

/**
 * Get enhanced cache statistics including history data (database-only caching)
 */
export async function getEnhancedCacheStats(): Promise<{
  databaseCache: {
    count: number;
    freshCount: number;
    staleCount: number;
    expiredCount: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }
  priceHistory: { count: number; oldestEntry?: Date; newestEntry?: Date; uniqueSymbols: number }
  scheduler: { running: boolean; intervalMs: number | null }
}> {
  const basicStats = await getCacheStats()

  try {
    const historyStats = await prisma.priceHistory.aggregate({
      _count: true,
      _min: { timestamp: true },
      _max: { timestamp: true }
    })

    const uniqueSymbolsResult = await prisma.priceHistory.findMany({
      select: { symbol: true },
      distinct: ['symbol']
    })

    // Get scheduler status from BackgroundPriceRefreshService
    let schedulerStatus: { running: boolean; intervalMs: number | null } = { running: false, intervalMs: null }
    try {
      const { backgroundPriceRefreshService } = await import('./background-price-refresh-service')
      const serviceStatus = backgroundPriceRefreshService.getServiceStatus()
      schedulerStatus = {
        running: serviceStatus.running,
        intervalMs: serviceStatus.intervalMs
      }
    } catch (error) {
      console.warn('Could not get background service status:', error)
    }

    return {
      ...basicStats,
      priceHistory: {
        count: historyStats._count,
        oldestEntry: historyStats._min.timestamp || undefined,
        newestEntry: historyStats._max.timestamp || undefined,
        uniqueSymbols: uniqueSymbolsResult.length
      },
      scheduler: schedulerStatus
    }
  } catch (error) {
    console.error('Error getting enhanced cache stats:', error)
    return {
      ...basicStats,
      priceHistory: { count: 0, uniqueSymbols: 0 },
      scheduler: { running: false, intervalMs: null }
    }
  }
}