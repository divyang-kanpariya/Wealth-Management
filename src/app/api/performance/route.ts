import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor } from '@/lib/server/performance/monitoring'
import { queryOptimizer } from '@/lib/server/performance/query-optimizer'
import { dashboardCache, chartsCache, listCache, detailCache } from '@/lib/server/performance/cache-manager'
import { PreparatorPerformanceMonitor } from '@/lib/server/performance/optimized-preparators'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const page = searchParams.get('page')
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (type) {
      case 'summary':
        return NextResponse.json({
          performance: performanceMonitor.getPerformanceSummary(),
          cache: {
            dashboard: dashboardCache.getStats(),
            charts: chartsCache.getStats(),
            list: listCache.getStats(),
            detail: detailCache.getStats()
          },
          queries: {
            slow: queryOptimizer.getSlowQueries(1000).slice(0, 10),
            average: queryOptimizer.getAverageQueryTime()
          },
          timestamp: new Date().toISOString()
        })

      case 'pages':
        const pageMetrics = page 
          ? performanceMonitor.getPageMetrics({ pageName: page, limit })
          : performanceMonitor.getPageMetrics({ limit })
        
        return NextResponse.json({
          metrics: pageMetrics,
          count: pageMetrics.length,
          timestamp: new Date().toISOString()
        })

      case 'queries':
        const queryMetrics = queryOptimizer.getQueryMetrics().slice(-limit)
        return NextResponse.json({
          metrics: queryMetrics,
          slow: queryOptimizer.getSlowQueries(),
          averageTime: queryOptimizer.getAverageQueryTime(),
          timestamp: new Date().toISOString()
        })

      case 'cache':
        const cacheType = searchParams.get('cache') as 'dashboard' | 'charts' | 'list' | 'detail'
        let cacheStats
        
        switch (cacheType) {
          case 'dashboard':
            cacheStats = dashboardCache.getStats()
            break
          case 'charts':
            cacheStats = chartsCache.getStats()
            break
          case 'list':
            cacheStats = listCache.getStats()
            break
          case 'detail':
            cacheStats = detailCache.getStats()
            break
          default:
            cacheStats = {
              dashboard: dashboardCache.getStats(),
              charts: chartsCache.getStats(),
              list: listCache.getStats(),
              detail: detailCache.getStats()
            }
        }

        return NextResponse.json({
          cache: cacheStats,
          timestamp: new Date().toISOString()
        })

      case 'system':
        const systemMetrics = performanceMonitor.getSystemMetrics({ limit })
        return NextResponse.json({
          metrics: systemMetrics,
          current: systemMetrics[systemMetrics.length - 1] || null,
          timestamp: new Date().toISOString()
        })

      case 'overall':
        return NextResponse.json({
          stats: PreparatorPerformanceMonitor.getOverallStats(),
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Performance API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'clear-metrics':
        performanceMonitor.clearMetrics()
        queryOptimizer.clearMetrics()
        return NextResponse.json({ success: true, message: 'Metrics cleared' })

      case 'clear-cache':
        dashboardCache.invalidate()
        chartsCache.invalidate()
        listCache.invalidate()
        detailCache.invalidate()
        return NextResponse.json({ success: true, message: 'All caches cleared' })

      case 'cleanup-cache':
        const dashboardCleanup = dashboardCache.cleanup()
        const chartsCleanup = chartsCache.cleanup()
        const listCleanup = listCache.cleanup()
        const detailCleanup = detailCache.cleanup()
        
        return NextResponse.json({ 
          success: true, 
          message: 'Cache cleanup completed',
          removed: {
            dashboard: dashboardCleanup,
            charts: chartsCleanup,
            list: listCleanup,
            detail: detailCleanup
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Performance API POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const key = searchParams.get('key')

    switch (type) {
      case 'cache':
        if (key) {
          dashboardCache.invalidate(key)
          chartsCache.invalidate(key)
          listCache.invalidate(key)
          detailCache.invalidate(key)
          return NextResponse.json({ 
            success: true, 
            message: `Cache entries matching '${key}' cleared` 
          })
        } else {
          return NextResponse.json(
            { error: 'Key parameter required for cache deletion' },
            { status: 400 }
          )
        }

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Performance API DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}