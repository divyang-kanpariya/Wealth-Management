'use client'

import { useState } from 'react'
import { SIPWithCurrentValue, SIPStatus } from '@/types'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'

interface SipCardProps {
  sipWithValue: SIPWithCurrentValue
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: SIPStatus) => void
}

export function SipCard({ sipWithValue, onEdit, onDelete, onStatusChange }: SipCardProps) {
  const { sip, totalInvested, totalUnits, currentValue, averageNAV, gainLoss, gainLossPercentage, nextTransactionDate } = sipWithValue
  const [showTransactions, setShowTransactions] = useState(false)

  const getStatusColor = (status: SIPStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'MONTHLY':
        return 'Monthly'
      case 'QUARTERLY':
        return 'Quarterly'
      case 'YEARLY':
        return 'Yearly'
      default:
        return frequency
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{sip.name}</h3>
          <p className="text-sm text-gray-600">Symbol: {sip.symbol}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sip.status)}`}>
            {sip.status}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-600">Amount</div>
          <div className="text-lg font-semibold">₹{sip.amount.toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500">{getFrequencyText(sip.frequency)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Current Value</div>
          <div className="text-lg font-semibold">₹{currentValue.toLocaleString('en-IN')}</div>
          <div className={`text-xs ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {gainLoss >= 0 ? '+' : ''}₹{gainLoss.toLocaleString('en-IN')} ({gainLossPercentage.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Investment Details */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <div className="text-gray-600">Invested</div>
          <div className="font-medium">₹{totalInvested.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div className="text-gray-600">Units</div>
          <div className="font-medium">{totalUnits.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-gray-600">Avg NAV</div>
          <div className="font-medium">₹{averageNAV.toFixed(2)}</div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-gray-600">Start Date</div>
          <div className="font-medium">{formatDate(sip.startDate)}</div>
        </div>
        <div>
          <div className="text-gray-600">
            {nextTransactionDate ? 'Next Transaction' : 'End Date'}
          </div>
          <div className="font-medium">
            {nextTransactionDate 
              ? formatDate(nextTransactionDate)
              : sip.endDate 
                ? formatDate(sip.endDate)
                : 'No end date'
            }
          </div>
        </div>
      </div>

      {/* Goal and Account */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-gray-600">Goal</div>
          <div className="font-medium">{sip.goal?.name || 'No goal assigned'}</div>
        </div>
        <div>
          <div className="text-gray-600">Account</div>
          <div className="font-medium">{sip.account?.name || 'Unknown account'}</div>
        </div>
      </div>

      {/* Notes */}
      {sip.notes && (
        <div className="mb-4">
          <div className="text-sm text-gray-600">Notes</div>
          <div className="text-sm text-gray-800">{sip.notes}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
        >
          Edit
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTransactions(!showTransactions)}
        >
          {showTransactions ? 'Hide' : 'Show'} Transactions
        </Button>

        {sip.status === 'ACTIVE' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange('PAUSED')}
          >
            Pause
          </Button>
        )}

        {sip.status === 'PAUSED' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange('ACTIVE')}
          >
            Resume
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Delete
        </Button>
      </div>

      {/* Transaction History */}
      {showTransactions && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Transactions</h4>
          {sip.transactions && sip.transactions.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sip.transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                  <div>
                    <div className="font-medium">{formatDate(transaction.transactionDate)}</div>
                    <div className="text-gray-600">
                      ₹{transaction.amount.toLocaleString('en-IN')} @ ₹{transaction.nav.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{transaction.units.toFixed(3)} units</div>
                    <div className={`text-xs ${
                      transaction.status === 'COMPLETED' ? 'text-green-600' : 
                      transaction.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              No transactions yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}