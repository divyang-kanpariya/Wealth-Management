import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateInvestment } from '@/lib/validations'
import { withErrorHandling, parseRequestBody, createSuccessResponse } from '@/lib/api-handler'
import { investmentPagination, extractPaginationParams } from '@/lib/pagination'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const paginationParams = extractPaginationParams(searchParams)
  
  const {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    search,
    filters,
  } = investmentPagination.parseParams(paginationParams)

  // Validate and sanitize sort field
  const validSortBy = investmentPagination.validateSortField(sortBy)
  
  // Build where clause
  const where = investmentPagination.getInvestmentWhere(search, filters)
  
  // Build order by clause
  const orderBy = investmentPagination.getPrismaOrderBy(validSortBy, sortOrder)

  // Get total count for pagination
  const total = await prisma.investment.count({ where })

  // Get paginated data
  const investments = await prisma.investment.findMany({
    where,
    include: {
      goal: true,
      account: true,
    },
    orderBy,
    skip,
    take: limit,
  })

  // Create paginated response
  const response = investmentPagination.createResponse(investments, total, {
    page,
    limit,
    sortBy: validSortBy,
    sortOrder,
    filters,
  })
  
  return createSuccessResponse(response)
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
  
  // No cache invalidation needed - user data is always fetched fresh
  
  return createSuccessResponse(investment, 201)
})