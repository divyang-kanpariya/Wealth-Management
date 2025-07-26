import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  calculateInvestmentsWithPrices, 
  calculatePortfolioSummary, 
  calculateGoalProgress,
  getTopPerformers 
} from '@/lib/calculations'
import { batchGetPrices, batchGetMutualFundNAVs } from '@/lib/price-fetcher'

export async function GET() {
  try {
    // Get all investments with related data
    const investments = await prisma.investment.findMany({
      include: {
        goal: true,
        account: true,
      },
    })

    // Get all goals
    const goals = await prisma.goal.findMany({
      include: {
        investments: true,
      },
    })

    // Separate investments by type for price fetching
    const stockInvestments = investments.filter(inv => 
      inv.symbol && ['STOCK', 'CRYPTO'].includes(inv.type)
    )
    const mutualFundInvestments = investments.filter(inv => 
      inv.symbol && inv.type === 'MUTUAL_FUND'
    )

    // Get cached price data first
    const priceCache = await prisma.priceCache.findMany()
    const priceData = new Map<string, number>()
    priceCache.forEach(cache => {
      priceData.set(cache.symbol, cache.price)
    })

    // Identify symbols that need fresh price data (not in cache or stale)
    const CACHE_VALIDITY = 60 * 60 * 1000 // 1 hour
    const now = Date.now()
    
    const staleStockSymbols = stockInvestments
      .filter(inv => {
        const cached = priceCache.find(cache => cache.symbol === inv.symbol)
        return !cached || (now - cached.lastUpdated.getTime()) > CACHE_VALIDITY
      })
      .map(inv => inv.symbol!)

    const staleMutualFundSymbols = mutualFundInvestments
      .filter(inv => {
        const cached = priceCache.find(cache => cache.symbol === inv.symbol)
        return !cached || (now - cached.lastUpdated.getTime()) > CACHE_VALIDITY
      })
      .map(inv => inv.symbol!)

    // Fetch fresh prices for stale data
    const pricePromises: Promise<void>[] = []

    if (staleStockSymbols.length > 0) {
      pricePromises.push(
        batchGetPrices(staleStockSymbols)
          .then(results => {
            results.forEach(result => {
              if (result.price !== null) {
                priceData.set(result.symbol, result.price)
              }
            })
          })
          .catch(error => {
            console.error('Error fetching stock prices:', error)
          })
      )
    }

    if (staleMutualFundSymbols.length > 0) {
      pricePromises.push(
        batchGetMutualFundNAVs(staleMutualFundSymbols)
          .then(results => {
            results.forEach(result => {
              if (result.nav !== null) {
                priceData.set(result.schemeCode, result.nav)
              }
            })
          })
          .catch(error => {
            console.error('Error fetching mutual fund NAVs:', error)
          })
      )
    }

    // Wait for all price fetching to complete
    await Promise.all(pricePromises)

    // Transform investments to match TypeScript types (convert null to undefined)
    const transformedInvestments = investments.map(investment => ({
      ...investment,
      symbol: investment.symbol ?? undefined,
      units: investment.units ?? undefined,
      buyPrice: investment.buyPrice ?? undefined,
      quantity: investment.quantity ?? undefined,
      totalValue: investment.totalValue ?? undefined,
      goalId: investment.goalId ?? undefined,
      notes: investment.notes ?? undefined,
      goal: investment.goal ? {
        ...investment.goal,
        priority: investment.goal.priority ?? undefined,
        description: investment.goal.description ?? undefined,
      } : undefined,
      account: investment.account ? {
        ...investment.account,
        notes: investment.account.notes ?? undefined,
      } : investment.account,
    }))

    // Calculate investment values with current prices
    const investmentsWithValues = calculateInvestmentsWithPrices(transformedInvestments, priceData)

    // Calculate portfolio summary using the calculation utilities
    const portfolioSummary = calculatePortfolioSummary(investmentsWithValues)

    // Transform goals to match TypeScript types (convert null to undefined)
    const transformedGoals = goals.map(goal => ({
      ...goal,
      priority: goal.priority ?? undefined,
      description: goal.description ?? undefined,
      investments: goal.investments.map(investment => ({
        ...investment,
        symbol: investment.symbol ?? undefined,
        units: investment.units ?? undefined,
        buyPrice: investment.buyPrice ?? undefined,
        quantity: investment.quantity ?? undefined,
        totalValue: investment.totalValue ?? undefined,
        goalId: investment.goalId ?? undefined,
        notes: investment.notes ?? undefined,
      }))
    }))

    // Calculate goal progress using the calculation utilities
    const goalProgress = transformedGoals.map(goal => calculateGoalProgress(goal, investmentsWithValues))

    // Get top performers data
    const topPerformers = getTopPerformers(investmentsWithValues, 5)

    return NextResponse.json({
      portfolioSummary,
      goalProgress,
      topPerformers: {
        topGainers: topPerformers.topGainers,
        topLosers: topPerformers.topLosers,
        topPercentageGainers: topPerformers.topPercentageGainers,
        topPercentageLosers: topPerformers.topPercentageLosers,
      },
      investmentsWithValues, // Include for TopPerformers component
      totalInvestments: investments.length,
      totalGoals: goals.length,
    })
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}