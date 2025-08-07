import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateSip } from '@/lib/validations'
import { calculateSipValue } from '@/lib/calculations'
import { SIPWithCurrentValue } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const goalId = searchParams.get('goalId')
    const accountId = searchParams.get('accountId')

    const where: any = {}
    
    if (status && status !== 'ALL') {
      where.status = status
    }
    
    if (goalId && goalId !== 'ALL') {
      where.goalId = goalId
    }
    
    if (accountId && accountId !== 'ALL') {
      where.accountId = accountId
    }

    const sips = await prisma.sIP.findMany({
      where,
      include: {
        goal: true,
        account: true,
        transactions: {
          orderBy: {
            transactionDate: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate current values for each SIP
    const sipsWithValues: SIPWithCurrentValue[] = []
    
    for (const sip of sips) {
      // For now, we'll use the last NAV as current price
      // In a real implementation, you'd fetch current NAV from price API
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

    return NextResponse.json(sipsWithValues)
  } catch (error) {
    console.error('Error fetching SIPs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SIPs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = validateSip(body)

    const sip = await prisma.sIP.create({
      data: {
        name: validatedData.name,
        symbol: validatedData.symbol,
        amount: validatedData.amount,
        frequency: validatedData.frequency,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        goalId: validatedData.goalId,
        accountId: validatedData.accountId,
        notes: validatedData.notes,
      },
      include: {
        goal: true,
        account: true,
        transactions: true
      }
    })

    // Calculate current value for the new SIP
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
    
    const sipWithValue = calculateSipValue(transformedSip, transformedTransactions)

    return NextResponse.json(sipWithValue, { status: 201 })
  } catch (error) {
    console.error('Error creating SIP:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create SIP' },
      { status: 500 }
    )
  }
}