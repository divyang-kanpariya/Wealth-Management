/**
 * Enhanced Error Handling and Fallbacks for Pricing
 * 
 * This module provides comprehensive error handling, graceful degradation,
 * and fallback mechanisms for pricing data operations.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Error types for better error categorization
export class PricingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly symbol?: string,
    public readonly originalError?: Error,
    public readonly retryable: boolean = true
  ) {
    super(message)
    this.name = 'PricingError'
  }
}

export class APIRateLimitError extends PricingError {
  constructor(
    message: string,
    public readonly resetTime?: Date,
    symbol?: string
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', symbol, undefined, true)
    this.name = 'APIRateLimitError'
  }
}

export class APITimeoutError extends PricingError {
  constructor(message: string, symbol?: string) {
    super(message, 'API_TIMEOUT', symbol, undefined, true)
    this.name = 'APITimeoutError'
  }
}

export class DataNotFoundError extends PricingError {
  constructor(message: string, symbol?: string) {
    super(message, 'DATA_NOT_FOUND', symbol, undefined, false)
    this.name = 'DataNotFoundError'
  }
}

export class StaleDataError extends PricingError {
  constructor(message: string, symbol?: string, public readonly age: number = 0) {
    super(message, 'STALE_DATA', symbol, undefined, false)
    this.name = 'StaleDataError'
  }
}

// Configuration for error handling and fallbacks
export const ERROR_HANDLING_CONFIG = {
  // Retry configuration
  maxRetries: 3,
  baseRetryDelay: 1000, // 1 second
  maxRetryDelay: 10000, // 10 seconds
  retryMultiplier: 2,
  
  // Timeout configuration
  apiTimeout: 30000, // 30 seconds
  
  // Stale data thresholds
  freshDataThreshold: 60 * 60 * 1000, // 1 hour
  staleDataThreshold: 24 * 60 * 60 * 1000, // 24 hours
  maxStaleDataAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Rate limiting
  rateLimits: {
    GOOGLE_SCRIPT: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      burstLimit: 10
    },
    AMFI: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      burstLimit: 5
    }
  }
} as const

// Rate limiter implementation
class APIRateLimiter {
  private requestCounts = new Map<string, {
    minute: { count: number; resetTime: number }
    hour: { count: number; resetTime: number }
    burst: { count: number; resetTime: number }
  }>()

  async checkRateLimit(apiType: keyof typeof ERROR_HANDLING_CONFIG.rateLimits): Promise<void> {
    const limits = ERROR_HANDLING_CONFIG.rateLimits[apiType]
    const now = Date.now()
    
    let counts = this.requestCounts.get(apiType)
    if (!counts) {
      counts = {
        minute: { count: 0, resetTime: now + 60000 },
        hour: { count: 0, resetTime: now + 3600000 },
        burst: { count: 0, resetTime: now + 10000 }
      }
      this.requestCounts.set(apiType, counts)
    }

    // Reset counters if time windows have passed
    if (now >= counts.minute.resetTime) {
      counts.minute = { count: 0, resetTime: now + 60000 }
    }
    if (now >= counts.hour.resetTime) {
      counts.hour = { count: 0, resetTime: now + 3600000 }
    }
    if (now >= counts.burst.resetTime) {
      counts.burst = { count: 0, resetTime: now + 10000 }
    }

    // Check limits
    if (counts.burst.count >= limits.burstLimit) {
      const waitTime = counts.burst.resetTime - now
      throw new APIRateLimitError(
        `Burst rate limit exceeded for ${apiType}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`,
        new Date(counts.burst.resetTime)
      )
    }

    if (counts.minute.count >= limits.requestsPerMinute) {
      const waitTime = counts.minute.resetTime - now
      throw new APIRateLimitError(
        `Per-minute rate limit exceeded for ${apiType}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`,
        new Date(counts.minute.resetTime)
      )
    }

    if (counts.hour.count >= limits.requestsPerHour) {
      const waitTime = counts.hour.resetTime - now
      throw new APIRateLimitError(
        `Hourly rate limit exceeded for ${apiType}. Try again in ${Math.ceil(waitTime / 60000)} minutes.`,
        new Date(counts.hour.resetTime)
      )
    }

    // Increment counters
    counts.minute.count++
    counts.hour.count++
    counts.burst.count++
  }

  recordRequest(apiType: keyof typeof ERROR_HANDLING_CONFIG.rateLimits): void {
    // Rate limiting is handled in checkRateLimit
    // This method is kept for potential future use
  }

  getRateLimitStatus(apiType: keyof typeof ERROR_HANDLING_CONFIG.rateLimits): {
    minute: { remaining: number; resetTime: Date }
    hour: { remaining: number; resetTime: Date }
    burst: { remaining: number; resetTime: Date }
  } {
    const limits = ERROR_HANDLING_CONFIG.rateLimits[apiType]
    const counts = this.requestCounts.get(apiType)
    
    if (!counts) {
      const now = Date.now()
      return {
        minute: { remaining: limits.requestsPerMinute, resetTime: new Date(now + 60000) },
        hour: { remaining: limits.requestsPerHour, resetTime: new Date(now + 3600000) },
        burst: { remaining: limits.burstLimit, resetTime: new Date(now + 10000) }
      }
    }

    return {
      minute: { 
        remaining: Math.max(0, limits.requestsPerMinute - counts.minute.count),
        resetTime: new Date(counts.minute.resetTime)
      },
      hour: { 
        remaining: Math.max(0, limits.requestsPerHour - counts.hour.count),
        resetTime: new Date(counts.hour.resetTime)
      },
      burst: { 
        remaining: Math.max(0, limits.burstLimit - counts.burst.count),
        resetTime: new Date(counts.burst.resetTime)
      }
    }
  }
}

// Global rate limiter instance
export const rateLimiter = new APIRateLimiter()

// Retry mechanism with exponential backoff
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
    multiplier?: number
    symbol?: string
    operationType?: string
  } = {}
): Promise<T> {
  const {
    maxRetries = ERROR_HANDLING_CONFIG.maxRetries,
    baseDelay = ERROR_HANDLING_CONFIG.baseRetryDelay,
    maxDelay = ERROR_HANDLING_CONFIG.maxRetryDelay,
    multiplier = ERROR_HANDLING_CONFIG.retryMultiplier,
    symbol,
    operationType = 'price fetch'
  } = options

  let lastError: Error | null = null
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      return await operation()
    } catch (error) {
      attempt++
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      // Don't retry for non-retryable errors
      if (error instanceof PricingError && !error.retryable) {
        throw error
      }

      // Don't retry on the last attempt
      if (attempt >= maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(multiplier, attempt - 1), maxDelay)
      
      console.warn(
        `${operationType} attempt ${attempt}/${maxRetries} failed for ${symbol || 'unknown'}: ${lastError.message}. Retrying in ${delay}ms...`
      )

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // All retries exhausted
  throw new PricingError(
    `${operationType} failed after ${maxRetries} attempts${symbol ? ` for ${symbol}` : ''}`,
    'MAX_RETRIES_EXCEEDED',
    symbol,
    lastError || undefined,
    false
  )
}

// Timeout wrapper for API calls
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = ERROR_HANDLING_CONFIG.apiTimeout,
  operationType: string = 'API call'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new APITimeoutError(`${operationType} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    operation()
      .then(result => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

// Stale data fallback handler
export class StaleDataFallbackHandler {
  /**
   * Get cached price with staleness information
   */
  static async getCachedPriceWithAge(symbol: string): Promise<{
    price: number
    source: string
    age: number
    isFresh: boolean
    isStale: boolean
    isExpired: boolean
  } | null> {
    try {
      const cached = await prisma.priceCache.findUnique({
        where: { symbol }
      })

      if (!cached) {
        return null
      }

      const age = Date.now() - cached.lastUpdated.getTime()
      const isFresh = age < ERROR_HANDLING_CONFIG.freshDataThreshold
      const isStale = age >= ERROR_HANDLING_CONFIG.freshDataThreshold && age < ERROR_HANDLING_CONFIG.staleDataThreshold
      const isExpired = age >= ERROR_HANDLING_CONFIG.staleDataThreshold

      return {
        price: cached.price,
        source: cached.source,
        age,
        isFresh,
        isStale,
        isExpired
      }
    } catch (error) {
      console.error('Error checking cached price:', error)
      return null
    }
  }

  /**
   * Get historical average price as ultimate fallback
   */
  static async getHistoricalAveragePrice(symbol: string, days: number = 30): Promise<number | null> {
    try {
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
      
      const historicalPrices = await prisma.priceHistory.findMany({
        where: {
          symbol,
          timestamp: { gte: cutoffDate }
        },
        select: { price: true },
        orderBy: { timestamp: 'desc' },
        take: 100 // Limit to recent 100 entries
      })

      if (!historicalPrices || historicalPrices.length === 0) {
        return null
      }

      const sum = historicalPrices.reduce((acc, entry) => acc + entry.price, 0)
      return sum / historicalPrices.length
    } catch (error) {
      console.error('Error calculating historical average:', error)
      return null
    }
  }

  /**
   * Get price with comprehensive fallback strategy
   */
  static async getPriceWithFallback(symbol: string): Promise<{
    price: number
    source: string
    fallbackLevel: 'none' | 'stale' | 'historical' | 'failed'
    confidence: 'high' | 'medium' | 'low'
    age?: number
    warnings: string[]
  }> {
    const warnings: string[] = []

    // Try cached data first
    const cached = await this.getCachedPriceWithAge(symbol)
    
    if (cached) {
      if (cached.isFresh) {
        return {
          price: cached.price,
          source: cached.source,
          fallbackLevel: 'none',
          confidence: 'high',
          age: cached.age,
          warnings
        }
      }

      if (cached.isStale) {
        warnings.push(`Using stale data (${Math.round(cached.age / (60 * 60 * 1000))} hours old)`)
        return {
          price: cached.price,
          source: `${cached.source}_STALE`,
          fallbackLevel: 'stale',
          confidence: 'medium',
          age: cached.age,
          warnings
        }
      }

      if (cached.isExpired && cached.age < ERROR_HANDLING_CONFIG.maxStaleDataAge) {
        warnings.push(`Using expired data (${Math.round(cached.age / (24 * 60 * 60 * 1000))} days old)`)
        return {
          price: cached.price,
          source: `${cached.source}_EXPIRED`,
          fallbackLevel: 'stale',
          confidence: 'low',
          age: cached.age,
          warnings
        }
      }
    }

    // Try historical average as last resort
    const historicalAverage = await this.getHistoricalAveragePrice(symbol)
    if (historicalAverage) {
      warnings.push('Using historical average price (external APIs unavailable)')
      return {
        price: historicalAverage,
        source: 'HISTORICAL_AVERAGE',
        fallbackLevel: 'historical',
        confidence: 'low',
        warnings
      }
    }

    // No fallback data available
    throw new DataNotFoundError(`No price data available for ${symbol} (fresh, stale, or historical)`, symbol)
  }
}

