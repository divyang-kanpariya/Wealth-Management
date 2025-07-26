import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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