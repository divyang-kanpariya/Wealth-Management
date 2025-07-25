import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as stocksGET, POST as stocksPOST } from '@/app/api/prices/stocks/route'
import { GET as mutualFundsGET, POST as mutualFundsPOST } from '@/app/api/prices/mutual-funds/route'
import { GET as cacheGET, DELETE as cacheDELETE } from '@/app/api/prices/cache/route'

// Mock the price-fetcher module
vi.mock('@/lib/price-fetcher', () => ({
  getPrice: vi.fn(),
  batchGetPrices: vi.fn(),
  getCachedPrice: vi.fn(),
  fetchMutualFundNAV: vi.fn(),
  getCacheStats: vi.fn(),
  clearAllCaches: vi.fn()
}))

const mockPriceFetcher = await import('@/lib/price-fetcher')

describe('Prices API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Stocks API', () => {
    describe('GET /api/prices/stocks', () => {
      it('should fetch single stock price', async () => {
        ;(mockPriceFetcher.getPrice as any).mockResolvedValueOnce(2500.50)

        const request = new NextRequest('http://localhost/api/prices/stocks?symbol=RELIANCE')
        const response = await stocksGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({
          symbol: 'RELIANCE',
          price: 2500.50,
          source: 'NSE',
          cached: false
        })
        expect(mockPriceFetcher.getPrice).toHaveBeenCalledWith('RELIANCE', 'NSE')
      })

      it('should fetch cached stock price', async () => {
        ;(mockPriceFetcher.getCachedPrice as any).mockResolvedValueOnce({
          price: 2500.50,
          source: 'NSE'
        })

        const request = new NextRequest('http://localhost/api/prices/stocks?symbol=RELIANCE&cached=true')
        const response = await stocksGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({
          symbol: 'RELIANCE',
          price: 2500.50,
          source: 'NSE',
          cached: true
        })
        expect(mockPriceFetcher.getCachedPrice).toHaveBeenCalledWith('RELIANCE')
      })

      it('should fetch batch stock prices', async () => {
        ;(mockPriceFetcher.batchGetPrices as any).mockResolvedValueOnce([
          { symbol: 'RELIANCE', price: 2500.50 },
          { symbol: 'TCS', price: 3200.75 }
        ])

        const request = new NextRequest('http://localhost/api/prices/stocks?symbols=RELIANCE,TCS')
        const response = await stocksGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(2)
        expect(data.data[0]).toEqual({
          symbol: 'RELIANCE',
          price: 2500.50,
          source: 'NSE',
          cached: false
        })
      })

      it('should return error for missing symbol parameter', async () => {
        const request = new NextRequest('http://localhost/api/prices/stocks')
        const response = await stocksGET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Either symbol or symbols parameter is required')
      })

      it('should return error for invalid symbol', async () => {
        const request = new NextRequest('http://localhost/api/prices/stocks?symbol=')
        const response = await stocksGET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid symbol')
      })

      it('should handle price fetching errors', async () => {
        ;(mockPriceFetcher.getPrice as any).mockRejectedValueOnce(new Error('Network error'))

        const request = new NextRequest('http://localhost/api/prices/stocks?symbol=RELIANCE')
        const response = await stocksGET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to fetch stock price')
      })
    })

    describe('POST /api/prices/stocks', () => {
      it('should handle batch stock price requests', async () => {
        ;(mockPriceFetcher.batchGetPrices as any).mockResolvedValueOnce([
          { symbol: 'RELIANCE', price: 2500.50 },
          { symbol: 'TCS', price: 3200.75 }
        ])

        const request = new NextRequest('http://localhost/api/prices/stocks', {
          method: 'POST',
          body: JSON.stringify({ symbols: ['RELIANCE', 'TCS'] }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await stocksPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(2)
        expect(mockPriceFetcher.batchGetPrices).toHaveBeenCalledWith([
          { symbol: 'RELIANCE', source: 'NSE' },
          { symbol: 'TCS', source: 'NSE' }
        ])
      })

      it('should return error for invalid request body', async () => {
        const request = new NextRequest('http://localhost/api/prices/stocks', {
          method: 'POST',
          body: JSON.stringify({ symbols: [] }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await stocksPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request body')
      })

      it('should return error for too many symbols', async () => {
        const symbols = Array.from({ length: 51 }, (_, i) => `STOCK${i}`)
        
        const request = new NextRequest('http://localhost/api/prices/stocks', {
          method: 'POST',
          body: JSON.stringify({ symbols }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await stocksPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request body')
      })
    })
  })

  describe('Mutual Funds API', () => {
    describe('GET /api/prices/mutual-funds', () => {
      it('should fetch single mutual fund NAV', async () => {
        ;(mockPriceFetcher.getPrice as any).mockResolvedValueOnce(150.75)

        const request = new NextRequest('http://localhost/api/prices/mutual-funds?schemeCode=100001')
        const response = await mutualFundsGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({
          schemeCode: '100001',
          nav: 150.75,
          source: 'AMFI',
          cached: false
        })
        expect(mockPriceFetcher.getPrice).toHaveBeenCalledWith('100001', 'AMFI')
      })

      it('should fetch all mutual fund data', async () => {
        const mockNavData = [
          { schemeCode: '100001', schemeName: 'Fund 1', nav: 150.75, date: '01-Jan-2024' },
          { schemeCode: '100002', schemeName: 'Fund 2', nav: 200.50, date: '01-Jan-2024' }
        ]

        ;(mockPriceFetcher.fetchMutualFundNAV as any).mockResolvedValueOnce(mockNavData)

        const request = new NextRequest('http://localhost/api/prices/mutual-funds?all=true')
        const response = await mutualFundsGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toEqual(mockNavData)
        expect(data.count).toBe(2)
      })

      it('should fetch batch mutual fund NAVs', async () => {
        ;(mockPriceFetcher.batchGetPrices as any).mockResolvedValueOnce([
          { symbol: '100001', price: 150.75 },
          { symbol: '100002', price: 200.50 }
        ])

        const request = new NextRequest('http://localhost/api/prices/mutual-funds?schemeCodes=100001,100002')
        const response = await mutualFundsGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(2)
        expect(data.data[0]).toEqual({
          schemeCode: '100001',
          nav: 150.75,
          source: 'AMFI',
          cached: false
        })
      })

      it('should return error for missing parameters', async () => {
        const request = new NextRequest('http://localhost/api/prices/mutual-funds')
        const response = await mutualFundsGET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Either schemeCode, schemeCodes, or all parameter is required')
      })
    })

    describe('POST /api/prices/mutual-funds', () => {
      it('should handle batch mutual fund NAV requests', async () => {
        ;(mockPriceFetcher.batchGetPrices as any).mockResolvedValueOnce([
          { symbol: '100001', price: 150.75 },
          { symbol: '100002', price: 200.50 }
        ])

        const request = new NextRequest('http://localhost/api/prices/mutual-funds', {
          method: 'POST',
          body: JSON.stringify({ schemeCodes: ['100001', '100002'] }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await mutualFundsPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(2)
        expect(mockPriceFetcher.batchGetPrices).toHaveBeenCalledWith([
          { symbol: '100001', source: 'AMFI' },
          { symbol: '100002', source: 'AMFI' }
        ])
      })
    })
  })

  describe('Cache API', () => {
    describe('GET /api/prices/cache', () => {
      it('should return cache statistics', async () => {
        const mockStats = {
          memoryCache: { size: 5 },
          databaseCache: {
            count: 10,
            oldestEntry: new Date('2024-01-01'),
            newestEntry: new Date('2024-01-02')
          }
        }

        ;(mockPriceFetcher.getCacheStats as any).mockResolvedValueOnce(mockStats)

        const response = await cacheGET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual(mockStats)
      })

      it('should handle cache stats errors', async () => {
        ;(mockPriceFetcher.getCacheStats as any).mockRejectedValueOnce(new Error('Database error'))

        const response = await cacheGET()
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to get cache statistics')
      })
    })

    describe('DELETE /api/prices/cache', () => {
      it('should clear all caches', async () => {
        ;(mockPriceFetcher.clearAllCaches as any).mockResolvedValueOnce(undefined)

        const response = await cacheDELETE()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('All caches cleared successfully')
        expect(mockPriceFetcher.clearAllCaches).toHaveBeenCalled()
      })

      it('should handle cache clear errors', async () => {
        ;(mockPriceFetcher.clearAllCaches as any).mockRejectedValueOnce(new Error('Database error'))

        const response = await cacheDELETE()
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to clear caches')
      })
    })
  })
})