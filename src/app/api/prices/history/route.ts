import { NextRequest, NextResponse } from 'next/server'
import { 
  getPriceHistory, 
  getPriceTrend,
  cleanupPriceHistory,
  getEnhancedCacheStats
} from '@/lib/price-fetcher'
import { z } from 'zod'

// Validation schemas
const historyQuerySchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 100)
})

const trendQuerySchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  days: z.string().optional().transform(val => val ? parseInt(val, 10) : 30)
})

const cleanupSchema = z.object({
  daysToKeep: z.number().min(1).max(3650).default(365) // 1 day to 10 years
})

// GET endpoint for price history and trends
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Handle different actions
    switch (action) {
      case 'history': {
        const query = historyQuerySchema.parse({
          symbol: searchParams.get('symbol'),
          startDate: searchParams.get('startDate'),
          endDate: searchParams.get('endDate'),
          limit: searchParams.get('limit')
        })

        const history = await getPriceHistory(
          query.symbol,
          query.startDate,
          query.endDate,
          query.limit
        )

        return NextResponse.json({
          symbol: query.symbol,
          history,
          count: history.length
        })
      }

      case 'trend': {
        const query = trendQuerySchema.parse({
          symbol: searchParams.get('symbol'),
          days: searchParams.get('days')
        })

        const trend = await getPriceTrend(query.symbol, query.days)

        return NextResponse.json({
          symbol: query.symbol,
          days: query.days,
          ...trend
        })
      }

      case 'stats': {
        const stats = await getEnhancedCacheStats()
        return NextResponse.json(stats)
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: history, trend, or stats' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Price history API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch price history data', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint for cleaning up old history data
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = cleanupSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid cleanup request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { daysToKeep } = validation.data
    const deletedCount = await cleanupPriceHistory(daysToKeep)
    
    return NextResponse.json({
      message: `Cleaned up ${deletedCount} old price history records`,
      deletedCount,
      daysToKeep
    })

  } catch (error) {
    console.error('Price history cleanup API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to cleanup price history', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}