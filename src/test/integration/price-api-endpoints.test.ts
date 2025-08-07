import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Test configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

describe('Enhanced Price API Endpoints', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.priceHistory.deleteMany()
    await prisma.priceCache.deleteMany()
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.priceHistory.deleteMany()
    await prisma.priceCache.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up before each test
    await prisma.priceHistory.deleteMany()
    await prisma.priceCache.deleteMany()
  })

  describe('Price Refresh API (/api/prices/refresh)', () => {
    it('should get refresh scheduler status', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/refresh`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.scheduler).toBeDefined()
      expect(typeof data.scheduler.running).toBe('boolean')
      expect(data.message).toBeDefined()
    })

    it('should start price refresh scheduler', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          intervalMinutes: 30
        })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.scheduler.running).toBe(true)
      expect(data.message).toContain('started')
    })

    it('should stop price refresh scheduler', async () => {
      // First start it
      await fetch(`${API_BASE_URL}/api/prices/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })

      // Then stop it
      const response = await fetch(`${API_BASE_URL}/api/prices/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.scheduler.running).toBe(false)
      expect(data.message).toContain('stopped')
    })

    it('should perform manual price refresh for specific symbols', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: ['RELIANCE', 'INFY']
        })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBeGreaterThanOrEqual(0)
      expect(data.failed).toBeGreaterThanOrEqual(0)
      expect(data.results).toHaveLength(2)
      expect(data.message).toContain('Manual refresh completed')
    })

    it('should validate manual refresh request', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: [] // Empty array should fail validation
        })
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid manual refresh request')
    })

    it('should validate scheduler configuration', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          intervalMinutes: 0 // Invalid interval
        })
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid scheduler request')
    })

    it('should perform full refresh when no specific request type', async () => {
      // Add some test cache data first
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2500,
          source: 'TEST'
        }
      })

      const response = await fetch(`${API_BASE_URL}/api/prices/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body should trigger full refresh
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.message).toContain('Full price refresh completed')
      expect(data.success).toBeGreaterThanOrEqual(0)
      expect(data.failed).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Price History API (/api/prices/history)', () => {
    beforeEach(async () => {
      // Add test history data
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      await prisma.priceHistory.createMany({
        data: [
          { symbol: 'RELIANCE', price: 2400, source: 'TEST', timestamp: twoDaysAgo },
          { symbol: 'RELIANCE', price: 2450, source: 'TEST', timestamp: yesterday },
          { symbol: 'RELIANCE', price: 2500, source: 'TEST', timestamp: now },
          { symbol: 'INFY', price: 1800, source: 'TEST', timestamp: now }
        ]
      })
    })

    it('should get price history for a symbol', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=history&symbol=RELIANCE`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.symbol).toBe('RELIANCE')
      expect(data.history).toHaveLength(3)
      expect(data.count).toBe(3)
      expect(data.history[0].price).toBe(2500) // Most recent first
    })

    it('should get price history with date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const now = new Date()
      
      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=history&symbol=RELIANCE&startDate=${yesterday.toISOString()}&endDate=${now.toISOString()}`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.history).toHaveLength(2) // Should exclude the entry from 2 days ago
    })

    it('should get price history with limit', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=history&symbol=RELIANCE&limit=2`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.history).toHaveLength(2)
    })

    it('should get price trend for a symbol', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=trend&symbol=RELIANCE&days=7`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.symbol).toBe('RELIANCE')
      expect(data.days).toBe(7)
      expect(data.currentPrice).toBe(2500)
      expect(data.previousPrice).toBe(2400)
      expect(data.change).toBe(100)
      expect(data.trend).toBe('up')
      expect(data.dataPoints).toBe(3)
    })

    it('should get enhanced cache statistics', async () => {
      // Add some cache data
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2500,
          source: 'TEST'
        }
      })

      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=stats`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.databaseCache).toBeDefined()
      expect(data.priceHistory).toBeDefined()
      expect(data.scheduler).toBeDefined()
      expect(data.databaseCache.count).toBe(1)
      expect(data.priceHistory.count).toBe(4) // From beforeEach
      expect(data.priceHistory.uniqueSymbols).toBe(2)
    })

    it('should validate history request parameters', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=history` // Missing symbol
      )
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation error')
    })

    it('should validate trend request parameters', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=trend` // Missing symbol
      )
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation error')
    })

    it('should handle invalid action parameter', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=invalid`
      )
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid action. Use: history, trend, or stats')
    })

    it('should cleanup old price history data', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/history`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysToKeep: 1 // Keep only 1 day, should delete older entries
        })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.message).toContain('Cleaned up')
      expect(data.deletedCount).toBeGreaterThanOrEqual(0)
      expect(data.daysToKeep).toBe(1)
    })

    it('should validate cleanup request', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/history`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysToKeep: 0 // Invalid value
        })
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid cleanup request')
    })
  })

  describe('Enhanced Cache API (/api/prices/cache)', () => {
    beforeEach(async () => {
      // Add test data
      await prisma.priceCache.create({
        data: {
          symbol: 'RELIANCE',
          price: 2500,
          source: 'TEST'
        }
      })

      await prisma.priceHistory.createMany({
        data: [
          { symbol: 'RELIANCE', price: 2500, source: 'TEST', timestamp: new Date() },
          { symbol: 'INFY', price: 1800, source: 'TEST', timestamp: new Date() }
        ]
      })
    })

    it('should get basic cache statistics', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/cache`)
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.databaseCache).toBeDefined()
      expect(data.databaseCache.count).toBe(1)
    })

    it('should get enhanced cache statistics', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/cache?enhanced=true`)
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.databaseCache).toBeDefined()
      expect(data.priceHistory).toBeDefined()
      expect(data.scheduler).toBeDefined()
      expect(data.databaseCache.count).toBe(1)
      expect(data.priceHistory.count).toBe(2)
      expect(data.priceHistory.uniqueSymbols).toBe(2)
    })

    it('should clear all caches', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/cache`, {
        method: 'DELETE'
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.message).toBe('All caches cleared successfully')

      // Verify caches are cleared
      const cacheCount = await prisma.priceCache.count()
      expect(cacheCount).toBe(0)
    })
  })

  describe('Enhanced Stock Prices API (/api/prices/stocks)', () => {
    it('should fetch stock price with enhanced fallback mechanism', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/stocks?symbol=RELIANCE&enhanced=true`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.symbol).toBe('RELIANCE')
      expect(data.price).toBeGreaterThan(0)
      expect(data.source).toBeDefined()
      expect(typeof data.cached).toBe('boolean')
      expect(typeof data.fallbackUsed).toBe('boolean')
    })

    it('should force refresh stock price', async () => {
      // First call to populate cache
      await fetch(`${API_BASE_URL}/api/prices/stocks?symbol=RELIANCE`)
      
      // Second call with force refresh
      const response = await fetch(
        `${API_BASE_URL}/api/prices/stocks?symbol=RELIANCE&enhanced=true&forceRefresh=true`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.cached).toBe(false) // Should not use cache due to force refresh
    })

    it('should handle batch requests with enhanced features', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/stocks?symbols=RELIANCE,INFY&enhanced=true`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.data).toHaveLength(2)
      data.data.forEach((item: any) => {
        expect(item.symbol).toBeDefined()
        expect(typeof item.fallbackUsed).toBe('boolean')
      })
    })
  })

  describe('Enhanced Mutual Funds API (/api/prices/mutual-funds)', () => {
    it('should fetch mutual fund NAV with enhanced fallback mechanism', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/mutual-funds?schemeCode=123456&enhanced=true`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.schemeCode).toBe('123456')
      expect(data.nav).toBeGreaterThan(0)
      expect(data.source).toBeDefined()
      expect(typeof data.cached).toBe('boolean')
      expect(typeof data.fallbackUsed).toBe('boolean')
    })

    it('should force refresh mutual fund NAV', async () => {
      // First call to populate cache
      await fetch(`${API_BASE_URL}/api/prices/mutual-funds?schemeCode=123456`)
      
      // Second call with force refresh
      const response = await fetch(
        `${API_BASE_URL}/api/prices/mutual-funds?schemeCode=123456&enhanced=true&forceRefresh=true`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.cached).toBe(false) // Should not use cache due to force refresh
    })

    it('should handle batch requests with enhanced features', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/mutual-funds?schemeCodes=123456,789012&enhanced=true`
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.data).toHaveLength(2)
      data.data.forEach((item: any) => {
        expect(item.schemeCode).toBeDefined()
        expect(typeof item.fallbackUsed).toBe('boolean')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in POST requests', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })
      
      expect(response.status).toBe(400)
    })

    it('should handle missing required parameters', async () => {
      const response = await fetch(`${API_BASE_URL}/api/prices/history?action=history`)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Validation error')
    })

    it('should handle invalid date formats', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=history&symbol=RELIANCE&startDate=invalid-date`
      )
      
      expect(response.status).toBe(400)
    })

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll just ensure the API doesn't crash with valid requests
      const response = await fetch(
        `${API_BASE_URL}/api/prices/history?action=stats`
      )
      
      expect(response.status).toBeLessThan(500) // Should not be a server error
    })
  })

  describe('Performance and Rate Limiting', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        fetch(`${API_BASE_URL}/api/prices/stocks?symbol=RELIANCE&cached=true`)
      )
      
      const responses = await Promise.all(promises)
      responses.forEach(response => {
        expect(response.ok).toBe(true)
      })
    })

    it('should respect batch size limits', async () => {
      const largeSymbolList = Array.from({ length: 101 }, (_, i) => `STOCK${i}`).join(',')
      
      const response = await fetch(
        `${API_BASE_URL}/api/prices/stocks?symbols=${largeSymbolList}`
      )
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid symbols')
    })
  })
})