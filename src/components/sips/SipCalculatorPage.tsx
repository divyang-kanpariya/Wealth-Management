'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Goal, Account } from '@/types'
import { Button, Input, Select, CompactCard, DataGrid } from '@/components/ui'
import { SipCalculator } from './SipCalculator'
import { SwpCalculator } from './SwpCalculator'

interface SipCalculatorPageProps {
  goals: Goal[]
  accounts: Account[]
}

export function SipCalculatorPage({ goals, accounts }: SipCalculatorPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'sip' | 'swp'>('sip')
  const [calculatorResults, setCalculatorResults] = useState<any>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // SIP Creation Form Data
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    goalId: '',
    accountId: '',
    notes: '',
    // These will be populated from calculator results
    amount: 0,
    frequency: 'MONTHLY' as const,
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  })

  const handleCalculatorResults = (results: any) => {
    setCalculatorResults(results)
    setShowCreateForm(true)
    
    // Pre-populate form with calculator results
    setFormData(prev => ({
      ...prev,
      amount: results.monthlyAmount || results.amount || 0,
      frequency: results.frequency || 'MONTHLY',
      endDate: results.targetDate ? new Date(results.targetDate).toISOString().split('T')[0] : ''
    }))
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCreateSip = async () => {
    if (!calculatorResults) return

    setLoading(true)
    setError(null)

    try {
      const submitData = {
        ...formData,
        amount: Number(formData.amount),
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        goalId: formData.goalId || null,
        status: 'ACTIVE'
      }

      const response = await fetch('/api/sips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create SIP')
      }

      // Redirect to SIPs page
      router.push('/sips')
    } catch (error) {
      console.error('Error creating SIP:', error)
      setError(error instanceof Error ? error.message : 'Failed to create SIP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            SIP & SWP Calculator
          </h1>
          <p className="text-gray-600 mt-1">
            Calculate your systematic investment plan and create SIPs directly
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/sips')}
        >
          Back to SIPs
        </Button>
      </div>

      {/* Calculator Tabs */}
      <CompactCard title="Calculator" variant="minimal">
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('sip')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sip'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              SIP Calculator
            </button>
            <button
              onClick={() => setActiveTab('swp')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'swp'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              SWP Calculator
            </button>
          </div>

          {/* Calculator Content */}
          <div className="mt-6">
            {activeTab === 'sip' ? (
              <SipCalculator onResults={handleCalculatorResults} />
            ) : (
              <SwpCalculator onResults={handleCalculatorResults} />
            )}
          </div>
        </div>
      </CompactCard>

      {/* Create SIP Form */}
      {showCreateForm && calculatorResults && (
        <CompactCard title="Create SIP from Calculator Results" variant="default">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Calculator Results Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Calculator Results</h3>
              <DataGrid
                items={[
                  {
                    label: 'Monthly Amount',
                    value: `₹${calculatorResults.monthlyAmount?.toLocaleString('en-IN') || 'N/A'}`,
                    color: 'info'
                  },
                  {
                    label: 'Target Amount',
                    value: `₹${calculatorResults.targetAmount?.toLocaleString('en-IN') || 'N/A'}`,
                    color: 'default'
                  },
                  {
                    label: 'Duration',
                    value: `${calculatorResults.years || 'N/A'} years`,
                    color: 'default'
                  },
                  {
                    label: 'Expected Return',
                    value: `${calculatorResults.expectedReturn || 'N/A'}% p.a.`,
                    color: 'success'
                  }
                ]}
                columns={4}
                variant="compact"
              />
            </div>

            {/* SIP Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SIP Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., HDFC Top 100 SIP"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbol/Scheme Code *
                </label>
                <Input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value)}
                  placeholder="e.g., 120716"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Amount *
                </label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency *
                </label>
                <Select
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                  required
                  options={[
                    { value: 'MONTHLY', label: 'Monthly' },
                    { value: 'QUARTERLY', label: 'Quarterly' },
                    { value: 'YEARLY', label: 'Yearly' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Goal (Optional)
                </label>
                <Select
                  value={formData.goalId}
                  onChange={(e) => handleInputChange('goalId', e.target.value)}
                  options={[
                    { value: '', label: 'Select a goal' },
                    ...goals.map((goal) => ({
                      value: goal.id,
                      label: `${goal.name} (₹${goal.targetAmount.toLocaleString('en-IN')})`
                    }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account *
                </label>
                <Select
                  value={formData.accountId}
                  onChange={(e) => handleInputChange('accountId', e.target.value)}
                  required
                  options={[
                    { value: '', label: 'Select an account' },
                    ...accounts.map((account) => ({
                      value: account.id,
                      label: account.name
                    }))
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes about this SIP..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <Button
                onClick={handleCreateSip}
                disabled={loading || !formData.name || !formData.symbol || !formData.accountId}
                className="flex-1"
              >
                {loading ? 'Creating SIP...' : 'Create SIP'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CompactCard>
      )}
    </div>
  )
}