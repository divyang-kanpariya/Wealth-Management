import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, createSuccessResponse, NotFoundError } from '@/lib/api-handler'
import { Investment, InvestmentType } from '@/types'

interface InvestmentWithPerformance extends Investment {
  investedValue: number;
  currentValue: number;
  currentPrice: number | null;
  gainLoss: number;
  gainLossPercentage: number;
  riskScore: number;
  volatilityRating: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface PerformanceMetrics {
  totalInvested: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  averageReturn: number;
  bestPerformer: InvestmentWithPerformance | null;
  worstPerformer: InvestmentWithPerformance | null;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
}

interface RiskAnalysis {
  overallRiskScore: number;
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  assetRiskBreakdown: Record<string, { allocation: number; riskScore: number }>;
  diversificationScore: number;
  recommendations: string[];
}

interface TrendAnalysis {
  monthlyGrowthRate: number;
  projectedCompletionDate: Date | null;
  trendDirection: 'POSITIVE' | 'NEGATIVE' | 'STABLE';
  confidenceLevel: number;
  seasonalPatterns: Record<string, number>;
}

// Helper function to calculate risk score for investment types
const calculateRiskScore = (type: InvestmentType): number => {
  const riskScores: Record<InvestmentType, number> = {
    'CRYPTO': 9,
    'STOCK': 7,
    'MUTUAL_FUND': 5,
    'REAL_ESTATE': 4,
    'GOLD': 3,
    'JEWELRY': 6,
    'FD': 1,
    'OTHER': 5
  };
  return riskScores[type] || 5;
};

// Helper function to calculate investments with current prices
const calculateInvestmentsWithPrices = (investments: any[], priceMap: Map<string, number>): InvestmentWithPerformance[] => {
  return investments.map(investment => {
    let currentValue = 0;
    let investedValue = 0;
    let currentPrice = null;

    if (investment.units && investment.buyPrice) {
      investedValue = investment.units * investment.buyPrice;
      
      // Try to get current price
      if (investment.symbol && priceMap.has(investment.symbol)) {
        currentPrice = priceMap.get(investment.symbol)!;
        currentValue = investment.units * currentPrice;
      } else {
        currentValue = investedValue; // Fallback to invested value
      }
    } else if (investment.totalValue) {
      investedValue = investment.totalValue;
      currentValue = investment.totalValue;
    }

    const riskScore = calculateRiskScore(investment.type);
    const volatilityRating = riskScore <= 3 ? 'LOW' : riskScore <= 6 ? 'MEDIUM' : 'HIGH';

    return {
      ...investment,
      investedValue,
      currentValue,
      currentPrice,
      gainLoss: currentValue - investedValue,
      gainLossPercentage: investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0,
      riskScore,
      volatilityRating
    };
  });
};

export const GET = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  
  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      investments: {
        include: {
          account: true,
        },
      },
    },
  })
  
  if (!goal) {
    throw new NotFoundError('Goal not found')
  }

  // Fetch current prices for investments with symbols
  const priceMap = new Map<string, number>();
  const investmentsWithSymbols = goal.investments.filter(inv => inv.symbol);
  
  for (const investment of investmentsWithSymbols) {
    try {
      // Try to fetch from price cache first
      const cachedPrice = await prisma.priceCache.findUnique({
        where: { symbol: investment.symbol! }
      });
      
      if (cachedPrice) {
        priceMap.set(investment.symbol!, cachedPrice.price);
      }
    } catch (error) {
      console.error(`Error fetching price for ${investment.symbol}:`, error);
    }
  }

  // Calculate investments with current values
  const investmentsWithValues = calculateInvestmentsWithPrices(goal.investments, priceMap)

  // Calculate performance metrics
  const totalInvested = investmentsWithValues.reduce((sum, inv) => {
    return sum + inv.investedValue;
  }, 0);
  
  const currentValue = investmentsWithValues.reduce((sum, inv) => {
    return sum + inv.currentValue;
  }, 0);
  
  const gainLoss = currentValue - totalInvested;
  const gainLossPercentage = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;
  
  const returnsWithValues = investmentsWithValues.filter(inv => inv.gainLossPercentage !== 0);
  const averageReturn = returnsWithValues.length > 0 
    ? returnsWithValues.reduce((sum, inv) => sum + inv.gainLossPercentage, 0) / returnsWithValues.length
    : 0;

  const bestPerformer = investmentsWithValues.reduce((best, current) => 
    !best || current.gainLossPercentage > best.gainLossPercentage ? current : best
  , null as InvestmentWithPerformance | null);

  const worstPerformer = investmentsWithValues.reduce((worst, current) => 
    !worst || current.gainLossPercentage < worst.gainLossPercentage ? current : worst
  , null as InvestmentWithPerformance | null);

  // Calculate advanced metrics
  const returns = investmentsWithValues.map(inv => inv.gainLossPercentage);
  const volatility = returns.length > 1 ? calculateVolatility(returns) : 0;
  const sharpeRatio = calculateSharpeRatio(returns, 5); // 5% risk-free rate
  const maxDrawdown = calculateMaxDrawdown(investmentsWithValues);

  const performanceMetrics: PerformanceMetrics = {
    totalInvested,
    currentValue,
    gainLoss,
    gainLossPercentage,
    averageReturn,
    bestPerformer,
    worstPerformer,
    sharpeRatio,
    volatility,
    maxDrawdown
  };

  // Calculate risk analysis
  const riskAnalysis = calculateRiskAnalysis(investmentsWithValues, currentValue);

  // Calculate trend analysis
  const trendAnalysis = calculateTrendAnalysis(investmentsWithValues, goal);

  return createSuccessResponse({
    goal,
    performanceMetrics,
    riskAnalysis,
    trendAnalysis,
    investmentsWithValues
  })
})

