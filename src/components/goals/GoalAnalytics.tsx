'use client';

import React, { useState } from 'react';
import { Goal, Investment, InvestmentType } from '@/types';
import ProgressChart from '../ui/ProgressChart';
import AllocationChart from '../ui/AllocationChart';
import TimelineChart from '../ui/TimelineChart';
import TrendChart from '../ui/TrendChart';
import RiskChart from '../ui/RiskChart';
import PerformanceChart from '../ui/PerformanceChart';
import CompactCard from '../ui/CompactCard';
import DataGrid from '../ui/DataGrid';
import Button from '../ui/Button';

interface GoalAnalyticsProps {
  goal: Goal;
  analyticsData?: GoalAnalyticsData;
  className?: string;
}

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

interface TimelineData {
  date: Date;
  value: number;
  invested: number;
  milestone?: string;
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

interface GoalAnalyticsData {
  performanceMetrics: PerformanceMetrics;
  timelineData: TimelineData[];
  riskAnalysis: RiskAnalysis;
  trendAnalysis: TrendAnalysis;
}

const GoalAnalytics: React.FC<GoalAnalyticsProps> = ({ goal, analyticsData, className = '' }) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'allocation' | 'timeline' | 'performance' | 'risk' | 'trends'>('overview');

  // Handle case where analyticsData is not provided
  if (!analyticsData) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>Analytics data is not available for this goal.</p>
        </div>
      </div>
    )
  }

  const { performanceMetrics, timelineData, riskAnalysis, trendAnalysis } = analyticsData;

  // Helper functions for advanced analytics
  const calculateVolatility = (returns: number[]): number => {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance);
  };

  const calculateSharpeRatio = (returns: number[], riskFreeRate: number): number => {
    if (returns.length === 0) return 0;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = calculateVolatility(returns);
    return volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
  };

  const calculateMaxDrawdown = (investments: InvestmentWithPerformance[]): number => {
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
  };

  const calculateRiskScore = (investment: Investment): number => {
    // Risk scoring based on investment type
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
    return riskScores[investment.type] || 5;
  };

  const getVolatilityRating = (riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' => {
    if (riskScore <= 3) return 'LOW';
    if (riskScore <= 6) return 'MEDIUM';
    return 'HIGH';
  };

  const calculateRiskAnalysis = (investments: InvestmentWithPerformance[]): RiskAnalysis => {
    if (investments.length === 0) {
      return {
        overallRiskScore: 0,
        riskLevel: 'CONSERVATIVE',
        assetRiskBreakdown: {},
        diversificationScore: 0,
        recommendations: ['Add investments to analyze risk profile']
      };
    }

    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    
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

    // Diversification score (based on number of asset types and distribution)
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
  };

  const calculateTrendAnalysis = (investments: InvestmentWithPerformance[], timelineData: TimelineData[]): TrendAnalysis => {
    if (timelineData.length < 2) {
      return {
        monthlyGrowthRate: 0,
        projectedCompletionDate: null,
        trendDirection: 'STABLE',
        confidenceLevel: 0,
        seasonalPatterns: {}
      };
    }

    // Calculate monthly growth rate
    const sortedTimeline = [...timelineData].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstValue = sortedTimeline[0].value;
    const lastValue = sortedTimeline[sortedTimeline.length - 1].value;
    const monthsDiff = (sortedTimeline[sortedTimeline.length - 1].date.getTime() - sortedTimeline[0].date.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
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
    if (monthlyGrowthRate > 0 && lastValue < goal.targetAmount) {
      const remainingAmount = goal.targetAmount - lastValue;
      const monthsToComplete = Math.log(goal.targetAmount / lastValue) / Math.log(1 + monthlyGrowthRate / 100);
      if (monthsToComplete > 0 && monthsToComplete < 1200) { // Cap at 100 years
        projectedCompletionDate = new Date();
        projectedCompletionDate.setMonth(projectedCompletionDate.getMonth() + monthsToComplete);
      }
    }

    // Confidence level based on data points and consistency
    const confidenceLevel = Math.min(100, (timelineData.length * 10) + (trendDirection !== 'STABLE' ? 20 : 0));

    // Seasonal patterns (simplified)
    const seasonalPatterns: Record<string, number> = {};
    timelineData.forEach(point => {
      const month = point.date.toLocaleString('default', { month: 'long' });
      if (!seasonalPatterns[month]) seasonalPatterns[month] = 0;
      seasonalPatterns[month] += point.value;
    });

    return {
      monthlyGrowthRate,
      projectedCompletionDate,
      trendDirection,
      confidenceLevel,
      seasonalPatterns
    };
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getAssetAllocation = () => {
    if (!goal.investments) return [];
    
    const allocation = goal.investments.reduce((acc, investment) => {
      const value = investment.totalValue || (investment.units && investment.buyPrice ? investment.units * investment.buyPrice : 0);
      
      if (!acc[investment.type]) {
        acc[investment.type] = { value: 0, count: 0 };
      }
      acc[investment.type].value += value;
      acc[investment.type].count += 1;
      
      return acc;
    }, {} as Record<string, { value: number; count: number }>);

    const totalValue = Object.values(allocation).reduce((sum, item) => sum + item.value, 0);
    
    return Object.entries(allocation).map(([type, data]) => ({
      label: type.replace('_', ' '),
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0
    }));
  };

  const getAccountAllocation = () => {
    if (!goal.investments) return [];
    
    const allocation = goal.investments.reduce((acc, investment) => {
      const accountName = investment.account?.name || 'Unknown';
      const value = investment.totalValue || (investment.units && investment.buyPrice ? investment.units * investment.buyPrice : 0);
      
      if (!acc[accountName]) {
        acc[accountName] = { value: 0, count: 0 };
      }
      acc[accountName].value += value;
      acc[accountName].count += 1;
      
      return acc;
    }, {} as Record<string, { value: number; count: 0 }>);

    const totalValue = Object.values(allocation).reduce((sum, item) => sum + item.value, 0);
    
    return Object.entries(allocation).map(([account, data]) => ({
      label: account,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0
    }));
  };

  if (!performanceMetrics) {
    return (
      <div className={`${className} text-center py-8`}>
        <p className="text-gray-600">Unable to load analytics data</p>
      </div>
    );
  }

  const currentAmount = performanceMetrics.currentValue;
  const progressPercentage = Math.min((currentAmount / goal.targetAmount) * 100, 100);

  return (
    <div className={className}>
      {/* View Selector */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'allocation', label: 'Allocation' },
          { key: 'timeline', label: 'Timeline' },
          { key: 'performance', label: 'Performance' },
          { key: 'risk', label: 'Risk Analysis' },
          { key: 'trends', label: 'Trends' }
        ].map(view => (
          <button
            key={view.key}
            onClick={() => setSelectedView(view.key as any)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedView === view.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Chart */}
            <CompactCard title="Goal Progress">
              <ProgressChart
                currentAmount={currentAmount}
                targetAmount={goal.targetAmount}
                size="lg"
                className="py-4"
              />
            </CompactCard>

            {/* Key Metrics */}
            <CompactCard title="Key Metrics">
              <DataGrid
                items={[
                  {
                    label: 'Progress',
                    value: `${progressPercentage.toFixed(1)}%`,
                    color: progressPercentage >= 75 ? 'success' : progressPercentage >= 50 ? 'warning' : 'danger'
                  },
                  {
                    label: 'Total Return',
                    value: formatPercentage(performanceMetrics.gainLossPercentage),
                    color: performanceMetrics.gainLoss >= 0 ? 'success' : 'danger'
                  },
                  {
                    label: 'Gain/Loss',
                    value: formatCurrency(performanceMetrics.gainLoss),
                    color: performanceMetrics.gainLoss >= 0 ? 'success' : 'danger'
                  },
                  {
                    label: 'Investments',
                    value: goal.investments?.length.toString() || '0',
                    color: 'info'
                  }
                ]}
                columns={2}
                variant="compact"
              />
            </CompactCard>
          </div>

          {/* Summary Stats */}
          <CompactCard title="Summary">
            <DataGrid
              items={[
                {
                  label: 'Current Value',
                  value: formatCurrency(currentAmount)
                },
                {
                  label: 'Target Amount',
                  value: formatCurrency(goal.targetAmount)
                },
                {
                  label: 'Amount Remaining',
                  value: formatCurrency(Math.max(0, goal.targetAmount - currentAmount))
                },
                {
                  label: 'Total Invested',
                  value: formatCurrency(performanceMetrics.totalInvested)
                }
              ]}
              columns={4}
              variant="default"
            />
          </CompactCard>
        </div>
      )}

      {/* Allocation Tab */}
      {selectedView === 'allocation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asset Allocation */}
            <CompactCard title="Asset Allocation">
              <AllocationChart
                data={getAssetAllocation()}
                size="md"
                showLegend={true}
              />
            </CompactCard>

            {/* Account Allocation */}
            <CompactCard title="Account Allocation">
              <AllocationChart
                data={getAccountAllocation()}
                size="md"
                showLegend={true}
              />
            </CompactCard>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {selectedView === 'timeline' && (
        <CompactCard title="Investment Timeline & Trends">
          <TrendChart
            data={timelineData}
            targetValue={goal.targetAmount}
            height={300}
            showProjection={true}
            projectedCompletionDate={trendAnalysis?.projectedCompletionDate}
          />
        </CompactCard>
      )}

      {/* Performance Tab */}
      {selectedView === 'performance' && (
        <div className="space-y-6">
          {/* Performance Summary */}
          <CompactCard title="Performance Summary">
            <DataGrid
              items={[
                {
                  label: 'Average Return',
                  value: formatPercentage(performanceMetrics.averageReturn),
                  color: performanceMetrics.averageReturn >= 0 ? 'success' : 'danger'
                },
                {
                  label: 'Total Return',
                  value: formatPercentage(performanceMetrics.gainLossPercentage),
                  color: performanceMetrics.gainLossPercentage >= 0 ? 'success' : 'danger'
                },
                {
                  label: 'Absolute Gain/Loss',
                  value: formatCurrency(performanceMetrics.gainLoss),
                  color: performanceMetrics.gainLoss >= 0 ? 'success' : 'danger'
                }
              ]}
              columns={3}
              variant="default"
            />
          </CompactCard>

          {/* Investment Performance Chart */}
          {goal.investments && goal.investments.length > 0 && (
            <CompactCard title="Investment Performance Analysis">
              <PerformanceChart
                data={goal.investments.map(inv => {
                  const investedValue = inv.totalValue || (inv.units && inv.buyPrice ? inv.units * inv.buyPrice : 0);
                  const currentValue = investedValue; // Simplified for now
                  const gainLoss = currentValue - investedValue;
                  const gainLossPercentage = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
                  const riskScore = calculateRiskScore(inv);
                  
                  return {
                    name: inv.name,
                    type: inv.type,
                    investedValue,
                    currentValue,
                    gainLoss,
                    gainLossPercentage,
                    riskScore
                  };
                })}
                height={350}
                showRiskBubbles={true}
              />
            </CompactCard>
          )}

          {/* Top Performers */}
          {(performanceMetrics.bestPerformer || performanceMetrics.worstPerformer) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {performanceMetrics.bestPerformer && (
                <CompactCard title="Best Performer" className="border-green-200">
                  <div className="space-y-2">
                    <div className="font-medium text-gray-900">{performanceMetrics.bestPerformer.name}</div>
                    <div className="text-sm text-gray-600">{performanceMetrics.bestPerformer.type}</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatPercentage(performanceMetrics.bestPerformer.gainLossPercentage)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(performanceMetrics.bestPerformer.gainLoss)} gain
                    </div>
                  </div>
                </CompactCard>
              )}

              {performanceMetrics.worstPerformer && (
                <CompactCard title="Worst Performer" className="border-red-200">
                  <div className="space-y-2">
                    <div className="font-medium text-gray-900">{performanceMetrics.worstPerformer.name}</div>
                    <div className="text-sm text-gray-600">{performanceMetrics.worstPerformer.type}</div>
                    <div className="text-lg font-semibold text-red-600">
                      {formatPercentage(performanceMetrics.worstPerformer.gainLossPercentage)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(Math.abs(performanceMetrics.worstPerformer.gainLoss))} loss
                    </div>
                  </div>
                </CompactCard>
              )}
            </div>
          )}

          {/* Advanced Performance Metrics */}
          <CompactCard title="Advanced Metrics">
            <DataGrid
              items={[
                {
                  label: 'Sharpe Ratio',
                  value: performanceMetrics.sharpeRatio.toFixed(2),
                  color: performanceMetrics.sharpeRatio > 1 ? 'success' : performanceMetrics.sharpeRatio > 0 ? 'warning' : 'danger'
                },
                {
                  label: 'Volatility',
                  value: `${performanceMetrics.volatility.toFixed(2)}%`,
                  color: performanceMetrics.volatility < 10 ? 'success' : performanceMetrics.volatility < 20 ? 'warning' : 'danger'
                },
                {
                  label: 'Max Drawdown',
                  value: `${performanceMetrics.maxDrawdown.toFixed(2)}%`,
                  color: performanceMetrics.maxDrawdown < 10 ? 'success' : performanceMetrics.maxDrawdown < 20 ? 'warning' : 'danger'
                }
              ]}
              columns={3}
              variant="default"
            />
          </CompactCard>
        </div>
      )}

      {/* Risk Analysis Tab */}
      {selectedView === 'risk' && riskAnalysis && (
        <div className="space-y-6">
          {/* Risk Overview */}
          <CompactCard title="Risk Overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2" style={{
                  color: riskAnalysis.riskLevel === 'CONSERVATIVE' ? '#10B981' : 
                         riskAnalysis.riskLevel === 'MODERATE' ? '#F59E0B' : '#EF4444'
                }}>
                  {riskAnalysis.overallRiskScore.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Risk Score</div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  riskAnalysis.riskLevel === 'CONSERVATIVE' ? 'bg-green-100 text-green-800' :
                  riskAnalysis.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {riskAnalysis.riskLevel}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold mb-2" style={{
                  color: riskAnalysis.diversificationScore >= 70 ? '#10B981' : 
                         riskAnalysis.diversificationScore >= 40 ? '#F59E0B' : '#EF4444'
                }}>
                  {riskAnalysis.diversificationScore.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Diversification</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-blue-600">
                  {Object.keys(riskAnalysis.assetRiskBreakdown).length}
                </div>
                <div className="text-sm text-gray-600">Asset Types</div>
              </div>
            </div>
          </CompactCard>

          {/* Risk Chart */}
          {Object.keys(riskAnalysis.assetRiskBreakdown).length > 0 && (
            <CompactCard title="Risk Analysis Chart">
              <RiskChart
                data={Object.entries(riskAnalysis.assetRiskBreakdown).map(([type, data]) => ({
                  label: type.replace('_', ' '),
                  riskScore: data.riskScore,
                  allocation: data.allocation,
                  value: (data.allocation / 100) * performanceMetrics.currentValue
                }))}
                overallRiskScore={riskAnalysis.overallRiskScore}
                riskLevel={riskAnalysis.riskLevel}
                diversificationScore={riskAnalysis.diversificationScore}
                height={300}
              />
            </CompactCard>
          )}

          {/* Asset Risk Breakdown */}
          <CompactCard title="Asset Risk Breakdown">
            <div className="space-y-3">
              {Object.entries(riskAnalysis.assetRiskBreakdown).map(([assetType, data]) => (
                <div key={assetType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      data.riskScore <= 3 ? 'bg-green-500' :
                      data.riskScore <= 6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium text-gray-900">{assetType.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-600">Risk Score: {data.riskScore}/10</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{data.allocation.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">of portfolio</div>
                  </div>
                </div>
              ))}
            </div>
          </CompactCard>

          {/* Risk Recommendations */}
          {riskAnalysis.recommendations.length > 0 && (
            <CompactCard title="Risk Management Recommendations">
              <div className="space-y-2">
                {riskAnalysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-blue-800">{recommendation}</div>
                  </div>
                ))}
              </div>
            </CompactCard>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {selectedView === 'trends' && trendAnalysis && (
        <div className="space-y-6">
          {/* Trend Overview */}
          <CompactCard title="Trend Analysis">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${
                  trendAnalysis.trendDirection === 'POSITIVE' ? 'text-green-600' :
                  trendAnalysis.trendDirection === 'NEGATIVE' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {formatPercentage(trendAnalysis.monthlyGrowthRate)}
                </div>
                <div className="text-sm text-gray-600">Monthly Growth</div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  trendAnalysis.trendDirection === 'POSITIVE' ? 'bg-green-100 text-green-800' :
                  trendAnalysis.trendDirection === 'NEGATIVE' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {trendAnalysis.trendDirection}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-blue-600">
                  {trendAnalysis.confidenceLevel.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Confidence Level</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold mb-2 text-purple-600">
                  {trendAnalysis.projectedCompletionDate ? 
                    trendAnalysis.projectedCompletionDate.toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric'
                    }) : 'N/A'
                  }
                </div>
                <div className="text-sm text-gray-600">Projected Completion</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-indigo-600">
                  {Object.keys(trendAnalysis.seasonalPatterns).length}
                </div>
                <div className="text-sm text-gray-600">Data Points</div>
              </div>
            </div>
          </CompactCard>

          {/* Trend Insights */}
          <CompactCard title="Trend Insights">
            <div className="space-y-4">
              {trendAnalysis.monthlyGrowthRate > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Positive Growth Trend</h3>
                      <div className="mt-1 text-sm text-green-700">
                        Your goal is growing at {formatPercentage(trendAnalysis.monthlyGrowthRate)} per month.
                        {trendAnalysis.projectedCompletionDate && (
                          <span> At this rate, you could reach your target by {trendAnalysis.projectedCompletionDate.toLocaleDateString()}.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {trendAnalysis.monthlyGrowthRate < 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-10.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 7.414V11a1 1 0 102 0V7.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Declining Trend</h3>
                      <div className="mt-1 text-sm text-red-700">
                        Your goal value is declining at {formatPercentage(Math.abs(trendAnalysis.monthlyGrowthRate))} per month. 
                        Consider reviewing your investment strategy.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {Math.abs(trendAnalysis.monthlyGrowthRate) <= 1 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Stable Trend</h3>
                      <div className="mt-1 text-sm text-yellow-700">
                        Your goal progress is relatively stable with minimal monthly change. 
                        Consider increasing contributions to accelerate progress.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {trendAnalysis.confidenceLevel < 50 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-800">Limited Data</h3>
                      <div className="mt-1 text-sm text-gray-700">
                        Trend analysis has low confidence due to limited historical data. 
                        More investment history will improve accuracy.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CompactCard>

          {/* Seasonal Patterns */}
          {Object.keys(trendAnalysis.seasonalPatterns).length > 0 && (
            <CompactCard title="Investment Patterns">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(trendAnalysis.seasonalPatterns)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 8)
                  .map(([month, value]) => (
                    <div key={month} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(value)}
                      </div>
                      <div className="text-sm text-gray-600">{month}</div>
                    </div>
                  ))}
              </div>
            </CompactCard>
          )}
        </div>
      )}

      {/* Risk Analysis Tab */}
      {selectedView === 'risk' && riskAnalysis && (
        <div className="space-y-6">
          {/* Risk Overview */}
          <CompactCard title="Risk Overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2" style={{
                  color: riskAnalysis.riskLevel === 'CONSERVATIVE' ? '#10B981' : 
                         riskAnalysis.riskLevel === 'MODERATE' ? '#F59E0B' : '#EF4444'
                }}>
                  {riskAnalysis.overallRiskScore.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Risk Score</div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  riskAnalysis.riskLevel === 'CONSERVATIVE' ? 'bg-green-100 text-green-800' :
                  riskAnalysis.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {riskAnalysis.riskLevel}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold mb-2" style={{
                  color: riskAnalysis.diversificationScore >= 70 ? '#10B981' : 
                         riskAnalysis.diversificationScore >= 40 ? '#F59E0B' : '#EF4444'
                }}>
                  {riskAnalysis.diversificationScore.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Diversification</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-blue-600">
                  {Object.keys(riskAnalysis.assetRiskBreakdown).length}
                </div>
                <div className="text-sm text-gray-600">Asset Types</div>
              </div>
            </div>
          </CompactCard>

          {/* Risk Chart */}
          {Object.keys(riskAnalysis.assetRiskBreakdown).length > 0 && (
            <CompactCard title="Risk Analysis Chart">
              <RiskChart
                data={Object.entries(riskAnalysis.assetRiskBreakdown).map(([type, data]) => ({
                  label: type.replace('_', ' '),
                  riskScore: data.riskScore,
                  allocation: data.allocation,
                  value: (data.allocation / 100) * performanceMetrics.currentValue
                }))}
                overallRiskScore={riskAnalysis.overallRiskScore}
                riskLevel={riskAnalysis.riskLevel}
                diversificationScore={riskAnalysis.diversificationScore}
                height={300}
              />
            </CompactCard>
          )}

          {/* Asset Risk Breakdown */}
          <CompactCard title="Asset Risk Breakdown">
            <div className="space-y-3">
              {Object.entries(riskAnalysis.assetRiskBreakdown).map(([assetType, data]) => (
                <div key={assetType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      data.riskScore <= 3 ? 'bg-green-500' :
                      data.riskScore <= 6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium text-gray-900">{assetType.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-600">Risk Score: {data.riskScore}/10</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{data.allocation.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">of portfolio</div>
                  </div>
                </div>
              ))}
            </div>
          </CompactCard>

          {/* Risk Recommendations */}
          {riskAnalysis.recommendations.length > 0 && (
            <CompactCard title="Risk Management Recommendations">
              <div className="space-y-2">
                {riskAnalysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded-lg">
                    <div className="w-5 h-5 text-blue-600 mt-0.5">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-blue-800">{recommendation}</div>
                  </div>
                ))}
              </div>
            </CompactCard>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {selectedView === 'trends' && trendAnalysis && (
        <div className="space-y-6">
          {/* Trend Overview */}
          <CompactCard title="Trend Analysis">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${
                  trendAnalysis.trendDirection === 'POSITIVE' ? 'text-green-600' :
                  trendAnalysis.trendDirection === 'NEGATIVE' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trendAnalysis.trendDirection === 'POSITIVE' ? '↗' :
                   trendAnalysis.trendDirection === 'NEGATIVE' ? '↘' : '→'}
                </div>
                <div className="text-sm text-gray-600">Trend Direction</div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  trendAnalysis.trendDirection === 'POSITIVE' ? 'bg-green-100 text-green-800' :
                  trendAnalysis.trendDirection === 'NEGATIVE' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {trendAnalysis.trendDirection}
                </div>
              </div>

              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${
                  trendAnalysis.monthlyGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(trendAnalysis.monthlyGrowthRate)}
                </div>
                <div className="text-sm text-gray-600">Monthly Growth</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-blue-600">
                  {trendAnalysis.confidenceLevel.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Confidence Level</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold mb-2 text-gray-900">
                  {trendAnalysis.projectedCompletionDate 
                    ? trendAnalysis.projectedCompletionDate.toLocaleDateString(undefined, { 
                        month: 'short', 
                        year: 'numeric' 
                      })
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-gray-600">Projected Completion</div>
              </div>
            </div>
          </CompactCard>

          {/* Growth Projection */}
          {trendAnalysis.projectedCompletionDate && (
            <CompactCard title="Goal Completion Projection">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-blue-900">Projected Timeline</h4>
                    <p className="text-sm text-blue-700">
                      Based on current growth rate of {formatPercentage(trendAnalysis.monthlyGrowthRate)} per month
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">
                      {Math.ceil((trendAnalysis.projectedCompletionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                    </div>
                    <div className="text-sm text-blue-700">remaining</div>
                  </div>
                </div>
                
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, (performanceMetrics.currentValue / goal.targetAmount) * 100)}%` 
                    }}
                  />
                </div>
                
                <div className="flex justify-between text-sm text-blue-700 mt-2">
                  <span>Current: {formatCurrency(performanceMetrics.currentValue)}</span>
                  <span>Target: {formatCurrency(goal.targetAmount)}</span>
                </div>
              </div>
            </CompactCard>
          )}

          {/* Trend Insights */}
          <CompactCard title="Trend Insights">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Performance Analysis</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Growth Consistency:</span>
                    <span className={`font-medium ${
                      trendAnalysis.confidenceLevel >= 70 ? 'text-green-600' :
                      trendAnalysis.confidenceLevel >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {trendAnalysis.confidenceLevel >= 70 ? 'High' :
                       trendAnalysis.confidenceLevel >= 40 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Data Points:</span>
                    <span className="font-medium text-gray-900">{timelineData.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Trend Strength:</span>
                    <span className={`font-medium ${
                      Math.abs(trendAnalysis.monthlyGrowthRate) >= 2 ? 'text-green-600' :
                      Math.abs(trendAnalysis.monthlyGrowthRate) >= 1 ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {Math.abs(trendAnalysis.monthlyGrowthRate) >= 2 ? 'Strong' :
                       Math.abs(trendAnalysis.monthlyGrowthRate) >= 1 ? 'Moderate' : 'Weak'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {trendAnalysis.trendDirection === 'POSITIVE' && (
                    <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                      ✓ Goal is on track with positive growth trend
                    </div>
                  )}
                  {trendAnalysis.trendDirection === 'NEGATIVE' && (
                    <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
                      ⚠ Consider increasing investments or reviewing strategy
                    </div>
                  )}
                  {trendAnalysis.confidenceLevel < 50 && (
                    <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                      ℹ More data needed for reliable trend analysis
                    </div>
                  )}
                  {trendAnalysis.monthlyGrowthRate > 0 && trendAnalysis.projectedCompletionDate && (
                    <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                      📈 Maintain current investment pace to reach goal on time
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CompactCard>
        </div>
      )}
    </div>
  );
};

export default GoalAnalytics;