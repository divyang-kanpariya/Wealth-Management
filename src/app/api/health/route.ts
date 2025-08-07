import { NextResponse } from 'next/server'
import { serverMonitoring } from '@/lib/server/monitoring'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`
    
    // Get monitoring data
    const health = serverMonitoring.getHealthStatus()
    const errorMetrics = serverMonitoring.getErrorMetrics()
    const performanceMetrics = serverMonitoring.getPerformanceMetrics()

    const response = {
      status: health.status,
      timestamp: new Date().toISOString(),
      database: 'connected',
      issues: health.issues,
      metrics: {
        errors: {
          total: errorMetrics.totalErrors,
          critical: errorMetrics.criticalErrors,
          rate: errorMetrics.averageErrorRate
        },
        performance: {
          averageLoadTime: Math.round(performanceMetrics.averagePageLoadTime),
          cacheHitRate: Math.round(performanceMetrics.cacheHitRate * 100) / 100,
          slowPages: performanceMetrics.slowPages.length
        }
      }
    }

    // Return appropriate HTTP status based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503

    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Health check failed',
      issues: ['Database connectivity issues']
    }, { status: 503 })
  }
}

// Detailed monitoring report (for admin use)
export async function POST() {
  try {
    const report = serverMonitoring.generateReport()
    
    return new Response(report, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  } catch (error) {
    console.error('Failed to generate monitoring report:', error)
    
    return NextResponse.json({
      error: 'Failed to generate monitoring report'
    }, { status: 500 })
  }
}