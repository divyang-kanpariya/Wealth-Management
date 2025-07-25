import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  calculateInvestmentsWithPrices, 
  calculatePortfolioSummary, 
  calculateGoalProgress,
  getTopPerformers 
} from '@/lib/calculations'

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

    // Get cached price data for stocks and mutual funds
    const priceCache = await prisma.priceCache.findMany()
    const priceData = new Map<string, number>()
    priceCache.forEach(cache => {
      priceData.set(cache.symbol, cache.price)
    })

    // Calculate investment values with current prices
    const investmentsWithValues = calculateInvestmentsWithPrices(investments, priceData)

    // Calculate portfolio summary using the calculation utilities
    const portfolioSummary = calculatePortfolioSummary(investmentsWithValues)

    // Calculate goal progress using the calculation utilities
    const goalProgress = goals.map(goal => calculateGoalProgress(goal, investmentsWithValues))

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