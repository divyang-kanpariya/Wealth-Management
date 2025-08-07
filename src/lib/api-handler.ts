import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
/**
 * Get user-friendly error message
 */
function getErrorMessage(error: any): string {
  if (error?.isTimeout) {
    return 'Request timed out. Please try again.';
  }
  
  if (error?.isNetworkError) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (error?.statusCode) {
    switch (error.statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'Data conflict. This item may already exist.';
      case 422:
        return 'Invalid data provided.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return `Request failed (${error.statusCode}). Please try again.`;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

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
    const fieldErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return NextResponse.json(
      {
        error: 'Please check your input and try again',
        message: 'Some fields contain invalid data',
        details: fieldErrors,
        userFriendly: true,
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors with user-friendly messages
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          {
            error: 'This item already exists',
            message: 'A record with this information already exists in the system',
            userFriendly: true,
          },
          { status: 409 }
        )
      case 'P2025':
        return NextResponse.json(
          {
            error: 'Item not found',
            message: 'The requested item could not be found',
            userFriendly: true,
          },
          { status: 404 }
        )
      case 'P2003':
        return NextResponse.json(
          {
            error: 'Cannot complete operation',
            message: 'This action cannot be completed because it would affect related data',
            userFriendly: true,
          },
          { status: 400 }
        )
      case 'P2014':
        return NextResponse.json(
          {
            error: 'Invalid relationship',
            message: 'The selected item is not valid for this operation',
            userFriendly: true,
          },
          { status: 400 }
        )
      default:
        return NextResponse.json(
          {
            error: 'Database operation failed',
            message: 'There was a problem saving your data. Please try again.',
            code: error.code,
            userFriendly: true,
          },
          { status: 400 }
        )
    }
  }

  // Handle custom API errors
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        userFriendly: true,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        error: error.message,
        userFriendly: true,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      {
        error: error.message,
        userFriendly: true,
      },
      { status: error.statusCode }
    )
  }

  // Handle network errors
  if (error && typeof error === 'object' && 'isNetworkError' in error) {
    return NextResponse.json(
      {
        error: 'Network connection problem',
        message: 'Please check your internet connection and try again',
        userFriendly: true,
      },
      { status: 503 }
    )
  }

  // Handle timeout errors
  if (error && typeof error === 'object' && 'isTimeout' in error) {
    return NextResponse.json(
      {
        error: 'Request timed out',
        message: 'The operation took too long to complete. Please try again.',
        userFriendly: true,
      },
      { status: 408 }
    )
  }

  // Handle generic API errors
  if (error instanceof Error && 'statusCode' in error) {
    const apiError = error as ApiError
    const userFriendlyMessage = getErrorMessage(apiError);

    return NextResponse.json(
      {
        error: userFriendlyMessage,
        message: apiError.message,
        userFriendly: true,
      },
      { status: apiError.statusCode || 500 }
    )
  }

  // Default error response with user-friendly message
  const userFriendlyMessage = error instanceof Error
    ? getErrorMessage(error)
    : 'Something went wrong. Please try again.';

  return NextResponse.json(
    {
      error: userFriendlyMessage,
      message: 'An unexpected error occurred',
      userFriendly: true,
    },
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