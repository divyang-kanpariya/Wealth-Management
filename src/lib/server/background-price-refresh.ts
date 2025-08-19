import { batchGetPrices } from '@/lib/price-fetcher'
import { prisma } from '@/lib/prisma'

/**
 * Background service to automatically refresh price cache every hour
 */
class BackgroundPriceRefresh {
  private refreshInterval: NodeJS.Timeout | null = null
  private readonly REFRESH_INTERVAL = 60 * 60 * 1000 // 1 hour

  start() {
    if (this.refreshInterval) {
      console.log('[BackgroundPriceRefresh] Already running')
      return
    }

    console.log('[BackgroundPriceRefresh] Starting background price refresh service')

    // Run immediately on start
    this.refreshPrices()

    // Then run every hour
    this.refreshInterval = setInterval(() => {
      this.refreshPrices()
    }, this.REFRESH_INTERVAL)
  }

  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
      console.log('[BackgroundPriceRefresh] Stopped background price refresh service')
    }
  }

  private async refreshPrices() {
    try {
      console.log('[BackgroundPriceRefresh] Starting automatic price refresh...')

      // Get all unique symbols from investments and SIPs
      const [allInvestments, allSips] = await Promise.all([
        prisma.investment.findMany({
          select: { symbol: true, type: true }
        }),
        prisma.sIP.findMany({
          select: { symbol: true }
        })
      ])

      // Filter out null symbols
      const investments = allInvestments.filter(inv => inv.symbol !== null)
      const sips = allSips.filter(sip => sip.symbol !== null)

      // Separate stock and mutual fund symbols
      const stockSymbols = investments
        .filter(inv => inv.symbol && ['STOCK', 'CRYPTO'].includes(inv.type))
        .map(inv => inv.symbol!)

      const mutualFundSymbols = [
        ...investments
          .filter(inv => inv.symbol && inv.type === 'MUTUAL_FUND')
          .map(inv => inv.symbol!),
        ...sips
          .filter(sip => sip.symbol)
          .map(sip => sip.symbol!)
      ]

      // Remove duplicates
      const uniqueStockSymbols = [...new Set(stockSymbols)]
      const uniqueMutualFundSymbols = [...new Set(mutualFundSymbols)]

      // Combine all symbols for unified batch processing
      const allSymbols = [...uniqueStockSymbols, ...uniqueMutualFundSymbols]
      
      if (allSymbols.length > 0) {
        console.log(`[BackgroundPriceRefresh] Refreshing ${allSymbols.length} symbols (${uniqueStockSymbols.length} stocks, ${uniqueMutualFundSymbols.length} mutual funds)`)
        
        try {
          const results = await batchGetPrices(allSymbols)
          const successCount = results.filter(r => r.price !== null).length
          console.log(`[BackgroundPriceRefresh] Successfully refreshed ${successCount}/${allSymbols.length} prices`)
        } catch (error) {
          console.error('[BackgroundPriceRefresh] Failed to refresh prices:', error)
        }
      }

      console.log('[BackgroundPriceRefresh] Automatic price refresh completed')

    } catch (error) {
      console.error('[BackgroundPriceRefresh] Error during automatic price refresh:', error)
    }
  }
}

// Export singleton instance
export const backgroundPriceRefresh = new BackgroundPriceRefresh()

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  backgroundPriceRefresh.start()
}