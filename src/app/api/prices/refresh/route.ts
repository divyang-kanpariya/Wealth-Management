import { NextRequest, NextResponse } from 'next/server'
import { 
  refreshAllPrices, 
  manualPriceRefresh,
  startPriceRefreshScheduler,
  stopPriceRefreshScheduler,
  getRefreshSchedulerStatus
} from '@/lib/price-fetcher'
import { z } from 'zod'

// Validation schemas
const manualRefreshSchema = z.object({
  symbols: z.array(z.string().min(1)).min(1, 'At least one symbol is required').max(100, 'Maximum 100 symbols allowed')
})

const schedulerConfigSchema = z.object({
  action: z.enum(['start', 'stop', 'status']),
  intervalMinutes: z.number().min(1).max(1440).optional() // 1 minute to 24 hours
})

// GET endpoint for refresh status and scheduler info
export async function GET() {
  try {
    const schedulerStatus = getRefreshSchedulerStatus()
    
    return NextResponse.json({
      scheduler: schedulerStatus,
      message: schedulerStatus.running 
        ? `Scheduler is running with ${schedulerStatus.intervalMs! / 1000 / 60} minute intervals`
        : 'Scheduler is not running'
    })
  } catch (error) {
    console.error('Refresh status API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get refresh status', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// POST endpoint for manual refresh and scheduler control
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is a scheduler control request
    if ('action' in body) {
      const validation = schedulerConfigSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid scheduler request', details: validation.error.errors },
          { status: 400 }
        )
      }

      const { action, intervalMinutes } = validation.data

      switch (action) {
        case 'start':
          const intervalMs = intervalMinutes ? intervalMinutes * 60 * 1000 : undefined
          startPriceRefreshScheduler(intervalMs)
          return NextResponse.json({ 
            message: `Price refresh scheduler started with ${(intervalMs || 15 * 60 * 1000) / 1000 / 60} minute intervals`,
            scheduler: getRefreshSchedulerStatus()
          })

        case 'stop':
          stopPriceRefreshScheduler()
          return NextResponse.json({ 
            message: 'Price refresh scheduler stopped',
            scheduler: getRefreshSchedulerStatus()
          })

        case 'status':
          return NextResponse.json({
            scheduler: getRefreshSchedulerStatus()
          })

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          )
      }
    }

    // Check if this is a manual refresh request
    if ('symbols' in body) {
      const validation = manualRefreshSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid manual refresh request', details: validation.error.errors },
          { status: 400 }
        )
      }

      const { symbols } = validation.data
      const results = await manualPriceRefresh(symbols)
      
      return NextResponse.json({
        message: `Manual refresh completed: ${results.success} success, ${results.failed} failed`,
        ...results
      })
    }

    // If no specific request type, do a full refresh
    const results = await refreshAllPrices()
    
    return NextResponse.json({
      message: `Full price refresh completed: ${results.success} success, ${results.failed} failed`,
      ...results
    })

  } catch (error) {
    console.error('Price refresh API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to process refresh request', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}