// Helper functions for advanced calculations
function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  return Math.sqrt(variance);
}

function calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
  if (returns.length === 0) return 0;
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const volatility = calculateVolatility(returns);
  return volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
}

function calculateMaxDrawdown(investments: InvestmentWithPerformance[]): number {
  if (investments.length === 0) return 0;
  const sortedInvestments = [...investments].sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());
  
  let peak = 0;
  let maxDrawdown = 0;
  let runningValue = 0;
  
  sortedInvestments.forEach(inv => {
    runningValue += inv.currentValue;
    if (runningValue > peak) {
      peak = runningValue;
    }
    const drawdown = peak > 0 ? ((peak - runningValue) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });
  
  return maxDrawdown;
}

function calculateRiskAnalysis(investments: InvestmentWithPerformance[], totalValue: number): RiskAnalysis {
  if (investments.length === 0) {
    return {
      overallRiskScore: 0,
      riskLevel: 'CONSERVATIVE',
      assetRiskBreakdown: {},
      diversificationScore: 0,
      recommendations: ['Add investments to analyze risk profile']
    };
  }

  // Calculate weighted risk score
  const weightedRiskScore = investments.reduce((sum, inv) => {
    const weight = totalValue > 0 ? inv.currentValue / totalValue : 0;
    return sum + (inv.riskScore * weight);
  }, 0);

  // Asset risk breakdown
  const assetRiskBreakdown: Record<string, { allocation: number; riskScore: number }> = {};
  investments.forEach(inv => {
    const type = inv.type;
    if (!assetRiskBreakdown[type]) {
      assetRiskBreakdown[type] = { allocation: 0, riskScore: inv.riskScore };
    }
    assetRiskBreakdown[type].allocation += totalValue > 0 ? (inv.currentValue / totalValue) * 100 : 0;
  });

  // Diversification score
  const assetTypes = Object.keys(assetRiskBreakdown).length;
  const maxAllocation = Math.max(...Object.values(assetRiskBreakdown).map(a => a.allocation));
  const diversificationScore = Math.min(100, (assetTypes * 20) - (maxAllocation - 20));

  // Risk level determination
  let riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  if (weightedRiskScore <= 3) riskLevel = 'CONSERVATIVE';
  else if (weightedRiskScore <= 6) riskLevel = 'MODERATE';
  else riskLevel = 'AGGRESSIVE';

  // Generate recommendations
  const recommendations: string[] = [];
  if (diversificationScore < 60) {
    recommendations.push('Consider diversifying across more asset types');
  }
  if (weightedRiskScore > 7) {
    recommendations.push('Portfolio has high risk - consider adding conservative investments');
  }
  if (maxAllocation > 60) {
    recommendations.push('Consider reducing concentration in single asset type');
  }
  if (assetTypes < 3) {
    recommendations.push('Add more asset types to improve diversification');
  }

  return {
    overallRiskScore: weightedRiskScore,
    riskLevel,
    assetRiskBreakdown,
    diversificationScore: Math.max(0, diversificationScore),
    recommendations
  };
}

function calculateTrendAnalysis(investments: InvestmentWithPerformance[], goal: any): TrendAnalysis {
  if (investments.length < 2) {
    return {
      monthlyGrowthRate: 0,
      projectedCompletionDate: null,
      trendDirection: 'STABLE',
      confidenceLevel: 0,
      seasonalPatterns: {}
    };
  }

  // Sort investments by date
  const sortedInvestments = [...investments].sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());
  
  // Calculate monthly growth rate (simplified)
  const firstValue = sortedInvestments[0].currentValue;
  const lastValue = sortedInvestments[sortedInvestments.length - 1].currentValue;
  const firstDate = new Date(sortedInvestments[0].buyDate);
  const lastDate = new Date(sortedInvestments[sortedInvestments.length - 1].buyDate);
  
  const monthsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  const monthlyGrowthRate = monthsDiff > 0 && firstValue > 0 
    ? (Math.pow(lastValue / firstValue, 1 / monthsDiff) - 1) * 100 
    : 0;

  // Determine trend direction
  let trendDirection: 'POSITIVE' | 'NEGATIVE' | 'STABLE';
  if (monthlyGrowthRate > 1) trendDirection = 'POSITIVE';
  else if (monthlyGrowthRate < -1) trendDirection = 'NEGATIVE';
  else trendDirection = 'STABLE';

  // Project completion date
  let projectedCompletionDate: Date | null = null;
  const currentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  if (monthlyGrowthRate > 0 && currentValue < goal.targetAmount) {
    const monthsToComplete = Math.log(goal.targetAmount / currentValue) / Math.log(1 + monthlyGrowthRate / 100);
    if (monthsToComplete > 0 && monthsToComplete < 1200) { // Cap at 100 years
      projectedCompletionDate = new Date();
      projectedCompletionDate.setMonth(projectedCompletionDate.getMonth() + monthsToComplete);
    }
  }

  // Confidence level
  const confidenceLevel = Math.min(100, (investments.length * 10) + (trendDirection !== 'STABLE' ? 20 : 0));

  // Seasonal patterns (simplified)
  const seasonalPatterns: Record<string, number> = {};
  investments.forEach(inv => {
    const month = new Date(inv.buyDate).toLocaleString('default', { month: 'long' });
    if (!seasonalPatterns[month]) seasonalPatterns[month] = 0;
    seasonalPatterns[month] += inv.currentValue;
  });

  return {
    monthlyGrowthRate,
    projectedCompletionDate,
    trendDirection,
    confidenceLevel,
    seasonalPatterns
  };
}