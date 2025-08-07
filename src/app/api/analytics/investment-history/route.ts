import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const investmentId = searchParams.get('investmentId')
    const timeRange = searchParams.get('timeRange') || '6M'
    const symbol = searchParams.get('symbol')

    // Calculate date range
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
        fromDate = new Date(2020, 0, 1)
        break
      default:
        fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    }

    let whereClause: any = {
      date: {
        gte: fromDate,
        lte: now
      }
    }

    if (investmentId) {
      whereClause.investmentId = investmentId
    }

    const investmentHistory = await prisma.investmentValueHistory.findMany({
      where: whereClause,
      include: {
        investment: {
          select: {
            id: true,
            name: true,
            symbol: true,
            type: true,
            units: true,
            buyPrice: true,
            buyDate: true
          }
        }
      },
      orderBy: [
        { investmentId: 'asc' },
        { date: 'asc' }
      ]
    })

    // If symbol is provided, also get historical prices
    let historicalPrices: any[] = []
    if (symbol) {
      historicalPrices = await prisma.historicalPrice.findMany({
        where: {
          symbol: symbol,
          date: {
            gte: fromDate,
            lte: now
          }
        },
        orderBy: {
          date: 'asc'
        }
      })
    }

    // Group by investment if multiple investments
    const groupedHistory = investmentHistory.reduce((acc, record) => {
      const investmentId = record.investmentId
      if (!acc[investmentId]) {
        acc[investmentId] = {
          investment: record.investment,
          history: []
        }
      }
      
      acc[investmentId].history.push({
        date: record.date.toISOString().split('T')[0],
        price: record.price,
        currentValue: record.currentValue,
        gainLoss: record.gainLoss,
        gainLossPercentage: record.gainLossPercentage
      })
      
      return acc
    }, {} as Record<string, any>)

    const response: any = {
      success: true,
      data: groupedHistory,
      timeRange,
      investmentId: investmentId || 'all'
    }

    if (symbol && historicalPrices.length > 0) {
      response.historicalPrices = historicalPrices.map(price => ({
        date: price.date.toISOString().split('T')[0],
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        volume: price.volume
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching investment history:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch investment history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}