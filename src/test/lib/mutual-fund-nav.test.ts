import { describe, it, expect } from 'vitest'
import { fetchMutualFundNAV, getMutualFundNAV, batchGetMutualFundNAVs } from '@/lib/price-fetcher'

describe('Mutual Fund NAV Fetching', () => {
  it('should fetch all mutual fund NAV data from AMFI', async () => {
    const navData = await fetchMutualFundNAV()
    
    expect(navData).toBeDefined()
    expect(Array.isArray(navData)).toBe(true)
    expect(navData.length).toBeGreaterThan(0)
    
    // Check structure of first record
    if (navData.length > 0) {
      const firstRecord = navData[0]
      expect(firstRecord).toHaveProperty('schemeCode')
      expect(firstRecord).toHaveProperty('nav')
      expect(firstRecord).toHaveProperty('date')
      expect(firstRecord).toHaveProperty('schemeName')
      expect(typeof firstRecord.schemeCode).toBe('string')
      expect(typeof firstRecord.nav).toBe('number')
      expect(typeof firstRecord.schemeName).toBe('string')
      expect(firstRecord.nav).toBeGreaterThan(0)
    }
  }, 30000) // 30 second timeout for API call

  it('should fetch specific scheme codes', async () => {
    // First get some scheme codes
    const allNavData = await fetchMutualFundNAV()
    expect(allNavData.length).toBeGreaterThan(2)
    
    const testSchemeCodes = allNavData.slice(0, 3).map(record => record.schemeCode)
    const specificNavData = await fetchMutualFundNAV(testSchemeCodes)
    
    expect(specificNavData).toBeDefined()
    expect(specificNavData.length).toBe(3)
    
    specificNavData.forEach((record, index) => {
      expect(record.schemeCode).toBe(testSchemeCodes[index])
      expect(record.nav).toBeGreaterThan(0)
    })
  }, 30000)

  it('should get single mutual fund NAV', async () => {
    // First get a scheme code
    const allNavData = await fetchMutualFundNAV()
    expect(allNavData.length).toBeGreaterThan(0)
    
    const testSchemeCode = allNavData[0].schemeCode
    const nav = await getMutualFundNAV(testSchemeCode)
    
    expect(nav).toBeDefined()
    expect(typeof nav).toBe('number')
    expect(nav).toBeGreaterThan(0)
  }, 30000)

  it('should batch get multiple mutual fund NAVs', async () => {
    // First get some scheme codes
    const allNavData = await fetchMutualFundNAV()
    expect(allNavData.length).toBeGreaterThan(2)
    
    const testSchemeCodes = allNavData.slice(0, 3).map(record => record.schemeCode)
    const batchResults = await batchGetMutualFundNAVs(testSchemeCodes)
    
    expect(batchResults).toBeDefined()
    expect(batchResults.length).toBe(3)
    
    batchResults.forEach((result, index) => {
      expect(result.schemeCode).toBe(testSchemeCodes[index])
      expect(result.nav).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()
    })
  }, 30000)

  it('should handle invalid scheme codes gracefully', async () => {
    const invalidSchemeCodes = ['INVALID1', 'INVALID2']
    const batchResults = await batchGetMutualFundNAVs(invalidSchemeCodes)
    
    expect(batchResults).toBeDefined()
    expect(batchResults.length).toBe(2)
    
    batchResults.forEach((result, index) => {
      expect(result.schemeCode).toBe(invalidSchemeCodes[index])
      expect(result.nav).toBeNull()
      expect(result.error).toBeDefined()
    })
  }, 30000)
})