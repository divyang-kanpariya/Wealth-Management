import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

// Mock PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  })),
}))

describe('Prisma Client Configuration', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    // Clear the module cache to ensure fresh imports
    vi.resetModules()
  })

  afterEach(() => {
    // Clean up global prisma instance
    delete (globalThis as any).prisma
  })

  it('should create a new PrismaClient instance', async () => {
    const { prisma } = await import('../../lib/prisma')
    
    expect(PrismaClient).toHaveBeenCalledWith({
      log: ['query'],
    })
    expect(prisma).toBeDefined()
  })

  it('should reuse existing PrismaClient instance in development', async () => {
    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    // First import
    const { prisma: prisma1 } = await import('../../lib/prisma')
    
    // Clear module cache and import again
    vi.resetModules()
    const { prisma: prisma2 } = await import('../../lib/prisma')

    expect(prisma1).toBe(prisma2)
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv
  })

  it('should create new PrismaClient instance in production', async () => {
    // Set NODE_ENV to production
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    // First import
    await import('../../lib/prisma')
    
    // Clear module cache and import again
    vi.resetModules()
    await import('../../lib/prisma')

    // In production, PrismaClient should be called twice (new instance each time)
    expect(PrismaClient).toHaveBeenCalledTimes(2)
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv
  })

  it('should configure PrismaClient with query logging', async () => {
    await import('../../lib/prisma')
    
    expect(PrismaClient).toHaveBeenCalledWith({
      log: ['query'],
    })
  })

  it('should store PrismaClient instance globally in non-production environment', async () => {
    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const { prisma } = await import('../../lib/prisma')
    
    expect((globalThis as any).prisma).toBe(prisma)
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv
  })

  it('should not store PrismaClient instance globally in production environment', async () => {
    // Set NODE_ENV to production
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    await import('../../lib/prisma')
    
    expect((globalThis as any).prisma).toBeUndefined()
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv
  })
})