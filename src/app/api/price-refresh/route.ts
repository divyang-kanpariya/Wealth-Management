import { NextRequest, NextResponse } from 'next/server'
import { backgroundPriceRefreshService } from '@/lib/background-price-refresh-service'
import { 
  initializePriceRefreshService, 
  shutdownPriceRefreshService,
  getServiceHealthReport 
} from '@/lib/services/price-refresh-service-manager'

/**
 * Background Price Refresh API
 * 
 * Provides endpoints to manage and monitor the background price refresh service
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        const serviceStatus = backgroundPriceRefreshService.getServiceStatus()
        return NextResponse.json({
          success: true,
          data: serviceStatus
        })

      case 'health':
        const healthReport = await getServiceHealthReport()
        return NextResponse.json({
          success: true,
          data: healthReport
        })

      case 'statistics':
        const statistics = await backgroundPriceRefreshService.getRefreshStatistics()
        return NextResponse.json({
          success: true,
          data: statistics
        })

      default:
        // Default: return comprehensive status
        const [status, health, stats] = await Promise.all([
          backgroundPriceRefreshService.getServiceStatus(),
          backgroundPriceRefreshService.healthCheck(),
          backgroundPriceRefreshService.getRefreshStatistics()
        ])

        return NextResponse.json({
          success: true,
          data: {
            status,
            health,
            statistics: stats
          }
        })
    }
  } catch (error) {
    console.error('[PriceRefreshAPI] GET error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, symbols, intervalMs } = body

    switch (action) {
      case 'start':
        await initializePriceRefreshService()
        return NextResponse.json({
          success: true,
          message: 'Background price refresh service started'
        })

      case 'stop':
        shutdownPriceRefreshService()
        return NextResponse.json({
          success: true,
          message: 'Background price refresh service stopped'
        })

      case 'restart':
        shutdownPriceRefreshService()
        await new Promise(resolve => setTimeout(resolve, 1000))
        await backgroundPriceRefreshService.startScheduledRefresh(intervalMs)
        return NextResponse.json({
          success: true,
          message: 'Background price refresh service restarted'
        })

      case 'refresh':
        if (symbols && Array.isArray(symbols)) {
          // Manual refresh for specific symbols
          const result = await backgroundPriceRefreshService.refreshSpecificSymbols(symbols)
          return NextResponse.json({
            success: true,
            data: result,
            message: `Refreshed ${result.success} symbols successfully, ${result.failed} failed`
          })
        } else {
          // Refresh all tracked symbols
          const { getAllTrackedSymbols } = await import('@/lib/price-fetcher')
          const allSymbols = await getAllTrackedSymbols()
          const result = await backgroundPriceRefreshService.batchRefreshPrices(allSymbols)
          return NextResponse.json({
            success: true,
            data: result,
            message: `Refreshed ${result.success} symbols successfully, ${result.failed} failed`
          })
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: start, stop, restart, refresh'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[PriceRefreshAPI] POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { intervalMs } = body

    if (!intervalMs || typeof intervalMs !== 'number' || intervalMs < 60000) {
      return NextResponse.json({
        success: false,
        error: 'Invalid interval. Must be a number >= 60000 (1 minute)'
      }, { status: 400 })
    }

    // Restart service with new interval
    shutdownPriceRefreshService()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await backgroundPriceRefreshService.startScheduledRefresh(intervalMs)

    return NextResponse.json({
      success: true,
      message: `Service restarted with ${intervalMs / 1000 / 60} minute interval`
    })
  } catch (error) {
    console.error('[PriceRefreshAPI] PUT error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}