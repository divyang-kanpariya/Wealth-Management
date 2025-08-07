import { NextRequest, NextResponse } from 'next/server'
import { 
  processSIPBatch, 
  getSIPsDueForProcessing,
  retryFailedSIPTransactions,
  getSIPProcessingStats
} from '@/lib/sip-processor'
import { 
  runManualSIPProcessing,
  runManualSIPRetry,
  getSIPSchedulerStatus
} from '@/lib/sip-scheduler'

/**
 * GET /api/sips/process - Get SIPs due for processing and processing stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const dateParam = searchParams.get('date')
    
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    
    switch (action) {
      case 'due':
        // Get SIPs due for processing
        const sipsDue = await getSIPsDueForProcessing(targetDate)
        return NextResponse.json({
          date: targetDate.toISOString().split('T')[0],
          count: sipsDue.length,
          sips: sipsDue.map(sip => ({
            id: sip.id,
            name: sip.name,
            symbol: sip.symbol,
            amount: sip.amount,
            frequency: sip.frequency,
            accountName: sip.account?.name,
            goalName: sip.goal?.name
          }))
        })
        
      case 'stats':
        // Get processing statistics
        const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
        const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
        
        const stats = await getSIPProcessingStats(startDate, endDate)
        return NextResponse.json(stats)
        
      case 'scheduler':
        // Get scheduler status
        const schedulerStatus = getSIPSchedulerStatus()
        return NextResponse.json(schedulerStatus)
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: due, stats, or scheduler' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Error in SIP process GET:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve SIP processing information' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sips/process - Process SIPs or retry failed transactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, date } = body
    
    switch (action) {
      case 'process':
        // Process SIPs for a specific date
        const targetDate = date ? new Date(date) : new Date()
        const result = await runManualSIPProcessing(targetDate)
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 500 }
          )
        }
        
        return NextResponse.json({
          message: 'SIP processing completed successfully',
          result: result.result
        })
        
      case 'retry':
        // Retry failed transactions
        const retryResult = await runManualSIPRetry()
        
        if (!retryResult.success) {
          return NextResponse.json(
            { error: retryResult.error },
            { status: 500 }
          )
        }
        
        return NextResponse.json({
          message: 'SIP retry completed successfully',
          result: retryResult.result
        })
        
      case 'batch':
        // Process SIPs in batch mode
        const batchDate = date ? new Date(date) : new Date()
        const batchResult = await processSIPBatch(batchDate)
        
        return NextResponse.json({
          message: 'SIP batch processing completed',
          result: batchResult
        })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: process, retry, or batch' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Error in SIP process POST:', error)
    return NextResponse.json(
      { error: 'Failed to process SIP request' },
      { status: 500 }
    )
  }
}