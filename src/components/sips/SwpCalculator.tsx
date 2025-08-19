'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input, Button, CompactCard, DataGrid, InflationDisplay } from '@/components/ui'

interface SwpCalculatorProps {
  onResults: (results: SwpCalculatorResults) => void
}

interface SwpCalculatorResults {
  initialInvestment: number
  monthlyWithdrawal: number
  years: number
  expectedReturn: number
  totalWithdrawals: number
  remainingAmount: number
  monthlyBreakdown: Array<{
    month: number
    year: number
    withdrawal: number
    portfolioValue: number
    cumulativeWithdrawals: number
  }>
}

export function SwpCalculator({ onResults }: SwpCalculatorProps) {
  const [calculationType, setCalculationType] = useState<'withdrawal' | 'duration'>('withdrawal')
  const [formData, setFormData] = useState({
    initialInvestment: 1000000,
    monthlyWithdrawal: 8000,
    years: 15,
    expectedReturn: 10,
    inflationRate: 6,
    enableInflationAdjustment: false
  })

  const [results, setResults] = useState<SwpCalculatorResults | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const handleInputChange = (field: string, value: number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const calculateSWP = useCallback(() => {
    const { initialInvestment, monthlyWithdrawal, years, expectedReturn, inflationRate, enableInflationAdjustment } = formData

    const monthlyRate = expectedReturn / 100 / 12
    const totalMonths = years * 12

    let calculatedWithdrawal: number
    let calculatedDuration: number

    if (calculationType === 'withdrawal') {
      // Calculate sustainable withdrawal amount
      calculatedWithdrawal = monthlyWithdrawal
      calculatedDuration = years
    } else {
      // Calculate how long the corpus will last
      calculatedWithdrawal = monthlyWithdrawal
      calculatedDuration = calculateSwpDuration(initialInvestment, monthlyWithdrawal, monthlyRate)
    }

    // Calculate breakdown
    const monthlyBreakdown = calculateSwpBreakdown(
      initialInvestment,
      calculatedWithdrawal,
      monthlyRate,
      Math.ceil(calculatedDuration * 12),
      enableInflationAdjustment ? inflationRate / 100 / 12 : 0
    )

    const totalWithdrawals = monthlyBreakdown.reduce((sum, month) => sum + month.withdrawal, 0)
    const remainingAmount = monthlyBreakdown[monthlyBreakdown.length - 1]?.portfolioValue || 0

    const calculatorResults: SwpCalculatorResults = {
      initialInvestment,
      monthlyWithdrawal: Math.round(calculatedWithdrawal),
      years: Math.round(calculatedDuration * 10) / 10, // Round to 1 decimal
      expectedReturn,
      totalWithdrawals: Math.round(totalWithdrawals),
      remainingAmount: Math.round(remainingAmount),
      monthlyBreakdown
    }

    setResults(calculatorResults)
  }, [formData, calculationType])

  const calculateSwpDuration = (corpus: number, withdrawal: number, monthlyRate: number): number => {
    let remainingCorpus = corpus
    let months = 0

    while (remainingCorpus > withdrawal && months < 600) { // Max 50 years
      remainingCorpus = (remainingCorpus * (1 + monthlyRate)) - withdrawal
      months++
    }

    return months / 12
  }

  const calculateSwpBreakdown = (
    initialAmount: number,
    monthlyWithdrawal: number,
    monthlyRate: number,
    totalMonths: number,
    inflationRate: number
  ): SwpCalculatorResults['monthlyBreakdown'] => {
    const breakdown: SwpCalculatorResults['monthlyBreakdown'] = []
    let portfolioValue = initialAmount
    let cumulativeWithdrawals = 0
    let currentWithdrawal = monthlyWithdrawal

    for (let month = 1; month <= totalMonths; month++) {
      // Adjust withdrawal for inflation annually
      if (inflationRate > 0 && month > 1 && (month - 1) % 12 === 0) {
        currentWithdrawal = currentWithdrawal * (1 + inflationRate * 12)
      }

      // Apply returns first, then withdraw
      portfolioValue = portfolioValue * (1 + monthlyRate)

      // Check if we can make the withdrawal
      if (portfolioValue < currentWithdrawal) {
        currentWithdrawal = portfolioValue
        portfolioValue = 0
      } else {
        portfolioValue -= currentWithdrawal
      }

      cumulativeWithdrawals += currentWithdrawal

      breakdown.push({
        month,
        year: Math.ceil(month / 12),
        withdrawal: Math.round(currentWithdrawal),
        portfolioValue: Math.round(portfolioValue),
        cumulativeWithdrawals: Math.round(cumulativeWithdrawals)
      })

      // Stop if portfolio is exhausted
      if (portfolioValue <= 0) {
        break
      }
    }

    return breakdown
  }

  const handleCalculate = () => {
    calculateSWP()
  }

  const handleUseResults = () => {
    if (results) {
      // For SWP, we create a reverse SIP (negative amount)
      const swpResults = {
        ...results,
        amount: -results.monthlyWithdrawal, // Negative for withdrawal
        frequency: 'MONTHLY' as const,
        targetDate: new Date(Date.now() + results.years * 365 * 24 * 60 * 60 * 1000)
      }
      onResults(swpResults)
    }
  }

  // Auto-calculate when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateSWP()
    }, 500)

    return () => clearTimeout(timer)
  }, [calculateSWP])

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
              value="withdrawal"
              checked={calculationType === 'withdrawal'}
              onChange={(e) => setCalculationType(e.target.value as 'withdrawal' | 'duration')}
              className="mr-2"
            />
            Sustainable withdrawal for given period
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="duration"
              checked={calculationType === 'duration'}
              onChange={(e) => setCalculationType(e.target.value as 'withdrawal' | 'duration')}
              className="mr-2"
            />
            How long corpus will last
          </label>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Investment (₹)
          </label>
          <Input
            type="number"
            step="50000"
            min="100000"
            value={formData.initialInvestment}
            onChange={(e) => handleInputChange('initialInvestment', Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Withdrawal (₹)
          </label>
          <Input
            type="number"
            step="1000"
            min="1000"
            value={formData.monthlyWithdrawal}
            onChange={(e) => handleInputChange('monthlyWithdrawal', Number(e.target.value))}
          />
        </div>

        {calculationType === 'withdrawal' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Period (Years)
            </label>
            <Input
              type="number"
              step="1"
              min="1"
              max="50"
              value={formData.years}
              onChange={(e) => handleInputChange('years', Number(e.target.value))}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected Annual Return (%)
          </label>
          <Input
            type="number"
            step="0.5"
            min="1"
            max="25"
            value={formData.expectedReturn}
            onChange={(e) => handleInputChange('expectedReturn', Number(e.target.value))}
          />
        </div>
      </div>

      {/* Advanced Options */}
      <CompactCard title="Advanced Options" variant="minimal">
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.enableInflationAdjustment}
              onChange={(e) => handleInputChange('enableInflationAdjustment', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">
              Increase withdrawal amount annually for inflation
            </span>
          </label>
          {formData.enableInflationAdjustment && (
            <div className="mt-2 ml-6">
              <label className="block text-sm text-gray-600 mb-1">
                Expected Inflation Rate (%)
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="15"
                value={formData.inflationRate}
                onChange={(e) => handleInputChange('inflationRate', Number(e.target.value))}
                className="w-32"
              />
            </div>
          )}
        </div>
      </CompactCard>

      {/* Results */}
      {results && (
        <CompactCard title="SWP Calculation Results" variant="default">
          <div className="space-y-4">
            {/* Key Metrics */}
            <DataGrid
              items={[
                {
                  label: 'Initial Investment',
                  value: `₹${results.initialInvestment.toLocaleString('en-IN')}`,
                  color: 'info'
                },
                {
                  label: 'Monthly Withdrawal',
                  value: `₹${results.monthlyWithdrawal.toLocaleString('en-IN')}`,
                  color: 'default'
                },
                {
                  label: 'Duration',
                  value: `${results.years} years`,
                  color: 'default'
                },
                {
                  label: 'Total Withdrawals',
                  value: `₹${results.totalWithdrawals.toLocaleString('en-IN')}`,
                  color: 'success'
                }
              ]}
              columns={4}
              variant="compact"
            />

            {/* Additional Info */}
            <div className="bg-green-50 p-3 rounded-lg text-sm">
              <div>
                <strong>Remaining Amount:</strong> ₹{results.remainingAmount.toLocaleString('en-IN')} will remain after {results.years} years
              </div>
              <div className="mt-1">
                <strong>Withdrawal Rate:</strong> {((results.monthlyWithdrawal * 12 / results.initialInvestment) * 100).toFixed(2)}% per annum
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleUseResults}
                className="flex-1"
              >
                Create SWP with These Results
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="flex-1"
              >
                {showBreakdown ? 'Hide' : 'Show'} Yearly Breakdown
              </Button>
            </div>
          </div>
        </CompactCard>
      )}

      {/* Yearly Breakdown */}
      {results && showBreakdown && (
        <CompactCard title="Yearly Withdrawal Breakdown" variant="minimal">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monthly Withdrawal</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Annual Withdrawal</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Portfolio Value</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cumulative Withdrawals</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.monthlyBreakdown.filter((_, index) => index % 12 === 11 || index === results.monthlyBreakdown.length - 1).map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.year}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{row.withdrawal.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{(row.withdrawal * 12).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{row.portfolioValue.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-sm text-blue-600 text-right">₹{row.cumulativeWithdrawals.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CompactCard>
      )}
    </div>
  )
}