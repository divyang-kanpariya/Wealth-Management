import { NextRequest, NextResponse } from 'next/server'
import { getCachedPrice, fetchMutualFundNAV, getMutualFundNAV, batchGetMutualFundNAVs, getMutualFundNAVWithFallback } from '@/lib/price-fetcher'
import { z } from 'zod'

// Validation schemas
const singleMutualFundSchema = z.object({
  schemeCode: z.string().min(1, 'Scheme code is required')
})

const batchMutualFundSchema = z.object({
  schemeCodes: z.array(z.string().min(1)).min(1, 'At least one scheme code is required').max(50, 'Maximum 50 scheme codes allowed')
})

const mutualFundQuerySchema = z.object({
  schemeCode: z.string().nullable().optional(),
  schemeCodes: z.string().nullable().optional(), // comma-separated scheme codes for batch requests
  cached: z.string().nullable().optional().transform(val => val === 'true'), // only return cached data
  all: z.string().nullable().optional().transform(val => val === 'true'), // return all mutual fund data
  enhanced: z.string().nullable().optional().transform(val => val === 'true'), // use enhanced fallback mechanism
  forceRefresh: z.string().nullable().optional().transform(val => val === 'true') // force refresh even if cached
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = mutualFundQuerySchema.parse({
      schemeCode: searchParams.get('schemeCode'),
      schemeCodes: searchParams.get('schemeCodes'),
      cached: searchParams.get('cached'),
      all: searchParams.get('all'),
      enhanced: searchParams.get('enhanced'),
      forceRefresh: searchParams.get('forceRefresh')
    })

    // Handle request for all mutual fund data
    if (query.all) {
      const allNavData = await fetchMutualFundNAV()
      return NextResponse.json({ 
        data: allNavData,
        count: allNavData.length 
      })
    }

    // Handle batch request
    if (query.schemeCodes) {
      const schemeCodeArray = query.schemeCodes.split(',').map(s => s.trim()).filter(Boolean)
      const validation = batchMutualFundSchema.safeParse({ schemeCodes: schemeCodeArray })
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid scheme codes', details: validation.error.errors },
          { status: 400 }
        )
      }

      if (query.cached) {
        // Return only cached data
        const results = await Promise.all(
          schemeCodeArray.map(async (schemeCode) => {
            try {
              const cached = await getCachedPrice(schemeCode)
              return {
                schemeCode,
                nav: cached?.price || null,
                source: cached?.source || null,
                cached: true
              }
            } catch (error) {
              return {
                schemeCode,
                nav: null,
                source: null,
                cached: true,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          })
        )

        return NextResponse.json({ data: results })
      } else {
        // Fetch fresh NAV data
        const results = await batchGetMutualFundNAVs(schemeCodeArray)
        const formattedResults = results.map(result => ({
          schemeCode: result.schemeCode,
          nav: result.nav,
          source: result.nav ? 'AMFI' : null,
          cached: false,
          error: result.error
        }))
        
        return NextResponse.json({ data: formattedResults })
      }
    }

    // Handle single scheme code request
    if (query.schemeCode) {
      const validation = singleMutualFundSchema.safeParse({ schemeCode: query.schemeCode })
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid scheme code', details: validation.error.errors },
          { status: 400 }
        )
      }

      if (query.cached) {
        // Return only cached data
        const cached = await getCachedPrice(query.schemeCode)
        
        return NextResponse.json({
          schemeCode: query.schemeCode,
          nav: cached?.price || null,
          source: cached?.source || null,
          cached: true
        })
      } else if (query.enhanced) {
        // Use enhanced fallback mechanism
        const result = await getMutualFundNAVWithFallback(query.schemeCode, query.forceRefresh)
        
        return NextResponse.json({
          schemeCode: query.schemeCode,
          nav: result.nav,
          source: result.source,
          cached: result.cached,
          fallbackUsed: result.fallbackUsed
        })
      } else {
        // Fetch fresh NAV data
        try {
          const nav = await getMutualFundNAV(query.schemeCode)
          return NextResponse.json({
            schemeCode: query.schemeCode,
            nav,
            source: 'AMFI',
            cached: false
          })
        } catch (error) {
          return NextResponse.json({
            schemeCode: query.schemeCode,
            nav: null,
            source: null,
            cached: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    return NextResponse.json(
      { error: 'Either schemeCode, schemeCodes, or all parameter is required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Mutual fund NAV API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch mutual fund NAV', 
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
    const validation = batchMutualFundSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { schemeCodes } = validation.data
    
    // Fetch fresh NAV data
    const results = await batchGetMutualFundNAVs(schemeCodes)
    const formattedResults = results.map(result => ({
      schemeCode: result.schemeCode,
      nav: result.nav,
      source: result.nav ? 'AMFI' : null,
      cached: false,
      error: result.error
    }))
    
    return NextResponse.json({ data: formattedResults })

  } catch (error) {
    console.error('Mutual fund NAV batch API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch mutual fund NAVs', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}