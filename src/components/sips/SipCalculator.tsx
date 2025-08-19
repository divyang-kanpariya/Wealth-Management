'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input, Select, Button, CompactCard, DataGrid, Toggle, Tooltip, InflationDisplay } from '@/components/ui'

interface SipCalculatorProps {
  onResults: (results: SipCalculatorResults) => void
}

interface SipCalculatorResults {
  monthlyAmount: number
  targetAmount: number
  years: number
  expectedReturn: number
  totalInvestment: number
  maturityAmount: number
  totalGains: number
  inflationAdjustedAmount?: number
  stepUpRate?: number
  monthlyBreakdown: Array<{
    month: number
    year: number
    monthlyInvestment: number
    cumulativeInvestment: number
    cumulativeValue: number
    monthlyGain: number
  }>
}

export function SipCalculator({ onResults }: SipCalculatorProps) {
  const [calculationType, setCalculationType] = useState<'target' | 'amount'>('target')
  const [formData, setFormData] = useState({
    // Common fields
    expectedReturn: 12,
    years: 10,
    
    // Target-based calculation
    targetAmount: 1000000,
    
    // Amount-based calculation
    monthlyAmount: 5000,
    
    // Advanced options
    inflationRate: 6,
    stepUpRate: 10,
    enableInflationAdjustment: false,
    enableStepUp: false
  })

  const [results, setResults] = useState<SipCalculatorResults | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [breakdownView, setBreakdownView] = useState<'monthly' | 'yearly'>('yearly')
  const [isCalculating, setIsCalculating] = useState(false)


  const handleInputChange = (field: string, value: number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const calculateStepUpSipAmount = useCallback((targetAmount: number, monthlyRate: number, totalMonths: number, stepUpRate: number): number => {
    // Helper function for step-up SIP value calculation
    const calculateValue = (initialAmount: number): number => {
      let totalValue = 0
      let currentAmount = initialAmount
      
      for (let month = 1; month <= totalMonths; month++) {
        // Increase amount annually
        if (month > 1 && (month - 1) % 12 === 0) {
          currentAmount = currentAmount * (1 + stepUpRate * 12)
        }
        
        // Calculate future value of this payment
        const remainingMonths = totalMonths - month + 1
        const futureValue = currentAmount * Math.pow(1 + monthlyRate, remainingMonths - 1)
        totalValue += futureValue
      }
      
      return totalValue
    }

    // Iterative approach to find the initial monthly amount for step-up SIP
    let low = 100
    let high = targetAmount / 12
    let result = 0
    
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2
      const calculatedValue = calculateValue(mid)
      
      if (Math.abs(calculatedValue - targetAmount) < 1000) {
        result = mid
        break
      }
      
      if (calculatedValue < targetAmount) {
        low = mid
      } else {
        high = mid
      }
    }
    
    return result
  }, [])

  const calculateStepUpSipValue = useCallback((initialAmount: number, monthlyRate: number, totalMonths: number, stepUpRate: number): number => {
    let totalValue = 0
    let currentAmount = initialAmount
    
    for (let month = 1; month <= totalMonths; month++) {
      // Increase amount annually
      if (month > 1 && (month - 1) % 12 === 0) {
        currentAmount = currentAmount * (1 + stepUpRate * 12)
      }
      
      // Calculate future value of this payment
      const remainingMonths = totalMonths - month + 1
      const futureValue = currentAmount * Math.pow(1 + monthlyRate, remainingMonths - 1)
      totalValue += futureValue
    }
    
    return totalValue
  }, [])

  const calculateMonthlyBreakdown = useCallback((
    monthlyAmount: number,
    monthlyRate: number,
    totalMonths: number,
    stepUpRate: number
  ): SipCalculatorResults['monthlyBreakdown'] => {
    const breakdown: SipCalculatorResults['monthlyBreakdown'] = []
    let cumulativeInvestment = 0
    let cumulativeValue = 0
    let currentAmount = monthlyAmount
    
    for (let month = 1; month <= totalMonths; month++) {
      // Increase amount annually for step-up
      if (stepUpRate > 0 && month > 1 && (month - 1) % 12 === 0) {
        currentAmount = currentAmount * (1 + stepUpRate * 12)
      }
      
      cumulativeInvestment += currentAmount
      
      // Calculate compound growth on existing value plus new investment
      cumulativeValue = (cumulativeValue * (1 + monthlyRate)) + currentAmount
      
      const monthlyGain = cumulativeValue - cumulativeInvestment
      
      breakdown.push({
        month,
        year: Math.ceil(month / 12),
        monthlyInvestment: Math.round(currentAmount),
        cumulativeInvestment: Math.round(cumulativeInvestment),
        cumulativeValue: Math.round(cumulativeValue),
        monthlyGain: Math.round(monthlyGain)
      })
    }
    
    return breakdown
  }, [])

  const calculateSIP = useCallback(() => {
    setIsCalculating(true)
    
    // Add a small delay to show smooth transition
    setTimeout(() => {
      const { expectedReturn, years, targetAmount, monthlyAmount, inflationRate, stepUpRate, enableInflationAdjustment, enableStepUp } = formData
      
      const monthlyRate = expectedReturn / 100 / 12
      const totalMonths = years * 12
    
    let calculatedMonthlyAmount: number
    let calculatedTargetAmount: number
    
    if (calculationType === 'target') {
      // Calculate monthly amount needed for target
      const adjustedTarget = enableInflationAdjustment 
        ? targetAmount * Math.pow(1 + inflationRate / 100, years)
        : targetAmount
      
      if (enableStepUp) {
        // Complex calculation for step-up SIP
        calculatedMonthlyAmount = calculateStepUpSipAmount(adjustedTarget, monthlyRate, totalMonths, stepUpRate / 100 / 12)
      } else {
        // Standard SIP calculation: FV = PMT * [((1 + r)^n - 1) / r]
        calculatedMonthlyAmount = adjustedTarget / (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate))
      }
      calculatedTargetAmount = adjustedTarget
    } else {
      // Calculate target amount from monthly amount
      calculatedMonthlyAmount = monthlyAmount
      
      if (enableStepUp) {
        calculatedTargetAmount = calculateStepUpSipValue(monthlyAmount, monthlyRate, totalMonths, stepUpRate / 100 / 12)
      } else {
        // Standard SIP calculation
        calculatedTargetAmount = monthlyAmount * (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate))
      }
    }
    
    // Calculate breakdown
    const monthlyBreakdown = calculateMonthlyBreakdown(
      calculatedMonthlyAmount,
      monthlyRate,
      totalMonths,
      enableStepUp ? stepUpRate / 100 / 12 : 0
    )
    
    const totalInvestment = monthlyBreakdown.reduce((sum, month) => sum + month.monthlyInvestment, 0)
    const maturityAmount = monthlyBreakdown[monthlyBreakdown.length - 1]?.cumulativeValue || 0
    const totalGains = maturityAmount - totalInvestment
    
    const calculatorResults: SipCalculatorResults = {
      monthlyAmount: Math.round(calculatedMonthlyAmount),
      targetAmount: Math.round(calculatedTargetAmount),
      years,
      expectedReturn,
      totalInvestment: Math.round(totalInvestment),
      maturityAmount: Math.round(maturityAmount),
      totalGains: Math.round(totalGains),
      inflationAdjustedAmount: enableInflationAdjustment ? targetAmount : undefined,
      stepUpRate: enableStepUp ? stepUpRate : undefined,
      monthlyBreakdown
    }
    
    setResults(calculatorResults)
    setIsCalculating(false)
    }, 300) // Small delay for smooth animation
  }, [formData, calculationType, calculateStepUpSipAmount, calculateStepUpSipValue, calculateMonthlyBreakdown])

  const handleCalculate = () => {
    calculateSIP()
  }

  const handleUseResults = () => {
    if (results) {
      onResults(results)
    }
  }

  // Auto-calculate when inputs change with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateSIP()
    }, 800) // Increased debounce time for smoother UX
    
    return () => clearTimeout(timer)
  }, [calculateSIP])

  return (
    <div className="space-y-6">
      {/* Calculation Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          What do you want to calculate?
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="target"
              checked={calculationType === 'target'}
              onChange={(e) => setCalculationType(e.target.value as 'target' | 'amount')}
              className="mr-2"
            />
            Monthly amount needed for target
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="amount"
              checked={calculationType === 'amount'}
              onChange={(e) => setCalculationType(e.target.value as 'target' | 'amount')}
              className="mr-2"
            />
            Target amount from monthly investment
          </label>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {calculationType === 'target' ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Target Amount (₹)
            </label>
            <Input
              type="number"
              step="10000"
              min="10000"
              value={formData.targetAmount}
              onChange={(e) => handleInputChange('targetAmount', Number(e.target.value))}
              className="text-lg font-medium"
            />
            <p className="text-xs text-gray-500">
              The amount you want to accumulate
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Monthly Investment (₹)
            </label>
            <Input
              type="number"
              step="500"
              min="500"
              value={formData.monthlyAmount}
              onChange={(e) => handleInputChange('monthlyAmount', Number(e.target.value))}
              className="text-lg font-medium"
            />
            <p className="text-xs text-gray-500">
              Amount you can invest every month
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Investment Period (Years)
          </label>
          <Input
            type="number"
            step="1"
            min="1"
            max="50"
            value={formData.years}
            onChange={(e) => handleInputChange('years', Number(e.target.value))}
            className="text-lg font-medium"
          />
          <p className="text-xs text-gray-500">
            How long you want to invest
          </p>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Expected Annual Return (%)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              step="0.5"
              min="1"
              max="30"
              value={formData.expectedReturn}
              onChange={(e) => handleInputChange('expectedReturn', Number(e.target.value))}
              className="text-lg font-medium"
            />
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Equity: 12-15%</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Debt: 6-8%</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Hybrid: 8-12%</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Expected annual returns based on your investment type
          </p>
        </div>
      </div>

      {/* Advanced Options */}
      <CompactCard title="Advanced Options" variant="minimal">
        <div className="space-y-6">
          {/* Inflation Adjustment */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Toggle
                checked={formData.enableInflationAdjustment}
                onChange={(checked) => handleInputChange('enableInflationAdjustment', checked)}
                label="Adjust for inflation"
                description="Account for inflation to calculate real purchasing power"
              />
              <Tooltip content="Inflation reduces the purchasing power of money over time. Enabling this option shows how much your money will be worth in today's terms and adjusts calculations accordingly.">
                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Tooltip>
            </div>
            
            {formData.enableInflationAdjustment && (
              <div className="ml-12 space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Inflation Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="15"
                      value={formData.inflationRate}
                      onChange={(e) => handleInputChange('inflationRate', Number(e.target.value))}
                    />
                  </div>
                </div>
                
                {/* Inflation Impact Display */}
                {/* {calculationType === 'target' && (
                  <InflationDisplay
                    nominalValue={formData.targetAmount * Math.pow(1 + formData.inflationRate / 100, formData.years)}
                    realValue={formData.targetAmount}
                    inflationRate={formData.inflationRate}
                    years={formData.years}
                    onInflationRateChange={(rate) => handleInputChange('inflationRate', rate)}
                    nominalLabel="Required Investment Target"
                    realLabel="Today's Purchasing Power"
                    variant="compact"
                    showToggle={false}
                  />
                )} */}
                
                {/* Inflation Impact for Amount-based calculation */}
                {/* {calculationType === 'amount' && results && (
                  <InflationDisplay
                    nominalValue={results.maturityAmount}
                    inflationRate={formData.inflationRate}
                    years={formData.years}
                    onInflationRateChange={(rate) => handleInputChange('inflationRate', rate)}
                    nominalLabel="Future Wealth"
                    realLabel="Real Wealth (Today's Value)"
                    variant="compact"
                    showToggle={false}
                  />
                )} */}
              </div>
            )}
          </div>

          {/* Step-up SIP */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Toggle
                checked={formData.enableStepUp}
                onChange={(checked) => handleInputChange('enableStepUp', checked)}
                label="Enable step-up SIP"
                description="Increase investment amount annually to beat inflation"
              />
              <Tooltip content="Step-up SIP increases your investment amount every year, typically by 10-15%. This helps you invest more as your income grows and stay ahead of inflation.">
                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Tooltip>
            </div>
            
            {formData.enableStepUp && (
              <div className="ml-12 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Annual Step-up Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="5"
                      max="25"
                      value={formData.stepUpRate}
                      onChange={(e) => handleInputChange('stepUpRate', Number(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600">
                    Your investment will increase by {formData.stepUpRate}% every year, helping you stay ahead of inflation and salary increments.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CompactCard>

      {/* Results */}
      {(results || isCalculating) && (
        <CompactCard title="SIP Calculation Results" variant="default">
          <div className="space-y-6">
            {isCalculating ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Calculating...</span>
              </div>
            ) : results && (
              <div className="animate-fade-in space-y-6">


                {/* Key Metrics */}
                <DataGrid
                  items={[
                    {
                      label: 'Monthly Investment',
                      value: `₹${results.monthlyAmount.toLocaleString('en-IN')}`,
                      color: 'info'
                    },
                    {
                      label: 'Total Investment',
                      value: `₹${results.totalInvestment.toLocaleString('en-IN')}`,
                      color: 'default'
                    },
                    {
                      label: 'Maturity Amount',
                      value: `₹${results.maturityAmount.toLocaleString('en-IN')}`,
                      color: 'success'
                    },
                    {
                      label: 'Total Gains',
                      value: `₹${results.totalGains.toLocaleString('en-IN')}`,
                      color: 'success'
                    }
                  ]}
                  columns={2}
                  variant="compact"
                />

                {/* Inflation Impact Summary */}
                {formData.enableInflationAdjustment && (
                  <InflationDisplay
                    nominalValue={results.maturityAmount}
                    inflationRate={formData.inflationRate}
                    years={formData.years}
                    onInflationRateChange={(rate) => handleInputChange('inflationRate', rate)}
                    title="Inflation Impact Summary"
                    nominalLabel="Final Wealth"
                    realLabel="Real Wealth (Today's Value)"
                    variant="default"
                    showToggle={true}
                    description="See how inflation affects your final wealth over time"
                  />
                )}

                {/* Additional Info */}
                {(results.inflationAdjustedAmount || results.stepUpRate) && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">Advanced Calculations Applied</h4>
                    <div className="space-y-2 text-sm">
                      {results.inflationAdjustedAmount && (
                        <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                          <span className="text-blue-700">
                            <strong>Inflation Adjusted:</strong> Target increased to maintain purchasing power
                          </span>
                          <div className="text-right">
                            <div className="text-xs text-blue-600">From: ₹{results.inflationAdjustedAmount.toLocaleString('en-IN')}</div>
                            <div className="text-xs text-blue-800 font-medium">To: ₹{results.targetAmount.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      )}
                      {results.stepUpRate && (
                        <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                          <span className="text-blue-700">
                            <strong>Step-up SIP:</strong> Investment increases annually
                          </span>
                          <span className="text-blue-800 font-medium">{results.stepUpRate}% per year</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
                  <Button
                    onClick={handleUseResults}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Create SIP with These Results
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="flex-1"
                  >
                    {showBreakdown ? 'Hide' : 'Show'} Investment Breakdown
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CompactCard>
      )}

      {/* Investment Breakdown */}
      {results && showBreakdown && (
        <CompactCard title="Investment Breakdown" variant="minimal">
          <div className="animate-fade-in space-y-4">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {breakdownView === 'monthly' ? 'Monthly' : 'Yearly'} Breakdown
              </h3>
              <div className="flex items-center space-x-3">
                <span className={`text-sm ${breakdownView === 'monthly' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  Monthly
                </span>
                <Toggle
                  checked={breakdownView === 'yearly'}
                  onChange={(checked) => setBreakdownView(checked ? 'yearly' : 'monthly')}
                  size="sm"
                />
                <span className={`text-sm ${breakdownView === 'yearly' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  Yearly
                </span>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {breakdownView === 'monthly' ? 'Month' : 'Year'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investment
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cumulative Investment
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Portfolio Value
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Gains
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(breakdownView === 'monthly' 
                    ? results.monthlyBreakdown 
                    : results.monthlyBreakdown.filter((_, index) => index % 12 === 11 || index === results.monthlyBreakdown.length - 1)
                  ).map((row, index) => (
                    <tr 
                      key={index} 
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {breakdownView === 'monthly' 
                          ? `Year ${row.year}, Month ${((row.month - 1) % 12) + 1}`
                          : `Year ${row.year}`
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        ₹{row.monthlyInvestment.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        ₹{row.cumulativeInvestment.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        ₹{row.cumulativeValue.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                        ₹{row.monthlyGain.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xs text-green-600 uppercase tracking-wide">Total Months</div>
                  <div className="text-lg font-bold text-green-800">{results.monthlyBreakdown.length}</div>
                </div>
                <div>
                  <div className="text-xs text-green-600 uppercase tracking-wide">Avg Monthly Investment</div>
                  <div className="text-lg font-bold text-green-800">
                    ₹{Math.round(results.totalInvestment / results.monthlyBreakdown.length).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-green-600 uppercase tracking-wide">Return Rate</div>
                  <div className="text-lg font-bold text-green-800">
                    {((results.totalGains / results.totalInvestment) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-green-600 uppercase tracking-wide">Wealth Multiplier</div>
                  <div className="text-lg font-bold text-green-800">
                    {(results.maturityAmount / results.totalInvestment).toFixed(1)}x
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CompactCard>
      )}
    </div>
  )
}