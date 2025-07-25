import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
}

export class ValidationError extends Error {
  statusCode = 400
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  statusCode = 409
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          { error: 'A record with this data already exists' },
          { status: 409 }
        )
      case 'P2025':
        return NextResponse.json(
          { error: 'Record not found' },
          { status: 404 }
        )
      case 'P2003':
        return NextResponse.json(
          { error: 'Foreign key constraint failed' },
          { status: 400 }
        )
      default:
        return NextResponse.json(
          { error: 'Database error', code: error.code },
          { status: 400 }
        )
    }
  }

  // Handle custom API errors
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode }
    )
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  // Handle generic API errors
  if (error instanceof Error && 'statusCode' in error) {
    const apiError = error as ApiError
    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.statusCode || 500 }
    )
  }

  // Default error response
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

export async function parseRequestBody(request: NextRequest) {
  try {
    return await request.json()
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body')
  }
}

export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}