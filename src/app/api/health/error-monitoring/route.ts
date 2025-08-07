import { NextRequest, NextResponse } from 'next/server'
import { errorMonitor } from '@/lib/server/error-monitoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get('details') === 'true'
    const includeAlerts = searchParams.get('alerts') === 'true'

    // Perform health check
    const healthCheck = await errorMonitor.performHealthCheck()
    
    const response: any = {
      status: healthCheck.status,
      timestamp: healthCheck.timestamp,
      uptime: healthCheck.uptime,
      checks: healthCheck.checks
    }

    // Include detailed metrics if requested
    if (includeDetails) {
      response.metrics = healthCheck.metrics
      response.memoryUsage = healthCheck.memoryUsage
    }

    // Include system alerts if requested
    if (includeAlerts) {
      response.alerts = errorMonitor.getSystemAlerts()
    }

    // Set appropriate HTTP status based on health
    const httpStatus = healthCheck.status === 'healthy' ? 200
      : healthCheck.status === 'degraded' ? 207
      : 503

    return NextResponse.json(response, { status: httpStatus })
  } catch (error) {
    console.error('[HEALTH API] Error monitoring endpoint failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'reset':
        errorMonitor.reset()
        return NextResponse.json({ 
          success: true, 
          message: 'Monitoring data reset successfully' 
        })

      case 'alerts':
        const alerts = errorMonitor.getSystemAlerts()
        return NextResponse.json({ alerts })

      case 'metrics':
        const metrics = errorMonitor.getErrorMetrics()
        return NextResponse.json({ metrics })

      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          validActions: ['reset', 'alerts', 'metrics']
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[HEALTH API] POST request failed:', error)
    
    return NextResponse.json({
      error: 'Request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}