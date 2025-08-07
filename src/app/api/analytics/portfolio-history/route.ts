import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '6M'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let dateFilter: any = {}

    if (startDate && endDate) {
      dateFilter = {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    } else {
      // Calculate date range based on timeRange parameter
      const now = new Date()
      let fromDate: Date

      switch (timeRange) {
        case '1M':
          fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          break
        case '3M':
          fromDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
          break
        case '6M':
          fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
          break
        case '1Y':
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          break
        case 'ALL':
          fromDate = new Date(2020, 0, 1) // Start from 2020
          break
        default:
          fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      }

      dateFilter = {
        date: {
          gte: fromDate,
          lte: now
        }
      }
    }

    const portfolioHistory = await prisma.portfolioSnapshot.findMany({
      where: dateFilter,
      orderBy: {
        date: 'asc'
      }
    })

    const formattedHistory = portfolioHistory.map(snapshot => ({
      date: snapshot.date.toISOString().split('T')[0],
      totalValue: snapshot.totalValue,
      totalInvested: snapshot.totalInvested,
      totalGainLoss: snapshot.totalGainLoss,
      totalGainLossPercentage: snapshot.totalGainLossPercentage,
      assetAllocation: snapshot.assetAllocation,
      accountDistribution: snapshot.accountDistribution
    }))

    return NextResponse.json({
      success: true,
      data: formattedHistory,
      timeRange,
      count: formattedHistory.length
    })

  } catch (error) {
    console.error('Error fetching portfolio history:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch portfolio history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}