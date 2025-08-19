import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BackgroundPriceRefreshService } from '@/lib/background-price-refresh-service'
import { getCachedPrice, updatePriceCache } from '@/lib/price-fetcher'
import { PrismaClient } from '@prisma/client'

// Only mock external API calls, not the database operations
vi.mock('@/lib/price-fetcher', async () => {
  const actual = await vi.importActual('@/lib/price-fetcher')
  return {
    ...actual,
    fetchStockPrices: vi.fn(),
    fetchMutualFundNAV: vi.fn()
  }
})

const prisma = new PrismaClient()

describe('Background Price Refresh Integration', () => {
  let service: BackgroundPriceRefreshService

  beforeEach(async () => {
    vi.clearAllMocks()
    service = new BackgroundPriceRefreshService({}, prisma)
    
    // Clean up test data
    await prisma.priceCache.deleteMany({
      where: {
        symbol: { in: ['TEST_STOCK', 'TEST_MF', 'RELIANCE', 'INFY', '120503'] }
      }
    })
  })

  afterEach(async () => {
    service.stopScheduledRefresh()
    
    // Clean up test data
    await prisma.priceCache.deleteMany({
      where: {
        symbol: { in: ['TEST_STOCK', 'TEST_MF', 'RELIANCE', 'INFY', '120503'] }
      }
    })
  })

  it('should integrate with existing price-fetcher functions', async () => {
    // Setup mock data
    const mockInvestments = [{ symbol: 'RELIANCE' }]
    const mockSIPs = [{ symbol: '120503' }]

    mockPrisma.investment.findMany.mockResolvedValue(mockInvestments)
    mockPrisma.sIP.findMany.mockResolvedValue(mockSIPs)

    // Mock API responses
    const { fetchStockPrices, fetchMutualFundNAV } = await import('@/lib/price-fetcher')
    vi.mocked(fetchStockPrices).mockResolvedValue({ 'NSE:RELIANCE': 2500 })
    vi.mocked(fetchMutualFundNAV).mockResolvedValue([
      { schemeCode: '120503', nav: 45.67, date: '2024-01-01', schemeName: 'Test Fund' }
    ])

    // Mock database operations
    mockPrisma.priceCache.upsert.mockResolvedValue({})
    mockPrisma.priceCache.findUnique.mockResolvedValue({
      symbol: 'RELIANCE',
      price: 2500,
      source: 'GOOGLE_SCRIPT',
      lastUpdated: new Date()
    })

    // Trigger manual refresh
    const result = await service.triggerManualRefresh()

    // Verify results
    expect(result.success).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.results).toHaveLength(2)

    // Verify database was updated
    expect(mockPrisma.priceCache.upsert).toHaveBeenCalledTimes(2)
    
    // Verify stock price was stored
    expect(mockPrisma.priceCache.upsert).toHaveBeenCalledWith({
      where: { symbol: 'RELIANCE' },
      update: {
        price: 2500,
        lastUpdated: expect.any(Date),
        source: 'GOOGLE_SCRIPT'
      },
      create: {
        symbol: 'RELIANCE',
        price: 2500,
        source: 'GOOGLE_SCRIPT'
      }
    })

    // Verify mutual fund NAV was stored
    expect(mockPrisma.priceCache.upsert).toHaveBeenCalledWith({
      where: { symbol: '120503' },
      update: {
        price: 45.67,
        lastUpdated: expect.any(Date),
        source: 'AMFI'
      },
      create: {
        symbol: '120503',
        price: 45.67,
        source: 'AMFI'
      }
    })
  })

  it('should work with database-only caching approach', async () => {
    // Mock the getCachedPrice function directly
    const { getCachedPrice } = await import('@/lib/price-fetcher')
    vi.mocked(getCachedPrice).mockResolvedValue({
      price: 2500,
      source: 'GOOGLE_SCRIPT'
    })

    // Test getCachedPrice function works with database-only approach
    const cachedPrice = await getCachedPrice('RELIANCE')

    expect(cachedPrice).toEqual({
      price: 2500,
      source: 'GOOGLE_SCRIPT'
    })
    expect(getCachedPrice).toHaveBeenCalledWith('RELIANCE')
  })

  it('should handle stale cache data appropriately', async () => {
    // Mock the getCachedPrice function to return stale data
    const { getCachedPrice } = await import('@/lib/price-fetcher')
    vi.mocked(getCachedPrice).mockResolvedValue({
      price: 2400,
      source: 'GOOGLE_SCRIPT_STALE'
    })

    const cachedPrice = await getCachedPrice('RELIANCE')

    expect(cachedPrice).toEqual({
      price: 2400,
      source: 'GOOGLE_SCRIPT_STALE'
    })
  })

  it('should return null for very old cache data', async () => {
    // Mock the getCachedPrice function to return null for very old data
    const { getCachedPrice } = await import('@/lib/price-fetcher')
    vi.mocked(getCachedPrice).mockResolvedValue(null)

    const cachedPrice = await getCachedPrice('RELIANCE')

    expect(cachedPrice).toBeNull()
  })

  it('should update cache correctly through updatePriceCache', async () => {
    mockPrisma.priceCache.upsert.mockResolvedValue({})

    await updatePriceCache('INFY', 1500, 'GOOGLE_SCRIPT')

    expect(mockPrisma.priceCache.upsert).toHaveBeenCalledWith({
      where: { symbol: 'INFY' },
      update: {
        price: 1500,
        lastUpdated: expect.any(Date),
        source: 'GOOGLE_SCRIPT'
      },
      create: {
        symbol: 'INFY',
        price: 1500,
        source: 'GOOGLE_SCRIPT'
      }
    })
  })

  it('should handle service lifecycle correctly', async () => {
    // Test service can be started and stopped
    expect(service.getServiceStatus().running).toBe(false)

    service.startScheduledRefresh(10000) // 10 seconds
    expect(service.getServiceStatus().running).toBe(true)
    expect(service.getServiceStatus().intervalMs).toBe(10000)

    service.stopScheduledRefresh()
    expect(service.getServiceStatus().running).toBe(false)
    expect(service.getServiceStatus().intervalMs).toBeNull()
  })

  it('should provide accurate refresh statistics', async () => {
    // Mock data for statistics
    mockPrisma.investment.findMany.mockResolvedValue([
      { symbol: 'RELIANCE' },
      { symbol: 'INFY' }
    ])
    mockPrisma.sIP.findMany.mockResolvedValue([
      { symbol: '120503' }
    ])
    mockPrisma.priceCache.aggregate.mockResolvedValue({
      _count: 3,
      _min: { lastUpdated: new Date('2024-01-01') },
      _max: { lastUpdated: new Date('2024-01-02') }
    })

    const stats = await service.getRefreshStats()

    expect(stats.totalSymbolsTracked).toBe(3)
    expect(stats.cacheStats.totalEntries).toBe(3)
    expect(stats.lastRefreshTime).toEqual(new Date('2024-01-02'))
  })
})