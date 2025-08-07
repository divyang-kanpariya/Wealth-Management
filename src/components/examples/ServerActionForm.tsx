'use client'

import { useState, useTransition } from 'react'
import { createInvestment, updateInvestment, deleteInvestment } from '@/lib/server/actions'
import type { InvestmentActionResult } from '@/lib/server/actions'

interface ServerActionFormProps {
  investment?: any // Would be properly typed in real usage
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * Example component showing how to use server actions
 * This replaces the old pattern of making fetch calls to API routes
 */
export function ServerActionForm({ investment, onSuccess, onCancel }: ServerActionFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Handle form submission using server actions
  const handleSubmit = async (formData: FormData) => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      let result: InvestmentActionResult

      if (investment) {
        // Update existing investment
        result = await updateInvestment(investment.id, formData)
      } else {
        // Create new investment
        result = await createInvestment(formData)
      }

      if (result.success) {
        setSuccess(investment ? 'Investment updated successfully!' : 'Investment created successfully!')
        onSuccess?.()
      } else {
        setError(result.error || 'An error occurred')
      }
    })
  }

  // Handle deletion using server actions
  const handleDelete = async () => {
    if (!investment) return

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await deleteInvestment(investment.id)

      if (result.success) {
        setSuccess('Investment deleted successfully!')
        onSuccess?.()
      } else {
        setError(result.error || 'Failed to delete investment')
      }
    })
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        {investment ? 'Edit Investment' : 'Create Investment'}
      </h2>

      {/* Error and success messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Form using server action */}
      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Investment Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={investment?.name || ''}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={investment?.type || 'STOCK'}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="STOCK">Stock</option>
            <option value="MUTUAL_FUND">Mutual Fund</option>
            <option value="CRYPTO">Crypto</option>
            <option value="REAL_ESTATE">Real Estate</option>
            <option value="GOLD">Gold</option>
            <option value="FD">Fixed Deposit</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
            Symbol
          </label>
          <input
            type="text"
            id="symbol"
            name="symbol"
            defaultValue={investment?.symbol || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="units" className="block text-sm font-medium text-gray-700">
            Units
          </label>
          <input
            type="number"
            id="units"
            name="units"
            step="0.01"
            defaultValue={investment?.units || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="buyPrice" className="block text-sm font-medium text-gray-700">
            Buy Price
          </label>
          <input
            type="number"
            id="buyPrice"
            name="buyPrice"
            step="0.01"
            defaultValue={investment?.buyPrice || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="totalValue" className="block text-sm font-medium text-gray-700">
            Total Value
          </label>
          <input
            type="number"
            id="totalValue"
            name="totalValue"
            step="0.01"
            defaultValue={investment?.totalValue || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="buyDate" className="block text-sm font-medium text-gray-700">
            Buy Date
          </label>
          <input
            type="date"
            id="buyDate"
            name="buyDate"
            defaultValue={investment?.buyDate ? new Date(investment.buyDate).toISOString().split('T')[0] : ''}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">
            Account ID
          </label>
          <input
            type="text"
            id="accountId"
            name="accountId"
            defaultValue={investment?.accountId || ''}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="goalId" className="block text-sm font-medium text-gray-700">
            Goal ID (Optional)
          </label>
          <input
            type="text"
            id="goalId"
            name="goalId"
            defaultValue={investment?.goalId || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={investment?.notes || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving...' : (investment ? 'Update' : 'Create')}
          </button>

          {investment && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}