// User-friendly error message generator
export class UserFriendlyErrorHandler {
  static getErrorMessage(error: Error, symbol?: string): {
    userMessage: string
    technicalMessage: string
    severity: 'low' | 'medium' | 'high'
    actionable: boolean
    suggestedActions: string[]
  } {
    const suggestedActions: string[] = []
    let userMessage = 'Unable to fetch current price data'
    let severity: 'low' | 'medium' | 'high' = 'medium'
    let actionable = true

    if (error instanceof APIRateLimitError) {
      userMessage = 'Price service is temporarily busy. Please try again in a few minutes.'
      severity = 'low'
      suggestedActions.push('Wait a few minutes and try again')
      suggestedActions.push('Use cached data if available')
    } else if (error instanceof APITimeoutError) {
      userMessage = 'Price service is taking longer than usual to respond.'
      severity = 'medium'
      suggestedActions.push('Check your internet connection')
      suggestedActions.push('Try again in a few moments')
    } else if (error instanceof DataNotFoundError) {
      userMessage = symbol 
        ? `Price data not available for ${symbol}`
        : 'Price data not available for the requested symbol'
      severity = 'high'
      actionable = false
      suggestedActions.push('Verify the symbol is correct')
      suggestedActions.push('Check if the security is actively traded')
    } else if (error instanceof StaleDataError) {
      userMessage = 'Showing older price data (current prices temporarily unavailable)'
      severity = 'low'
      suggestedActions.push('Try refreshing manually later')
      suggestedActions.push('Check your internet connection')
    } else if (error instanceof PricingError) {
      switch (error.code) {
        case 'MAX_RETRIES_EXCEEDED':
          userMessage = 'Unable to fetch current prices after multiple attempts'
          severity = 'high'
          suggestedActions.push('Check your internet connection')
          suggestedActions.push('Try again later')
          break
        default:
          userMessage = 'Price service temporarily unavailable'
          suggestedActions.push('Try again in a few minutes')
      }
    } else {
      userMessage = 'Unexpected error while fetching price data'
      severity = 'high'
      suggestedActions.push('Try refreshing the page')
      suggestedActions.push('Contact support if the issue persists')
    }

    return {
      userMessage,
      technicalMessage: error.message,
      severity,
      actionable,
      suggestedActions
    }
  }

