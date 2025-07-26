import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Configuration constants
const CACHE_DURATION_MEMORY = 5 * 60 * 1000 // 5 minutes for in-memory cache
const CACHE_DURATION_DB = 60 * 60 * 1000 // 1 hour for database cache
const STALE_CACHE_THRESHOLD = 24 * 60 * 60 * 1000 // 24 hours for stale cache
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1 second

// Price refresh scheduling
let refreshInterval: NodeJS.Timeout | null = null
const DEFAULT_REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes

// Google Apps Script API configuration
const GOOGLE_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxjV3jJpUVQuO6RE8pnX-kf5rWBe2NxBGqk1EJyByI64Vip1UOj0dlL1XP20ksM8gZl/exec'
const GOOGLE_SCRIPT_AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjAzMmNjMWNiMjg5ZGQ0NjI2YTQzNWQ3Mjk4OWFlNDMyMTJkZWZlNzgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY29sb3JibGluZHByaW50cy02MmNhMCIsImF1ZCI6ImNvbG9yYmxpbmRwcmludHMtNjJjYTAiLCJhdXRoX3RpbWUiOjE3MDMxMzMyNTgsInVzZXJfaWQiOiJjWGFRQmdSV01mV0Y4Q3lVSDNvTlFBWHlTc2oxIiwic3ViIjoiY1hhUUJnUldNZldGOEN5VUgzb05RQVh5U3NqMSIsImlhdCI6MTcwMzEzMzI1OCwiZXhwIjoxNzAzMTM2ODU4LCJlbWFpbCI6ImR2QG5leG93YS5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZHZAbmV4b3dhLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9fQ.yMtTDUlXt1yq89W88dapVzBIad8WcF_ltP5zj0x1WUp12q1FGdzZ4bGcU7PL9RN63kbvERT8BCFZrtVaE1NXwSa2dCIWxBQCav9G9S06zvb13Zgl94B7IHH7avMmdXujzDRyPrRg8zopSb8uHxVafo5tY7qjNflBcqKi7s_83QdSbvlUgEztral5qeNJPd841J57Q8bw4O95bLOynIpRvYbdp4e79Urjms7hbt3ewYMgMoKU-NuafVPM12xA8Wwe1mCIhIYdHg8jQB8CVUeGAdDsSYYXkT__-xb5fF4QcGtHA0EifbAmcRbOc47uX6j8B1Od52Y5zWiwx6OV840cQw'

// Types for API responses
interface GoogleScriptPriceResponse {
  [key: string]: number // e.g., { "NSE:RELIANCE": 1389.5, "NSE:INFY": 1532.3 }
}

// In-memory cache for price data
class InMemoryPriceCache {
  private cache = new Map<string, { price: number; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  get(symbol: string): { price: number; timestamp: number } | undefined {
    const cached = this.cache.get(symbol)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached
    }
    return undefined
  }

