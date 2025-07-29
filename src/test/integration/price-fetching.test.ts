import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPrice, batchGetPrices, getCachedPrice, updatePriceCache } from '../../lib/price-fetcher';
import { prisma } from '../../lib/prisma';

// Mock fetch
global.fetch = vi.fn();

describe('Price Fetching Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock successful fetch responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('nseindia.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            info: {
              symbol: 'RELIANCE',
              companyName: 'Reliance Industries Limited',
              lastPrice: 2500.50
            }
          })
        });
      } else if (url.includes('amfiindia.com')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(`Scheme Code|ISIN Div Payout|ISIN Div Reinvestment|Scheme Name|Net Asset Value|Date
100001||INF209K01157|Test Fund|150.75|01-Jan-2024`)
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should fetch stock price from NSE API', async () => {
    const price = await getPrice('RELIANCE');
    
    expect(price).toBe(2500.50);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('nseindia.com'),
      expect.any(Object)
    );
  });

  it('should fetch mutual fund NAV from AMFI', async () => {
    const price = await getPrice('100001');
    
    expect(price).toBe(150.75);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('amfiindia.com'),
      expect.any(Object)
    );
  });

  it('should use cached price when available', async () => {
    // First, update the cache
    await updatePriceCache('RELIANCE', 2400, 'NSE');
    
    // Then get the cached price
    const cached = await getCachedPrice('RELIANCE');
    
    expect(cached).not.toBeNull();
    expect(cached?.price).toBe(2400);
    expect(cached?.source).toBe('NSE');
  });

  it('should batch fetch prices for multiple symbols', async () => {
    const requests = ['RELIANCE', 'TCS', '100001'];
    
    const results = await batchGetPrices(requests);
    
    expect(results).toHaveLength(3);
    expect(results[0].symbol).toBe('RELIANCE');
    expect(results[0].price).toBe(2500.50);
    expect(results[2].symbol).toBe('100001');
    expect(results[2].price).toBe(150.75);
  });

  it('should handle API errors gracefully', async () => {
    // Mock a failed API call
    (global.fetch as any).mockImplementationOnce(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
    });
    
    try {
      await getPrice('BADSTOCK');
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('NSE API error');
    }
  });

  it('should use stale cache data when API fails', async () => {
    // First, update the cache
    await updatePriceCache('RELIANCE', 2400, 'NSE');
    
    // Mock a failed API call
    (global.fetch as any).mockImplementationOnce(() => {
      return Promise.reject(new Error('Network error'));
    });
    
    // Should fall back to stale cache
    const price = await getPrice('RELIANCE');
    
    expect(price).toBe(2400);
  });
});