  static formatErrorForUI(error: Error, symbol?: string): {
    title: string
    message: string
    type: 'warning' | 'error' | 'info'
    actions: Array<{ label: string; action: string }>
  } {
    const errorInfo = this.getErrorMessage(error, symbol)
    
    let type: 'warning' | 'error' | 'info' = 'error'
    if (errorInfo.severity === 'low') type = 'warning'
    if (error instanceof StaleDataError) type = 'info'

    const actions = errorInfo.suggestedActions.map(action => ({
      label: action,
      action: action.toLowerCase().replace(/\s+/g, '_')
    }))

    return {
      title: error instanceof StaleDataError ? 'Using Cached Data' : 'Price Data Issue',
      message: errorInfo.userMessage,
      type,
      actions
    }
  }
}

// Enhanced price fetching with comprehensive error handling
export async function fetchPriceWithEnhancedErrorHandling(
  symbol: string,
  fetchFunction: () => Promise<number>,
  apiType: keyof typeof ERROR_HANDLING_CONFIG.rateLimits,
  forceRefresh: boolean = false
): Promise<{
  price: number
  source: string
  cached: boolean
  fallbackUsed: boolean
  warnings: string[]
  confidence: 'high' | 'medium' | 'low'
}> {
  const warnings: string[] = []

  try {
    // Check rate limits first
    await rateLimiter.checkRateLimit(apiType)

    // If not forcing refresh, check cached data first
    if (!forceRefresh) {
      const cached = await StaleDataFallbackHandler.getCachedPriceWithAge(symbol)
      if (cached && cached.isFresh) {
        return {
          price: cached.price,
          source: cached.source,
          cached: true,
          fallbackUsed: false,
          warnings: [],
          confidence: 'high'
        }
      }
    }

    // Try fresh fetch with retry and timeout
    const price = await executeWithRetry(
      () => executeWithTimeout(fetchFunction, ERROR_HANDLING_CONFIG.apiTimeout, `${apiType} price fetch`),
      { symbol, operationType: `${apiType} price fetch` }
    )

    return {
      price,
      source: apiType,
      cached: false,
      fallbackUsed: false,
      warnings,
      confidence: 'high'
    }

  } catch (error) {
    console.warn(`Fresh price fetch failed for ${symbol}:`, error)

    // Try fallback strategies
    try {
      const fallbackResult = await StaleDataFallbackHandler.getPriceWithFallback(symbol)
      return {
        price: fallbackResult.price,
        source: fallbackResult.source,
        cached: true,
        fallbackUsed: true,
        warnings: [...warnings, ...fallbackResult.warnings],
        confidence: fallbackResult.confidence
      }
    } catch (fallbackError) {
      // Enhance the error with user-friendly information
      if (error instanceof PricingError) {
        throw error
      }
      
      throw new PricingError(
        `Failed to fetch price for ${symbol}`,
        'FETCH_FAILED',
        symbol,
        error instanceof Error ? error : new Error('Unknown error'),
        true
      )
    }
  }
}