  set(symbol: string, price: number): void {
    this.cache.set(symbol, { price, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

const inMemoryCache = new InMemoryPriceCache()

/**
 * Fetch stock prices from Google Apps Script API
 */
export async function fetchStockPrices(symbols: string[]): Promise<GoogleScriptPriceResponse> {
  try {
    // Format symbols for NSE (add NSE: prefix if not present)
    const formattedSymbols = symbols.map(symbol => {
      if (symbol.startsWith('NSE:')) {
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
      throw new Error(`Google Script API error: ${response.status} ${response.statusText}`)
    }

    const data: GoogleScriptPriceResponse = await response.json()

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from Google Script API')
    }

    return data
  } catch (error) {
    console.error('Error fetching stock prices from Google Script API:', error)
    throw new Error('Failed to fetch stock prices')
  }
}

/**
 * Get price from cache (in-memory first, then database)
 */
export async function getCachedPrice(symbol: string): Promise<{ price: number; source: string } | null> {
  // Check in-memory cache first
  const memoryCache = inMemoryCache.get(symbol)
  if (memoryCache) {
    return { price: memoryCache.price, source: 'memory' }
  }

  // Check database cache
  try {
    const dbCache = await prisma.priceCache.findUnique({
      where: { symbol }
    })

    if (dbCache) {
      // Check if cache is still valid (within 1 hour)
      const cacheAge = Date.now() - dbCache.lastUpdated.getTime()
      const CACHE_VALIDITY = 60 * 60 * 1000 // 1 hour

      if (cacheAge < CACHE_VALIDITY) {
        // Update in-memory cache
        inMemoryCache.set(symbol, dbCache.price)
        return { price: dbCache.price, source: dbCache.source }
      }
    }
  } catch (error) {
    console.error('Error reading from database cache:', error)
  }

  return null
}

/**
 * Update price cache (both in-memory and database)
 */
export async function updatePriceCache(symbol: string, price: number, source: string = 'GOOGLE_SCRIPT'): Promise<void> {
  // Update in-memory cache
  inMemoryCache.set(symbol, price)

  // Update database cache
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
    // Don't throw here as in-memory cache is updated
  }
}

/**
 * Get current price for a single symbol with caching
 */
export async function getPrice(symbol: string): Promise<number> {
  // Try to get from cache first
  const cached = await getCachedPrice(symbol)
  if (cached) {
    return cached.price
  }

  // Fetch fresh price
  try {
    const prices = await fetchStockPrices([symbol])
    const formattedSymbol = symbol.startsWith('NSE:') ? symbol : `NSE:${symbol}`
    const price = prices[formattedSymbol]

    if (typeof price !== 'number') {
      throw new Error(`Price not found for symbol ${symbol}`)
    }

    // Update cache
    await updatePriceCache(symbol, price)

    return price
  } catch (error) {
    // If fresh fetch fails, try to get stale cache data
    try {
      const staleCache = await prisma.priceCache.findUnique({
        where: { symbol }
      })

      if (staleCache) {
        console.warn(`Using stale cache data for ${symbol}`)
        return staleCache.price
      }
    } catch (cacheError) {
      console.error('Error reading stale cache:', cacheError)
    }

    throw error
  }
}

/**
 * Batch fetch prices for multiple symbols
 */
export async function batchGetPrices(symbols: string[]): Promise<Array<{ symbol: string; price: number | null; error?: string }>> {
  try {
    const prices = await fetchStockPrices(symbols)

    return symbols.map(symbol => {
      const formattedSymbol = symbol.startsWith('NSE:') ? symbol : `NSE:${symbol}`
      const price = prices[formattedSymbol]

      if (typeof price === 'number') {
        // Update cache for successful fetches
        updatePriceCache(symbol, price).catch(err =>
          console.error(`Failed to cache price for ${symbol}:`, err)
        )

        return { symbol, price }
      } else {
        return {
          symbol,
          price: null,
          error: `Price not available for ${symbol}`
        }
      }
    })
  } catch (error) {
    // If batch fetch fails, return error for all symbols
    return symbols.map(symbol => ({
      symbol,
      price: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }))
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  inMemoryCache.clear()

  try {
    await prisma.priceCache.deleteMany()
  } catch (error) {
    console.error('Error clearing database cache:', error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  memoryCache: { size: number }
  databaseCache: { count: number; oldestEntry?: Date; newestEntry?: Date }
}> {
  const memorySize = inMemoryCache.size()

  try {
    const dbStats = await prisma.priceCache.aggregate({
      _count: true,
      _min: { lastUpdated: true },
      _max: { lastUpdated: true }
    })

    return {
      memoryCache: { size: memorySize },
      databaseCache: {
        count: dbStats._count,
        oldestEntry: dbStats._min.lastUpdated || undefined,
        newestEntry: dbStats._max.lastUpdated || undefined
      }
    }
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return {
      memoryCache: { size: memorySize },
      databaseCache: { count: 0 }
    }
  }
}

/**
 * Fetch mutual fund NAV from AMFI API
 */
export async function fetchMutualFundNAV(schemeCodes?: string[]): Promise<Array<{ schemeCode: string; nav: number; date: string; schemeName: string }>> {
  try {
    // AMFI NAV API endpoint
    const response = await fetch('https://www.amfiindia.com/spages/NAVAll.txt')

    if (!response.ok) {
      throw new Error(`AMFI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.text()
    const lines = data.split('\n')
    const navData: Array<{ schemeCode: string; nav: number; date: string; schemeName: string }> = []

    for (const line of lines) {
      // Skip empty lines, headers, and category headers
      if (!line.trim() ||
        line.includes('Scheme Code') ||
        line.includes('ISIN') ||
        line.includes('Open Ended Schemes') ||
        line.includes('Close Ended Schemes') ||
        line.includes('Interval Fund Schemes') ||
        !line.includes(';')) {
        continue
      }

      // Parse the line - format: SchemeCode;ISIN1;ISIN2;SchemeName;NAV;Date
      const parts = line.split(';')
      if (parts.length >= 6) {
        const schemeCode = parts[0]?.trim()
        const schemeName = parts[3]?.trim()
        const navString = parts[4]?.trim()
        const dateString = parts[5]?.trim()

        // Parse NAV value
        const nav = parseFloat(navString)

        if (schemeCode && schemeName && !isNaN(nav) && nav > 0) {
          // If specific scheme codes are requested, filter for them
          if (!schemeCodes || schemeCodes.includes(schemeCode)) {
            navData.push({
              schemeCode,
              nav,
              date: dateString || new Date().toISOString().split('T')[0],
              schemeName
            })
          }
        }
      }
    }

    console.log(`Fetched ${navData.length} mutual fund NAV records from AMFI`)
    return navData
  } catch (error) {
    console.error('Error fetching mutual fund NAV from AMFI:', error)
    throw new Error('Failed to fetch mutual fund NAV data')
  }
}

/**
 * Get mutual fund NAV for a specific scheme code
 */
export async function getMutualFundNAV(schemeCode: string): Promise<number> {
  // Try to get from cache first
  const cached = await getCachedPrice(schemeCode)
  if (cached) {
    return cached.price
  }

  // Fetch fresh NAV data
  try {
    const navData = await fetchMutualFundNAV([schemeCode])
    const schemeData = navData.find(item => item.schemeCode === schemeCode)

    if (!schemeData) {
      throw new Error(`NAV not found for scheme code ${schemeCode}`)
    }

    // Update cache
    await updatePriceCache(schemeCode, schemeData.nav, 'AMFI')

    return schemeData.nav
  } catch (error) {
    // If fresh fetch fails, try to get stale cache data
    try {
      const staleCache = await prisma.priceCache.findUnique({
        where: { symbol: schemeCode }
      })

      if (staleCache) {
        console.warn(`Using stale cache data for mutual fund ${schemeCode}`)
        return staleCache.price
      }
    } catch (cacheError) {
      console.error('Error reading stale cache:', cacheError)
    }

    throw error
  }
}

/**
 * Batch fetch mutual fund NAVs for multiple scheme codes
 */
export async function batchGetMutualFundNAVs(schemeCodes: string[]): Promise<Array<{ schemeCode: string; nav: number | null; error?: string }>> {
  try {
    const navData = await fetchMutualFundNAV(schemeCodes)

    return schemeCodes.map(schemeCode => {
      const schemeData = navData.find(item => item.schemeCode === schemeCode)

      if (schemeData) {
        // Update cache for successful fetches
        updatePriceCache(schemeCode, schemeData.nav, 'AMFI').catch(err =>
          console.error(`Failed to cache NAV for ${schemeCode}:`, err)
        )

        return { schemeCode, nav: schemeData.nav }
      } else {
        return {
          schemeCode,
          nav: null,
          error: `NAV not available for scheme code ${schemeCode}`
        }
      }
    })
  } catch (error) {
    // If batch fetch fails, return error for all scheme codes
    return schemeCodes.map(schemeCode => ({
      schemeCode,
      nav: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }))
  }
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
 * Enhanced price fetching with history tracking and fallback mechanisms
 */
export async function getPriceWithFallback(symbol: string, forceRefresh: boolean = false): Promise<{
  price: number
  source: string
  cached: boolean
  fallbackUsed: boolean
}> {
  let fallbackUsed = false

  // If not forcing refresh, try cache first
  if (!forceRefresh) {
    const cached = await getCachedPrice(symbol)
    if (cached) {
      return {
        price: cached.price,
        source: cached.source,
        cached: true,
        fallbackUsed: false
      }
    }
  }

  // Try to fetch fresh price with retry mechanism
  try {
    const price = await fetchWithRetry(async () => {
      const prices = await fetchStockPrices([symbol])
      const formattedSymbol = symbol.startsWith('NSE:') ? symbol : `NSE:${symbol}`
      const fetchedPrice = prices[formattedSymbol]

      if (typeof fetchedPrice !== 'number') {
        throw new Error(`Price not found for symbol ${symbol}`)
      }

      return fetchedPrice
    })

    // Update cache and save to history
    await updatePriceCache(symbol, price, 'GOOGLE_SCRIPT')
    await savePriceHistory(symbol, price, 'GOOGLE_SCRIPT')

    return {
      price,
      source: 'GOOGLE_SCRIPT',
      cached: false,
      fallbackUsed: false
    }
  } catch (error) {
    console.warn(`Fresh fetch failed for ${symbol}, trying fallback mechanisms`)
    fallbackUsed = true

    // Fallback 1: Try stale cache (within 24 hours)
    try {
      const staleCache = await prisma.priceCache.findUnique({
        where: { symbol }
      })

      if (staleCache) {
        const cacheAge = Date.now() - staleCache.lastUpdated.getTime()
        if (cacheAge < STALE_CACHE_THRESHOLD) {
          console.warn(`Using stale cache data for ${symbol} (${Math.round(cacheAge / (60 * 60 * 1000))} hours old)`)
          return {
            price: staleCache.price,
            source: `${staleCache.source}_STALE`,
            cached: true,
            fallbackUsed: true
          }
        }
      }
    } catch (cacheError) {
      console.error('Stale cache fallback failed:', cacheError)
    }

    // Fallback 2: Use last known price from history
    try {
      const lastHistory = await prisma.priceHistory.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      })

      if (lastHistory) {
        const historyAge = Date.now() - lastHistory.timestamp.getTime()
        if (historyAge < STALE_CACHE_THRESHOLD) {
          console.warn(`Using historical price for ${symbol} (${Math.round(historyAge / (60 * 60 * 1000))} hours old)`)
          return {
            price: lastHistory.price,
            source: `${lastHistory.source}_HISTORY`,
            cached: true,
            fallbackUsed: true
          }
        }
      }
    } catch (historyError) {
      console.error('History fallback failed:', historyError)
    }

    // If all fallbacks fail, throw the original error
    throw error
  }
}

/**
 * Enhanced mutual fund NAV fetching with fallback mechanisms
 */
export async function getMutualFundNAVWithFallback(schemeCode: string, forceRefresh: boolean = false): Promise<{
  nav: number
  source: string
  cached: boolean
  fallbackUsed: boolean
}> {
  let fallbackUsed = false

  // If not forcing refresh, try cache first
  if (!forceRefresh) {
    const cached = await getCachedPrice(schemeCode)
    if (cached) {
      return {
        nav: cached.price,
        source: cached.source,
        cached: true,
        fallbackUsed: false
      }
    }
  }

  // Try to fetch fresh NAV with retry mechanism
  try {
    const nav = await fetchWithRetry(async () => {
      const navData = await fetchMutualFundNAV([schemeCode])
      const schemeData = navData.find(item => item.schemeCode === schemeCode)

      if (!schemeData) {
        throw new Error(`NAV not found for scheme code ${schemeCode}`)
      }

      return schemeData.nav
    })

    // Update cache and save to history
    await updatePriceCache(schemeCode, nav, 'AMFI')
    await savePriceHistory(schemeCode, nav, 'AMFI')

    return {
      nav,
      source: 'AMFI',
      cached: false,
      fallbackUsed: false
    }
  } catch (error) {
    console.warn(`Fresh NAV fetch failed for ${schemeCode}, trying fallback mechanisms`)
    fallbackUsed = true

    // Fallback 1: Try stale cache
    try {
      const staleCache = await prisma.priceCache.findUnique({
        where: { symbol: schemeCode }
      })

      if (staleCache) {
        const cacheAge = Date.now() - staleCache.lastUpdated.getTime()
        if (cacheAge < STALE_CACHE_THRESHOLD) {
          console.warn(`Using stale cache NAV for ${schemeCode}`)
          return {
            nav: staleCache.price,
            source: `${staleCache.source}_STALE`,
            cached: true,
            fallbackUsed: true
          }
        }
      }
    } catch (cacheError) {
      console.error('Stale cache fallback failed:', cacheError)
    }

    // Fallback 2: Use last known NAV from history
    try {
      const lastHistory = await prisma.priceHistory.findFirst({
        where: { symbol: schemeCode },
        orderBy: { timestamp: 'desc' }
      })

      if (lastHistory) {
        const historyAge = Date.now() - lastHistory.timestamp.getTime()
        if (historyAge < STALE_CACHE_THRESHOLD) {
          console.warn(`Using historical NAV for ${schemeCode}`)
          return {
            nav: lastHistory.price,
            source: `${lastHistory.source}_HISTORY`,
            cached: true,
            fallbackUsed: true
          }
        }
      }
    } catch (historyError) {
      console.error('History fallback failed:', historyError)
    }

    // If all fallbacks fail, throw the original error
    throw error
  }
}

/**
 * Get all unique symbols that have price data
 */
export async function getAllTrackedSymbols(): Promise<string[]> {
  try {
    const symbols = await prisma.priceCache.findMany({
      select: { symbol: true },
      distinct: ['symbol']
    })

    return symbols.map(s => s.symbol)
  } catch (error) {
    console.error('Error fetching tracked symbols:', error)
    return []
  }
}

/**
 * Refresh prices for all tracked symbols
 */
export async function refreshAllPrices(): Promise<{
  success: number
  failed: number
  errors: Array<{ symbol: string; error: string }>
}> {
  const symbols = await getAllTrackedSymbols()
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ symbol: string; error: string }>
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
          if (symbol.match(/^\d+$/)) {
            // Numeric symbols are mutual fund scheme codes
            await getMutualFundNAVWithFallback(symbol, true)
          } else {
            // Non-numeric symbols are stock symbols
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
  return results
}

/**
 * Start automatic price refresh scheduling
 */
export function startPriceRefreshScheduler(intervalMs: number = DEFAULT_REFRESH_INTERVAL): void {
  if (refreshInterval) {
    console.log('Price refresh scheduler already running')
    return
  }

  console.log(`Starting price refresh scheduler with ${intervalMs / 1000 / 60} minute intervals`)

  refreshInterval = setInterval(async () => {
    try {
      console.log('Running scheduled price refresh...')
      const results = await refreshAllPrices()
      console.log(`Scheduled refresh completed: ${results.success} success, ${results.failed} failed`)

      if (results.errors.length > 0) {
        console.warn('Refresh errors:', results.errors.slice(0, 5)) // Log first 5 errors
      }
    } catch (error) {
      console.error('Scheduled price refresh failed:', error)
    }
  }, intervalMs)
}

/**
 * Stop automatic price refresh scheduling
 */
export function stopPriceRefreshScheduler(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
    console.log('Price refresh scheduler stopped')
  }
}

/**
 * Get refresh scheduler status
 */
export function getRefreshSchedulerStatus(): {
  running: boolean
  intervalMs: number | null
} {
  return {
    running: refreshInterval !== null,
    intervalMs: refreshInterval ? DEFAULT_REFRESH_INTERVAL : null
  }
}

/**
 * Manual price refresh for specific symbols
 */
export async function manualPriceRefresh(symbols: string[]): Promise<{
  success: number
  failed: number
  results: Array<{
    symbol: string
    success: boolean
    price?: number
    source?: string
    error?: string
  }>
}> {
  const results = {
    success: 0,
    failed: 0,
    results: [] as Array<{
      symbol: string
      success: boolean
      price?: number
      source?: string
      error?: string
    }>
  }

  for (const symbol of symbols) {
    try {
      let price: number
      let source: string

      // Determine if it's a stock or mutual fund
      if (symbol.match(/^\d+$/)) {
        // Numeric symbols are mutual fund scheme codes
        const result = await getMutualFundNAVWithFallback(symbol, true)
        price = result.nav
        source = result.source
      } else {
        // Non-numeric symbols are stock symbols
        const result = await getPriceWithFallback(symbol, true)
        price = result.price
        source = result.source
      }

      results.success++
      results.results.push({
        symbol,
        success: true,
        price,
        source
      })
    } catch (error) {
      results.failed++
      results.results.push({
        symbol,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
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
 * Get enhanced cache statistics including history data
 */
export async function getEnhancedCacheStats(): Promise<{
  memoryCache: { size: number }
  databaseCache: { count: number; oldestEntry?: Date; newestEntry?: Date }
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

    const schedulerStatus = getRefreshSchedulerStatus()

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
      scheduler: getRefreshSchedulerStatus()
    }
  }
}