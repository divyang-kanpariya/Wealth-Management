import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import {
  handleApiError,
  withErrorHandling,
  parseRequestBody,
  createSuccessResponse,
  createErrorResponse,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../../lib/api-handler'

describe('API Handler Utilities', () => {
  describe('handleApiError', () => {
    it('should handle ZodError', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ])

      const response = handleApiError(zodError)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
      expect(data.details).toEqual([
        {
          field: 'name',
          message: 'Expected string, received number',
        },
      ])
    })

    it('should handle Prisma P2002 error (unique constraint)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        }
      )

      const response = handleApiError(prismaError)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('A record with this data already exists')
    })

    it('should handle Prisma P2025 error (record not found)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        }
      )

      const response = handleApiError(prismaError)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Record not found')
    })

    it('should handle ValidationError', async () => {
      const validationError = new ValidationError('Invalid input', { field: 'name' })

      const response = handleApiError(validationError)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
      expect(data.details).toEqual({ field: 'name' })
    })

    it('should handle NotFoundError', async () => {
      const notFoundError = new NotFoundError('Resource not found')

      const response = handleApiError(notFoundError)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Resource not found')
    })

    it('should handle ConflictError', async () => {
      const conflictError = new ConflictError('Resource conflict')

      const response = handleApiError(conflictError)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Resource conflict')
    })

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong')

      const response = handleApiError(genericError)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('withErrorHandling', () => {
    it('should wrap handler and catch errors', async () => {
      const handler = withErrorHandling(async () => {
        throw new NotFoundError('Test error')
      })

      const response = await handler()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Test error')
    })

    it('should pass through successful responses', async () => {
      const handler = withErrorHandling(async () => {
        return createSuccessResponse({ message: 'Success' })
      })

      const response = await handler()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Success')
    })
  })

  describe('parseRequestBody', () => {
    it('should parse valid JSON', async () => {
      const request = new NextRequest('http://localhost/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const body = await parseRequestBody(request)
      expect(body).toEqual({ name: 'test' })
    })

    it('should throw ValidationError for invalid JSON', async () => {
      const request = new NextRequest('http://localhost/test', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      await expect(parseRequestBody(request)).rejects.toThrow(ValidationError)
    })
  })

  describe('createSuccessResponse', () => {
    it('should create success response with default status', async () => {
      const response = createSuccessResponse({ message: 'Success' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Success')
    })

    it('should create success response with custom status', async () => {
      const response = createSuccessResponse({ id: '123' }, 201)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('123')
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response with default status', async () => {
      const response = createErrorResponse('Something went wrong')
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Something went wrong')
    })

    it('should create error response with custom status', async () => {
      const response = createErrorResponse('Not found', 404)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Not found')
    })
  })

  describe('Custom Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Validation failed', { field: 'name' })

      expect(error.name).toBe('ValidationError')
      expect(error.message).toBe('Validation failed')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'name' })
    })

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('Resource not found')

      expect(error.name).toBe('NotFoundError')
      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
    })

    it('should create NotFoundError with default message', () => {
      const error = new NotFoundError()

      expect(error.message).toBe('Resource not found')
    })

    it('should create ConflictError with correct properties', () => {
      const error = new ConflictError('Resource conflict')

      expect(error.name).toBe('ConflictError')
      expect(error.message).toBe('Resource conflict')
      expect(error.statusCode).toBe(409)
    })
  })
})