// Batch error handling for multiple symbols
export async function batchFetchWithErrorHandling<T>(
  symbols: string[],
  fetchFunction: (symbol: string) => Promise<T>,
  options: {
    batchSize?: number
    delayBetweenBatches?: number
    continueOnError?: boolean
  } = {}
): Promise<{
  successful: Array<{ symbol: string; result: T }>
  failed: Array<{ symbol: string; error: Error }>
  summary: {
    total: number
    successful: number
    failed: number
    successRate: number
  }
}> {
  const {
    batchSize = 10,
    delayBetweenBatches = 1000,
    continueOnError = true
  } = options

  const successful: Array<{ symbol: string; result: T }> = []
  const failed: Array<{ symbol: string; error: Error }> = []

  // Process symbols in batches
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (symbol) => {
      try {
        const result = await fetchFunction(symbol)
        successful.push({ symbol, result })
      } catch (error) {
        const pricingError = error instanceof PricingError 
          ? error 
          : new PricingError(
              `Batch fetch failed for ${symbol}`,
              'BATCH_FETCH_FAILED',
              symbol,
              error instanceof Error ? error : new Error('Unknown error')
            )
        failed.push({ symbol, error: pricingError })
        
        if (!continueOnError) {
          throw pricingError
        }
      }
    })

    await Promise.all(batchPromises)

    // Delay between batches to avoid overwhelming APIs
    if (i + batchSize < symbols.length && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }

  const summary = {
    total: symbols.length,
    successful: successful.length,
    failed: failed.length,
    successRate: symbols.length > 0 ? (successful.length / symbols.length) * 100 : 0
  }

  return { successful, failed, summary }
}

