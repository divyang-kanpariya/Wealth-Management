import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAccount } from '@/lib/validations'
import { withErrorHandling, parseRequestBody, createSuccessResponse } from '@/lib/api-handler'

export const GET = withErrorHandling(async () => {
  const accounts = await prisma.account.findMany({
    include: {
      investments: true,
    },
    orderBy: {
      name: 'asc',
    },
  })
  
  return createSuccessResponse(accounts)
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await parseRequestBody(request)
  const validatedData = validateAccount(body)
  
  const account = await prisma.account.create({
    data: validatedData,
    include: {
      investments: true,
    },
  })
  
  return createSuccessResponse(account, 201)
})