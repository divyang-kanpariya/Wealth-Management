import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId')
    const timeRange = searchParams.get('timeRange') || '6M'

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

    if (goalId) {
      whereClause.goalId = goalId
    }

    const goalHistory = await prisma.goalProgressHistory.findMany({
      where: whereClause,
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            targetAmount: true,
            targetDate: true
          }
        }
      },
      orderBy: [
        { goalId: 'asc' },
        { date: 'asc' }
      ]
    })

    // Group by goal if multiple goals
    const groupedHistory = goalHistory.reduce((acc, record) => {
      const goalId = record.goalId
      if (!acc[goalId]) {
        acc[goalId] = {
          goal: record.goal,
          history: []
        }
      }
      
      acc[goalId].history.push({
        date: record.date.toISOString().split('T')[0],
        currentValue: record.currentValue,
        progress: record.progress,
        remainingAmount: record.remainingAmount
      })
      
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      data: groupedHistory,
      timeRange,
      goalId: goalId || 'all'
    })

  } catch (error) {
    console.error('Error fetching goal history:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch goal history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}