// Health check for pricing services
export async function checkPricingServiceHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    googleScript: { status: 'up' | 'down'; responseTime?: number; error?: string }
    amfi: { status: 'up' | 'down'; responseTime?: number; error?: string }
    database: { status: 'up' | 'down'; responseTime?: number; error?: string }
  }
  rateLimits: {
    googleScript: ReturnType<APIRateLimiter['getRateLimitStatus']>
    amfi: ReturnType<APIRateLimiter['getRateLimitStatus']>
  }
}> {
  const services: {
    googleScript: { status: 'up' | 'down'; responseTime?: number; error?: string }
    amfi: { status: 'up' | 'down'; responseTime?: number; error?: string }
    database: { status: 'up' | 'down'; responseTime?: number; error?: string }
  } = {
    googleScript: { status: 'down' },
    amfi: { status: 'down' },
    database: { status: 'down' }
  }

  // Test Google Script API
  try {
    const start = Date.now()
    await executeWithTimeout(
      () => fetch('https://script.google.com/macros/s/AKfycbxjV3jJpUVQuO6RE8pnX-kf5rWBe2NxBGqk1EJyByI64Vip1UOj0dlL1XP20ksM8gZl/exec', {
        method: 'HEAD'
      }),
      5000,
      'Google Script health check'
    )
    services.googleScript = { status: 'up', responseTime: Date.now() - start }
  } catch (error) {
    services.googleScript = { 
      status: 'down', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }

  // Test AMFI API
  try {
    const start = Date.now()
    await executeWithTimeout(
      () => fetch('https://www.amfiindia.com/spages/NAVAll.txt', { method: 'HEAD' }),
      5000,
      'AMFI health check'
    )
    services.amfi = { status: 'up', responseTime: Date.now() - start }
  } catch (error) {
    services.amfi = { 
      status: 'down', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }

  // Test database
  try {
    const start = Date.now()
    await prisma.priceCache.count()
    services.database = { status: 'up', responseTime: Date.now() - start }
  } catch (error) {
    services.database = { 
      status: 'down', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }

  // Determine overall status
  const upServices = Object.values(services).filter(s => s.status === 'up').length
  let status: 'healthy' | 'degraded' | 'unhealthy'
  
  if (upServices === 3) {
    status = 'healthy'
  } else if (upServices >= 1) {
    status = 'degraded'
  } else {
    status = 'unhealthy'
  }

  return {
    status,
    services,
    rateLimits: {
      googleScript: rateLimiter.getRateLimitStatus('GOOGLE_SCRIPT'),
      amfi: rateLimiter.getRateLimitStatus('AMFI')
    }
  }
}