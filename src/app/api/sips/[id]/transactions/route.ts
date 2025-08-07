import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateSipTransaction } from '@/lib/validations'
import { calculateSipTransactionUnits } from '@/lib/calculations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const transactions = await prisma.sIPTransaction.findMany({
      where: { sipId: id },
      orderBy: {
        transactionDate: 'desc'
      },
      ...(limit && { take: parseInt(limit) }),
      ...(offset && { skip: parseInt(offset) })
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching SIP transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SIP transactions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate SIP exists
    const sip = await prisma.sIP.findUnique({
      where: { id }
    })

    if (!sip) {
      return NextResponse.json(
        { error: 'SIP not found' },
        { status: 404 }
      )
    }

    // If units are not provided, calculate them from amount and NAV
    let transactionData = { ...body, sipId: id }
    
    if (!transactionData.units && transactionData.amount && transactionData.nav) {
      transactionData.units = calculateSipTransactionUnits(
        transactionData.amount, 
        transactionData.nav
      )
    }

    const validatedData = validateSipTransaction(transactionData)

    const transaction = await prisma.sIPTransaction.create({
      data: {
        sipId: validatedData.sipId,
        amount: validatedData.amount,
        nav: validatedData.nav,
        units: validatedData.units,
        transactionDate: validatedData.transactionDate,
        status: validatedData.status,
        errorMessage: validatedData.errorMessage,
      }
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Error creating SIP transaction:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create SIP transaction' },
      { status: 500 }
    )
  }
}