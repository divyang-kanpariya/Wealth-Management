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
  
  // Transform null values to undefined for Prisma and remove undefined fields
  const { goalId, ...restData } = validatedData
  const transformedData = {
    ...restData,
    ...(goalId && goalId !== null ? { goalId } : {})
  }
  
  const investment = await prisma.investment.create({
    data: transformedData as any,
    include: {
      goal: true,
      account: true,
    },
  })
  
  return createSuccessResponse(investment, 201)
})