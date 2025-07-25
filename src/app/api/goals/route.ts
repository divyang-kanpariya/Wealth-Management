import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateGoal } from '@/lib/validations'
import { withErrorHandling, parseRequestBody, createSuccessResponse } from '@/lib/api-handler'

export const GET = withErrorHandling(async () => {
  const goals = await prisma.goal.findMany({
    include: {
      investments: true,
    },
    orderBy: {
      targetDate: 'asc',
    },
  })
  
  return createSuccessResponse(goals)
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await parseRequestBody(request)
  const validatedData = validateGoal(body)
  
  const goal = await prisma.goal.create({
    data: validatedData,
    include: {
      investments: true,
    },
  })
  
  return createSuccessResponse(goal, 201)
})