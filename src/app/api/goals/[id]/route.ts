import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUpdateGoal } from '@/lib/validations'
import { withErrorHandling, parseRequestBody, createSuccessResponse, NotFoundError } from '@/lib/api-handler'

export const GET = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params
  
  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      investments: {
        include: {
          account: true,
        },
      },
    },
  })
  
  if (!goal) {
    throw new NotFoundError('Goal not found')
  }
  
  return createSuccessResponse(goal)
})

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params
  const body = await parseRequestBody(request)
  const validatedData = validateUpdateGoal(body)
  
  // Check if goal exists
  const existingGoal = await prisma.goal.findUnique({
    where: { id },
  })
  
  if (!existingGoal) {
    throw new NotFoundError('Goal not found')
  }
  
  const updatedGoal = await prisma.goal.update({
    where: { id },
    data: validatedData,
    include: {
      investments: true,
    },
  })
  
  return createSuccessResponse(updatedGoal)
})

export const DELETE = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params
  
  // Check if goal exists
  const existingGoal = await prisma.goal.findUnique({
    where: { id },
    include: {
      investments: true,
    },
  })
  
  if (!existingGoal) {
    throw new NotFoundError('Goal not found')
  }
  
  // If goal has investments, update them to remove the goal association
  if (existingGoal.investments.length > 0) {
    await prisma.investment.updateMany({
      where: { goalId: id },
      data: { goalId: null },
    })
  }
  
  // Delete the goal
  await prisma.goal.delete({
    where: { id },
  })
  
  return createSuccessResponse({ message: 'Goal deleted successfully' })
})