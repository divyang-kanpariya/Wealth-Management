import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateInvestment } from '@/lib/validations'
import { withErrorHandling, parseRequestBody, createSuccessResponse } from '@/lib/api-handler'

export const GET = withErrorHandling(async () => {
  const investments = await prisma.investment.findMany({
    include: {
      goal: true,
      account: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  
  return createSuccessResponse(investments)
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await parseRequestBody(request)
  const validatedData = validateInvestment(body)
  
  const investment = await prisma.investment.create({
    data: validatedData,
    include: {
      goal: true,
      account: true,
    },
  })
  
  return createSuccessResponse(investment, 201)
})