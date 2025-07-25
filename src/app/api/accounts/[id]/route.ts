import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUpdateAccount } from '@/lib/validations'
import { withErrorHandling, parseRequestBody, createSuccessResponse, NotFoundError, ConflictError } from '@/lib/api-handler'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      investments: true,
    },
  })
  
  if (!account) {
    throw new NotFoundError('Account not found')
  }
  
  return createSuccessResponse(account)
})

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const body = await parseRequestBody(request)
  const validatedData = validateUpdateAccount(body)
  
  const updatedAccount = await prisma.account.update({
    where: { id },
    data: validatedData,
    include: {
      investments: true,
    },
  })
  
  return createSuccessResponse(updatedAccount)
})

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  
  // Check if account has investments before deleting
  const investmentCount = await prisma.investment.count({
    where: { accountId: id },
  })
  
  if (investmentCount > 0) {
    throw new ConflictError('Cannot delete account with linked investments')
  }
  
  await prisma.account.delete({
    where: { id },
  })
  
  return new NextResponse(null, { status: 204 })
})