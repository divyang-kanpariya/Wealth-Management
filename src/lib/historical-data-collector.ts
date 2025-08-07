import { PrismaClient } from '@prisma/client'
import { calculatePortfolioSummary, calculateInvestmentsWithPrices } from './calculations'

const prisma = new PrismaClient()

export interface HistoricalDataCollector {
  collectDailySnapshots(): Promise<void>
  backfillHistoricalData(startDate: Date, endDate: Date): Promise<void>
  collectHistoricalPrices(symbols: string[], startDate: Date, endDate: Date): Promise<void>
}

export class HistoricalDataCollectorService implements HistoricalDataCollector {
  
  /**
   * Collect daily portfolio snapshots - should be run daily via cron job
   */
  async collectDailySnapshots(): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      // Check if snapshot already exists for today
      const existingSnapshot = await prisma.portfolioSnapshot.findUnique({
        where: { date: today }
      })

      if (existingSnapshot) {
        console.log(`Portfolio snapshot already exists for ${today.toISOString().split('T')[0]}`)
        return
      }

      // Get all investments with current values
      const investmentsRaw = await prisma.investment.findMany({
        include: {
          account: true,
          goal: true
        }
      })

      if (investmentsRaw.length === 0) {
        console.log('No investments found, skipping snapshot')
        return
      }

      // Convert Prisma result to Investment type
      const investments = investmentsRaw.map(inv => ({
        id: inv.id,
        type: inv.type,
        name: inv.name,
        symbol: inv.symbol || undefined,
        units: inv.units || undefined,
        buyPrice: inv.buyPrice || undefined,
        quantity: inv.quantity || undefined,
        totalValue: inv.totalValue || undefined,
        buyDate: inv.buyDate,
        goalId: inv.goalId || undefined,
        accountId: inv.accountId,
        notes: inv.notes || undefined,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        account: inv.account ? {
          ...inv.account,
          notes: inv.account.notes || undefined
        } : undefined,
        goal: inv.goal ? {
          ...inv.goal,
          priority: inv.goal.priority || undefined,
          description: inv.goal.description || undefined
        } : undefined
      }))

      // Get current prices for all investments
      const priceData = new Map<string, number>()
      for (const investment of investments) {
        if (investment.symbol) {
          const price = await this.getCurrentPrice(investment.symbol)
          if (price) {
            priceData.set(investment.symbol, price)
          }
        }
      }

      // Calculate portfolio summary for today
      const investmentsWithValues = calculateInvestmentsWithPrices(investments, priceData)
      const portfolioSummary = calculatePortfolioSummary(investmentsWithValues)

      // Create portfolio snapshot
      await prisma.portfolioSnapshot.create({
        data: {
          date: today,
          totalValue: portfolioSummary.totalValue,
          totalInvested: portfolioSummary.totalInvested,
          totalGainLoss: portfolioSummary.totalGainLoss,
          totalGainLossPercentage: portfolioSummary.totalGainLossPercentage,
          assetAllocation: portfolioSummary.assetAllocation,
          accountDistribution: portfolioSummary.accountDistribution
        }
      })

      // Create individual investment value history
      for (const investment of investments) {
        const currentPrice = await this.getCurrentPrice(investment.symbol)
        if (currentPrice) {
          const currentValue = investment.units 
            ? investment.units * currentPrice 
            : investment.totalValue || 0
          
          const investedAmount = investment.units && investment.buyPrice
            ? investment.units * investment.buyPrice
            : investment.totalValue || 0

          const gainLoss = currentValue - investedAmount
          const gainLossPercentage = investedAmount > 0 ? (gainLoss / investedAmount) * 100 : 0

          await prisma.investmentValueHistory.create({
            data: {
              investmentId: investment.id,
              date: today,
              price: currentPrice,
              currentValue,
              gainLoss,
              gainLossPercentage
            }
          })
        }
      }

      // Create goal progress history
      const goals = await prisma.goal.findMany({
        include: {
          investments: true
        }
      })

