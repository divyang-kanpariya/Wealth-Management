import { NextRequest, NextResponse } from 'next/server'
import { checkPricingServiceHealth } from '@/lib/pricing-error-handler'

/**
 * GET /api/pricing/health
 * 
 * Returns the health status of pricing services including:
 * - External API status (Google Script, AMFI)
 * - Database connectivity
 * - Rate limit status
 */
export async function GET(request: NextRequest) {
  try {
    const healthStatus = await checkPricingServiceHealth()
    
    // Set appropriate HTTP status based on service health
    let httpStatus = 200
    if (healthStatus.status === 'degraded') {
      httpStatus = 206 // Partial Content
    } else if (healthStatus.status === 'unhealthy') {
      httpStatus = 503 // Service Unavailable
    }

    return NextResponse.json(healthStatus, { status: httpStatus })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}