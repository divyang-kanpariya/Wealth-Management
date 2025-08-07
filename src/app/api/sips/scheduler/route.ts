import { NextRequest, NextResponse } from 'next/server'
import { 
  startSIPScheduler,
  stopSIPScheduler,
  getSIPSchedulerStatus,
  updateSIPSchedulerConfig,
  runManualSIPProcessing,
  runManualSIPRetry,
  runManualSIPCleanup
} from '@/lib/sip-scheduler'

/**
 * GET /api/sips/scheduler - Get scheduler status
 */
export async function GET() {
  try {
    const status = getSIPSchedulerStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json(
      { error: 'Failed to get scheduler status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sips/scheduler - Control scheduler operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, config, date } = body
    
    switch (action) {
      case 'start':
        startSIPScheduler(config)
        return NextResponse.json({
          message: 'SIP scheduler started successfully',
          status: getSIPSchedulerStatus()
        })
        
      case 'stop':
        stopSIPScheduler()
        return NextResponse.json({
          message: 'SIP scheduler stopped successfully',
          status: getSIPSchedulerStatus()
        })
        
      case 'restart':
        stopSIPScheduler()
        startSIPScheduler(config)
        return NextResponse.json({
          message: 'SIP scheduler restarted successfully',
          status: getSIPSchedulerStatus()
        })
        
      case 'update-config':
        if (!config) {
          return NextResponse.json(
            { error: 'Configuration is required for update-config action' },
            { status: 400 }
          )
        }
        updateSIPSchedulerConfig(config)
        return NextResponse.json({
          message: 'SIP scheduler configuration updated successfully',
          status: getSIPSchedulerStatus()
        })
        
      case 'manual-process':
        const processResult = await runManualSIPProcessing(date ? new Date(date) : undefined)
        if (!processResult.success) {
          return NextResponse.json(
            { error: processResult.error },
            { status: 500 }
          )
        }
        return NextResponse.json({
          message: 'Manual SIP processing completed successfully',
          result: processResult.result
        })
        
      case 'manual-retry':
        const retryResult = await runManualSIPRetry()
        if (!retryResult.success) {
          return NextResponse.json(
            { error: retryResult.error },
            { status: 500 }
          )
        }
        return NextResponse.json({
          message: 'Manual SIP retry completed successfully',
          result: retryResult.result
        })
        
      case 'manual-cleanup':
        const cleanupResult = await runManualSIPCleanup()
        if (!cleanupResult.success) {
          return NextResponse.json(
            { error: cleanupResult.error },
            { status: 500 }
          )
        }
        return NextResponse.json({
          message: 'Manual SIP cleanup completed successfully',
          result: cleanupResult.result
        })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, restart, update-config, manual-process, manual-retry, or manual-cleanup' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Error in scheduler operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform scheduler operation' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sips/scheduler - Update scheduler configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const config = await request.json()
    
    updateSIPSchedulerConfig(config)
    
    return NextResponse.json({
      message: 'SIP scheduler configuration updated successfully',
      status: getSIPSchedulerStatus()
    })
    
  } catch (error) {
    console.error('Error updating scheduler configuration:', error)
    return NextResponse.json(
      { error: 'Failed to update scheduler configuration' },
      { status: 500 }
    )
  }
}