      for (const goal of goals) {
        let currentValue = 0
        for (const inv of goal.investments) {
          if (inv.units && inv.symbol) {
            const currentPrice = await this.getCurrentPrice(inv.symbol)
            const invCurrentValue = inv.units * (currentPrice || Number(inv.buyPrice) || 0)
            currentValue += invCurrentValue
          } else {
            currentValue += Number(inv.totalValue) || 0
          }
        }

        const progress = goal.targetAmount > 0 ? (currentValue / goal.targetAmount) * 100 : 0
        const remainingAmount = Math.max(0, goal.targetAmount - currentValue)

        await prisma.goalProgressHistory.create({
          data: {
            goalId: goal.id,
            date: today,
            currentValue,
            progress,
            remainingAmount
          }
        })
      }

      console.log(`Successfully created portfolio snapshot for ${today.toISOString().split('T')[0]}`)
    } catch (error) {
      console.error('Error collecting daily snapshots:', error)
      throw error
    }
  }

  /**
   * Backfill historical data for a date range
   */
  async backfillHistoricalData(startDate: Date, endDate: Date): Promise<void> {
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      // Skip weekends for stock market data
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        try {
          await this.collectSnapshotForDate(currentDate)
          console.log(`Backfilled data for ${currentDate.toISOString().split('T')[0]}`)
        } catch (error) {
          console.error(`Error backfilling data for ${currentDate.toISOString().split('T')[0]}:`, error)
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  /**
   * Collect historical prices from external APIs
   */
  async collectHistoricalPrices(symbols: string[], startDate: Date, endDate: Date): Promise<void> {
    for (const symbol of symbols) {
      try {
        const historicalData = await this.fetchHistoricalPricesFromAPI(symbol, startDate, endDate)
        
        for (const dayData of historicalData) {
          await prisma.historicalPrice.upsert({
            where: {
              symbol_date: {
                symbol: symbol,
                date: dayData.date
              }
            },
            update: {
              open: dayData.open,
              high: dayData.high,
              low: dayData.low,
              close: dayData.close,
              volume: dayData.volume,
              source: dayData.source
            },
            create: {
              symbol: symbol,
              date: dayData.date,
              open: dayData.open,
              high: dayData.high,
              low: dayData.low,
              close: dayData.close,
              volume: dayData.volume,
              source: dayData.source
            }
          })
        }
        
        console.log(`Collected historical prices for ${symbol}`)
      } catch (error) {
        console.error(`Error collecting historical prices for ${symbol}:`, error)
      }
    }
  }

  /**
   * Private helper methods
   */
  private async collectSnapshotForDate(date: Date): Promise<void> {
    // Similar to collectDailySnapshots but for a specific historical date
    // This would use historical prices instead of current prices
    const investments = await prisma.investment.findMany({
      where: {
        buyDate: {
          lte: date
        }
      },
      include: {
        account: true,
        goal: true
      }
    })

    if (investments.length === 0) return

    let totalValue = 0
    let totalInvested = 0

    for (const investment of investments) {
      const historicalPrice = await this.getHistoricalPrice(investment.symbol || undefined, date)
      const currentValue = investment.units && historicalPrice
        ? investment.units * historicalPrice
        : investment.totalValue || 0
      
      const investedAmount = investment.units && investment.buyPrice
        ? investment.units * investment.buyPrice
        : investment.totalValue || 0

      totalValue += currentValue
      totalInvested += investedAmount
    }

    const totalGainLoss = totalValue - totalInvested
    const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0

    // Calculate asset allocation for this date
    const assetAllocation = await this.calculateAssetAllocationForDate(investments, date)
    const accountDistribution = await this.calculateAccountDistributionForDate(investments, date)

    await prisma.portfolioSnapshot.upsert({
      where: { date },
      update: {
        totalValue,
        totalInvested,
        totalGainLoss,
        totalGainLossPercentage,
        assetAllocation,
        accountDistribution
      },
      create: {
        date,
        totalValue,
        totalInvested,
        totalGainLoss,
        totalGainLossPercentage,
        assetAllocation,
        accountDistribution
      }
    })
  }

  private async getCurrentPrice(symbol?: string): Promise<number | null> {
    if (!symbol) return null
    
    try {
      const priceCache = await prisma.priceCache.findFirst({
        where: { symbol }
      })
      return priceCache ? Number(priceCache.price) : null
    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error)
      return null
    }
  }

  private async getHistoricalPrice(symbol: string | undefined, date: Date): Promise<number | null> {
    if (!symbol) return null
    
    try {
      const historicalPrice = await prisma.historicalPrice.findFirst({
        where: {
          symbol,
          date
        }
      })
      return historicalPrice?.close || null
    } catch (error) {
      console.error(`Error getting historical price for ${symbol} on ${date}:`, error)
      return null
    }
  }

  private async fetchHistoricalPricesFromAPI(symbol: string, startDate: Date, endDate: Date): Promise<any[]> {
    // This would integrate with real APIs like Alpha Vantage, Yahoo Finance, etc.
    // For now, return mock data structure
    const mockData = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Generate realistic mock data based on symbol
        const basePrice = this.getBasePriceForSymbol(symbol)
        const variation = (Math.random() - 0.5) * 0.1 // ±5% daily variation
        const close = basePrice * (1 + variation)
        
        mockData.push({
          date: new Date(currentDate),
          open: close * 0.99,
          high: close * 1.02,
          low: close * 0.98,
          close: close,
          volume: Math.floor(Math.random() * 1000000),
          source: 'MOCK_API'
        })
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return mockData
  }

  private getBasePriceForSymbol(symbol: string): number {
    // Mock base prices for common symbols
    const basePrices: Record<string, number> = {
      'RELIANCE': 2500,
      'TCS': 3200,
      'INFY': 1400,
      'HDFCBANK': 1600,
      'ICICIBANK': 900,
      'SBIN': 500,
      'ITC': 400,
      'HINDUNILVR': 2400,
      'BAJFINANCE': 6500,
      'KOTAKBANK': 1800
    }
    
    return basePrices[symbol] || 1000 // Default price
  }

  private async calculateAssetAllocationForDate(investments: any[], date: Date): Promise<any> {
    const allocation: Record<string, { value: number; percentage: number }> = {}
    let totalValue = 0

    for (const investment of investments) {
      const price = await this.getHistoricalPrice(investment.symbol || undefined, date)
      const value = investment.units && price
        ? investment.units * price
        : investment.totalValue || 0
      
      totalValue += value
      
      if (!allocation[investment.type]) {
        allocation[investment.type] = { value: 0, percentage: 0 }
      }
      allocation[investment.type].value += value
    }

    // Calculate percentages
    Object.keys(allocation).forEach(type => {
      allocation[type].percentage = totalValue > 0 
        ? (allocation[type].value / totalValue) * 100 
        : 0
    })

    return allocation
  }

  private async calculateAccountDistributionForDate(investments: any[], date: Date): Promise<any> {
    const distribution: Record<string, { value: number; percentage: number }> = {}
    let totalValue = 0

    for (const investment of investments) {
      const price = await this.getHistoricalPrice(investment.symbol || undefined, date)
      const value = investment.units && price
        ? investment.units * price
        : investment.totalValue || 0
      
      totalValue += value
      
      if (!distribution[investment.account.name]) {
        distribution[investment.account.name] = { value: 0, percentage: 0 }
      }
      distribution[investment.account.name].value += value
    }

    // Calculate percentages
    Object.keys(distribution).forEach(account => {
      distribution[account].percentage = totalValue > 0 
        ? (distribution[account].value / totalValue) * 100 
        : 0
    })

    return distribution
  }
}

export const historicalDataCollector = new HistoricalDataCollectorService()