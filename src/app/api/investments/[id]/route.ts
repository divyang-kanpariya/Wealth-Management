import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUpdateInvestment } from '@/lib/validations'
import { withErrorHandling, parseRequestBody, createSuccessResponse, NotFoundError } from '@/lib/api-handler'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  
  const investment = await prisma.investment.findUnique({
    where: { id },
    include: {
      goal: true,
      account: true,
    },
  })
  
  if (!investment) {
    throw new NotFoundError('Investment not found')
  }
  
  return createSuccessResponse(investment)
})

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const body = await parseRequestBody(request)
  const validatedData = validateUpdateInvestment(body)
  
  // Transform null values to undefined for Prisma
  const transformedData = {
    ...validatedData,
    goalId: validatedData.goalId === null ? undefined : validatedData.goalId,
  }
  
  const updatedInvestment = await prisma.investment.update({
    where: { id },
    data: transformedData,
    include: {
      goal: true,
      account: true,
    },
  })
  
  return createSuccessResponse(updatedInvestment)
})

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  
  await prisma.investment.delete({
    where: { id },
  })
  
  return new NextResponse(null, { status: 204 })
})