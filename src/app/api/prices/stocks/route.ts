import { NextRequest, NextResponse } from 'next/server'
import { getPrice, batchGetPrices, getCachedPrice, getPriceWithFallback } from '@/lib/price-fetcher'
import { z } from 'zod'

// Validation schemas
const singleStockSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required')
})

const batchStockSchema = z.object({
  symbols: z.array(z.string().min(1)).min(1, 'At least one symbol is required').max(50, 'Maximum 50 symbols allowed')
})

const stockQuerySchema = z.object({
  symbol: z.string().nullable().optional(),
  symbols: z.string().nullable().optional(), // comma-separated symbols for batch requests
  cached: z.string().nullable().optional().transform(val => val === 'true'), // only return cached data
  enhanced: z.string().nullable().optional().transform(val => val === 'true'), // use enhanced fallback mechanism
  forceRefresh: z.string().nullable().optional().transform(val => val === 'true') // force refresh even if cached
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = stockQuerySchema.parse({
      symbol: searchParams.get('symbol'),
      symbols: searchParams.get('symbols'),
      cached: searchParams.get('cached'),
      enhanced: searchParams.get('enhanced'),
      forceRefresh: searchParams.get('forceRefresh')
    })

    // Handle batch request
    if (query.symbols) {
      const symbolArray = query.symbols.split(',').map(s => s.trim()).filter(Boolean)
      const validation = batchStockSchema.safeParse({ symbols: symbolArray })
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid symbols', details: validation.error.errors },
          { status: 400 }
        )
      }

      if (query.cached) {
        // Return only cached data
        const results = await Promise.all(
          symbolArray.map(async (symbol) => {
            try {
              const cached = await getCachedPrice(symbol)
              return {
                symbol,
                price: cached?.price || null,
                source: cached?.source || null,
                cached: true
              }
            } catch (error) {
              return {
                symbol,
                price: null,
                source: null,
                cached: true,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          })
        )

        return NextResponse.json({ data: results })
      } else {
        // Fetch fresh data with caching using new Google Script API
        const results = await batchGetPrices(symbolArray)
        
        return NextResponse.json({ 
          data: results.map(result => ({
            ...result,
            source: 'GOOGLE_SCRIPT',
            cached: false
          }))
        })
      }
    }

    // Handle single symbol request
    if (query.symbol) {
      const validation = singleStockSchema.safeParse({ symbol: query.symbol })
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid symbol', details: validation.error.errors },
          { status: 400 }
        )
      }

      if (query.cached) {
        // Return only cached data
        const cached = await getCachedPrice(query.symbol)
        
        return NextResponse.json({
          symbol: query.symbol,
          price: cached?.price || null,
          source: cached?.source || null,
          cached: true
        })
      } else if (query.enhanced) {
        // Use enhanced fallback mechanism
        const result = await getPriceWithFallback(query.symbol, query.forceRefresh)
        
        return NextResponse.json({
          symbol: query.symbol,
          price: result.price,
          source: result.source,
          cached: result.cached,
          fallbackUsed: result.fallbackUsed
        })
      } else {
        // Fetch fresh data with caching using new Google Script API
        const price = await getPrice(query.symbol)
        
        return NextResponse.json({
          symbol: query.symbol,
          price,
          source: 'GOOGLE_SCRIPT',
          cached: false
        })
      }
    }

    return NextResponse.json(
      { error: 'Either symbol or symbols parameter is required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Stock price API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch stock price', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// POST endpoint for batch requests with request body
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = batchStockSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { symbols } = validation.data
    const results = await batchGetPrices(symbols)
    
    return NextResponse.json({ 
      data: results.map(result => ({
        ...result,
        source: 'GOOGLE_SCRIPT',
        cached: false
      }))
    })

  } catch (error) {
    console.error('Stock price batch API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch stock prices', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}