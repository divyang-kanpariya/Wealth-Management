import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateSipValue, calculateSipSummary } from '@/lib/calculations'
import { SIPWithCurrentValue } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const sips = await prisma.sIP.findMany({
      include: {
        goal: true,
        account: true,
        transactions: {
          orderBy: {
            transactionDate: 'desc'
          }
        }
      }
    })

    // Calculate current values for each SIP
    const sipsWithValues: SIPWithCurrentValue[] = []
    
    for (const sip of sips) {
      // Use the last NAV as current price
      const lastTransaction = sip.transactions[0]
      const currentPrice = lastTransaction?.nav
      
      // Transform the SIP to match our TypeScript types
      const { transactions, ...sipWithoutTransactions } = sip
      const transformedSip = {
        ...sipWithoutTransactions,
        endDate: sip.endDate ?? undefined,
        goalId: sip.goalId ?? undefined,
        notes: sip.notes ?? undefined,
        goal: sip.goal ? {
          ...sip.goal,
          priority: sip.goal.priority ?? undefined,
          description: sip.goal.description ?? undefined,
        } : undefined,
        account: sip.account ? {
          ...sip.account,
          notes: sip.account.notes ?? undefined,
        } : sip.account,
      }
      
      // Transform transactions to match TypeScript types
      const transformedTransactions = sip.transactions.map(txn => ({
        ...txn,
        errorMessage: txn.errorMessage ?? undefined
      }))
      
      const sipWithValue = calculateSipValue(transformedSip, transformedTransactions, currentPrice)
      sipsWithValues.push(sipWithValue)
    }

    // Calculate overall SIP summary
    const summary = calculateSipSummary(sipsWithValues)

    // Additional metrics
    const sipsByStatus = {
      ACTIVE: sipsWithValues.filter(s => s.sip.status === 'ACTIVE').length,
      PAUSED: sipsWithValues.filter(s => s.sip.status === 'PAUSED').length,
      COMPLETED: sipsWithValues.filter(s => s.sip.status === 'COMPLETED').length,
      CANCELLED: sipsWithValues.filter(s => s.sip.status === 'CANCELLED').length,
    }

    const sipsByFrequency = {
      MONTHLY: sipsWithValues.filter(s => s.sip.frequency === 'MONTHLY').length,
      QUARTERLY: sipsWithValues.filter(s => s.sip.frequency === 'QUARTERLY').length,
      YEARLY: sipsWithValues.filter(s => s.sip.frequency === 'YEARLY').length,
    }

    // Top performing SIPs
    const topPerformers = sipsWithValues
      .filter(s => s.totalInvested > 0)
      .sort((a, b) => b.gainLossPercentage - a.gainLossPercentage)
      .slice(0, 5)

    const bottomPerformers = sipsWithValues
      .filter(s => s.totalInvested > 0)
      .sort((a, b) => a.gainLossPercentage - b.gainLossPercentage)
      .slice(0, 5)

    return NextResponse.json({
      summary,
      sipsByStatus,
      sipsByFrequency,
      topPerformers,
      bottomPerformers,
      recentTransactions: await getRecentTransactions(5)
    })

  } catch (error) {
    console.error('Error fetching SIP summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SIP summary' },
      { status: 500 }
    )
  }
}

async function getRecentTransactions(limit: number = 10) {
  return await prisma.sIPTransaction.findMany({
    take: limit,
    orderBy: {
      transactionDate: 'desc'
    },
    include: {
      sip: {
        select: {
          name: true,
          symbol: true
        }
      }
    }
  })
}