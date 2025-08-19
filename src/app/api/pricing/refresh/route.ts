import { NextRequest, NextResponse } from 'next/server'
import { manualPriceRefresh } from '@/lib/price-fetcher'
import { UserFriendlyErrorHandler, PricingError } from '@/lib/pricing-error-handler'
import { z } from 'zod'

// Request validation schema
const RefreshRequestSchema = z.object({
  symbols: z.array(z.string()).min(1).max(50), // Limit to 50 symbols per request
  forceRefresh: z.boolean().optional().default(false)
})

/**
 * POST /api/pricing/refresh
 * 
 * Manually refresh prices for specific symbols with enhanced error handling
 * 
 * Request body:
 * {
 *   "symbols": ["RELIANCE", "INFY", "120716"],
 *   "forceRefresh": false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols, forceRefresh } = RefreshRequestSchema.parse(body)

    console.log(`Manual price refresh requested for ${symbols.length} symbols`)

    const startTime = Date.now()
    const result = await manualPriceRefresh(symbols)
    const duration = Date.now() - startTime

    // Enhance the response with user-friendly error messages
    const enhancedResults = result.results.map(item => {
      if (!item.success && item.error) {
        const errorInfo = UserFriendlyErrorHandler.formatErrorForUI(
          new Error(item.error),
          item.symbol
        )
        return {
          ...item,
          userFriendlyError: errorInfo.message,
          errorType: errorInfo.type,
          suggestedActions: errorInfo.actions
        }
      }
      return item
    })

    const response = {
      success: true,
      summary: {
        total: symbols.length,
        successful: result.success,
        failed: result.failed,
        successRate: symbols.length > 0 ? (result.success / symbols.length) * 100 : 0,
        duration
      },
      results: enhancedResults,
      timestamp: new Date().toISOString()
    }

    // Set appropriate HTTP status
    let httpStatus = 200
    if (result.failed > 0 && result.success === 0) {
      httpStatus = 207 // Multi-Status (all failed)
    } else if (result.failed > 0) {
      httpStatus = 206 // Partial Content (some failed)
    }

    return NextResponse.json(response, { status: httpStatus })

  } catch (error) {
    console.error('Manual price refresh failed:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.errors,
          message: 'Please check your request format and try again'
        },
        { status: 400 }
      )
    }

    if (error instanceof PricingError) {
      const errorInfo = UserFriendlyErrorHandler.formatErrorForUI(error)
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: errorInfo.message,
          suggestedActions: errorInfo.actions,
          retryable: error.retryable
        },
        { status: error.retryable ? 503 : 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while refreshing prices',
        retryable: true
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pricing/refresh
 * 
 * Get information about the manual refresh endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/pricing/refresh',
    method: 'POST',
    description: 'Manually refresh prices for specific symbols',
    parameters: {
      symbols: {
        type: 'array',
        description: 'Array of symbols to refresh (stocks or mutual fund scheme codes)',
        required: true,
        maxItems: 50
      },
      forceRefresh: {
        type: 'boolean',
        description: 'Force refresh even if cached data is available',
        required: false,
        default: false
      }
    },
    examples: {
      stocks: {
        symbols: ['RELIANCE', 'INFY', 'TCS'],
        forceRefresh: false
      },
      mutualFunds: {
        symbols: ['120716', '119551', '100032'],
        forceRefresh: true
      },
      mixed: {
        symbols: ['RELIANCE', '120716', 'INFY'],
        forceRefresh: false
      }
    },
    rateLimits: {
      googleScript: 'Up to 100 requests per minute, 10 burst requests',
      amfi: 'Up to 10 requests per minute, 5 burst requests'
    },
    errorHandling: {
      retryLogic: 'Automatic retry with exponential backoff (up to 3 attempts)',
      fallbackData: 'Uses stale cached data when fresh fetch fails',
      rateLimiting: 'Respects API rate limits with appropriate delays',
      timeouts: '30 seconds for Google Script API, 45 seconds for AMFI API'
    }
  })
}