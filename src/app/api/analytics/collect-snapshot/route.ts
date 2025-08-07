import { NextRequest, NextResponse } from 'next/server'
import { historicalDataCollector } from '@/lib/historical-data-collector'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, startDate, endDate, symbols } = body

    switch (action) {
      case 'daily':
        await historicalDataCollector.collectDailySnapshots()
        return NextResponse.json({
          success: true,
          message: 'Daily snapshot collected successfully'
        })

      case 'backfill':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: 'Start date and end date are required for backfill' },
            { status: 400 }
          )
        }
        
        await historicalDataCollector.backfillHistoricalData(
          new Date(startDate),
          new Date(endDate)
        )
        
        return NextResponse.json({
          success: true,
          message: `Historical data backfilled from ${startDate} to ${endDate}`
        })

      case 'prices':
        if (!symbols || !Array.isArray(symbols) || !startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: 'Symbols array, start date, and end date are required for price collection' },
            { status: 400 }
          )
        }
        
        await historicalDataCollector.collectHistoricalPrices(
          symbols,
          new Date(startDate),
          new Date(endDate)
        )
        
        return NextResponse.json({
          success: true,
          message: `Historical prices collected for ${symbols.length} symbols`
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: daily, backfill, or prices' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in collect-snapshot API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to collect snapshot',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check the status of historical data
export async function GET(request: NextRequest) {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const [
      portfolioSnapshotCount,
      historicalPriceCount,
      goalHistoryCount,
      investmentHistoryCount,
      latestSnapshot,
      oldestSnapshot
    ] = await Promise.all([
      prisma.portfolioSnapshot.count(),
      prisma.historicalPrice.count(),
      prisma.goalProgressHistory.count(),
      prisma.investmentValueHistory.count(),
      prisma.portfolioSnapshot.findFirst({
        orderBy: { date: 'desc' }
      }),
      prisma.portfolioSnapshot.findFirst({
        orderBy: { date: 'asc' }
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        portfolioSnapshots: portfolioSnapshotCount,
        historicalPrices: historicalPriceCount,
        goalHistory: goalHistoryCount,
        investmentHistory: investmentHistoryCount,
        dateRange: {
          oldest: oldestSnapshot?.date?.toISOString().split('T')[0] || null,
          latest: latestSnapshot?.date?.toISOString().split('T')[0] || null
        }
      }
    })

  } catch (error) {
    console.error('Error getting snapshot status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get snapshot status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}