'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SIP, Goal, Account, SIPFrequency, SIPStatus, SIPWithCurrentValue } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

interface SipFormProps {
  sip?: SIP
  goals: Goal[]
  accounts: Account[]
  onSubmit?: (sipWithValue: SIPWithCurrentValue) => void
  onCancel?: () => void
}

export function SipForm({ sip, goals, accounts, onSubmit, onCancel }: SipFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: sip?.name || '',
    symbol: sip?.symbol || '',
    amount: sip?.amount?.toString() || '',
    frequency: sip?.frequency || 'MONTHLY' as SIPFrequency,
    startDate: sip?.startDate ? new Date(sip.startDate).toISOString().split('T')[0] : '',
    endDate: sip?.endDate ? new Date(sip.endDate).toISOString().split('T')[0] : '',
    status: sip?.status || 'ACTIVE' as SIPStatus,
    goalId: sip?.goalId || '',
    accountId: sip?.accountId || '',
    notes: sip?.notes || '',
  })



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        goalId: formData.goalId || null,
      }

      const url = sip ? `/api/sips/${sip.id}` : '/api/sips'
      const method = sip ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save SIP')
      }

      const savedSip = await response.json()

      if (onSubmit) {
        onSubmit(savedSip)
      } else {
        router.push('/sips')
      }
    } catch (error) {
      console.error('Error saving SIP:', error)
      setError(error instanceof Error ? error.message : 'Failed to save SIP')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">
        {sip ? 'Edit SIP' : 'Create New SIP'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
              Symbol *
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
              Amount *
            </label>
            <Input
              type="number"
              step="0.01"
              min="1"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="5000"
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

          {sip && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <Select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'PAUSED', label: 'Paused' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' }
                ]}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal (Optional)
            </label>
            <Select
              value={formData.goalId}
              onChange={(e) => handleInputChange('goalId', e.target.value)}
              options={[
                { value: '', label: 'Select a goal' },
                ...goals.map((goal) => ({
                  value: goal.id,
                  label: goal.name
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

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : (sip ? 'Update SIP' : 'Create SIP')}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onCancel || (() => router.back())}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}