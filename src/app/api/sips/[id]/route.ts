import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUpdateSip } from '@/lib/validations'
import { calculateSipValue } from '@/lib/calculations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sip = await prisma.sIP.findUnique({
      where: { id },
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

    if (!sip) {
      return NextResponse.json(
        { error: 'SIP not found' },
        { status: 404 }
      )
    }

    // Calculate current value
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

    return NextResponse.json(sipWithValue)
  } catch (error) {
    console.error('Error fetching SIP:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SIP' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = validateUpdateSip(body)

    const existingSip = await prisma.sIP.findUnique({
      where: { id }
    })

    if (!existingSip) {
      return NextResponse.json(
        { error: 'SIP not found' },
        { status: 404 }
      )
    }

    const updatedSip = await prisma.sIP.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.symbol && { symbol: validatedData.symbol }),
        ...(validatedData.amount && { amount: validatedData.amount }),
        ...(validatedData.frequency && { frequency: validatedData.frequency }),
        ...(validatedData.startDate && { startDate: validatedData.startDate }),
        ...(validatedData.endDate !== undefined && { endDate: validatedData.endDate }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.goalId !== undefined && { goalId: validatedData.goalId }),
        ...(validatedData.accountId && { accountId: validatedData.accountId }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
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

    // Calculate current value
    const lastTransaction = updatedSip.transactions[0]
    const currentPrice = lastTransaction?.nav
    
    // Transform the SIP to match our TypeScript types
    const { transactions, ...sipWithoutTransactions } = updatedSip
    const transformedSip = {
      ...sipWithoutTransactions,
      endDate: updatedSip.endDate ?? undefined,
      goalId: updatedSip.goalId ?? undefined,
      notes: updatedSip.notes ?? undefined,
      goal: updatedSip.goal ? {
        ...updatedSip.goal,
        priority: updatedSip.goal.priority ?? undefined,
        description: updatedSip.goal.description ?? undefined,
      } : undefined,
      account: updatedSip.account ? {
        ...updatedSip.account,
        notes: updatedSip.account.notes ?? undefined,
      } : updatedSip.account,
    }
    
    // Transform transactions to match TypeScript types
    const transformedTransactions = updatedSip.transactions.map(txn => ({
      ...txn,
      errorMessage: txn.errorMessage ?? undefined
    }))
    
    const sipWithValue = calculateSipValue(transformedSip, transformedTransactions, currentPrice)

    return NextResponse.json(sipWithValue)
  } catch (error) {
    console.error('Error updating SIP:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update SIP' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existingSip = await prisma.sIP.findUnique({
      where: { id },
      include: {
        transactions: true
      }
    })

    if (!existingSip) {
      return NextResponse.json(
        { error: 'SIP not found' },
        { status: 404 }
      )
    }

    // Delete SIP and all related transactions (cascade delete is configured in schema)
    await prisma.sIP.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'SIP deleted successfully' })
  } catch (error) {
    console.error('Error deleting SIP:', error)
    return NextResponse.json(
      { error: 'Failed to delete SIP' },
      { status: 500 }
    )
  }
}