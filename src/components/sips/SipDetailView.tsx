'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SIPDetailPageData } from '@/lib/server/data-preparators/sip-detail'
import { SIPWithCurrentValue } from '@/types'
import { Button, Modal, CompactCard, DataGrid } from '@/components/ui'
import { SipForm } from '@/components/sips'

interface SipDetailViewProps {
  data: SIPDetailPageData
}

export function SipDetailView({ data }: SipDetailViewProps) {
  const router = useRouter()
  const [showEditForm, setShowEditForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { sip, sipWithValue, transactions, goals, accounts } = data
  const { totalInvested, totalUnits, currentValue, averageNAV, gainLoss, gainLossPercentage, nextTransactionDate } = sipWithValue

  const handleUpdateSip = (updatedSipWithValue: SIPWithCurrentValue) => {
    setShowEditForm(false)
    // Refresh the page to get updated data
    router.refresh()
  }

  const handleDeleteSip = async () => {
    if (!confirm('Are you sure you want to delete this SIP? This will also delete all transaction history.')) {
      return
    }

    try {
      const response = await fetch(`/api/sips/${sip.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete SIP')
      }

      router.push('/sips')
    } catch (error) {
      console.error('Error deleting SIP:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete SIP')
    }
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <div>
          <Button onClick={() => router.push('/sips')}>
            Back to SIPs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <CompactCard 
        title={sip.name}
        subtitle={`Symbol: ${sip.symbol}`}
        badge={sip.status}
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/sips')}
            >
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditForm(true)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSip}
              className="text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        }
      >
        {/* Key Metrics */}
        <DataGrid
          items={[
            {
              label: 'SIP Amount',
              value: formatCurrency(sip.amount),
              subValue: sip.frequency.toLowerCase(),
              color: 'info'
            },
            {
              label: 'Total Invested',
              value: formatCurrency(totalInvested),
              subValue: `${totalUnits.toFixed(3)} units`,
              color: 'default'
            },
            {
              label: 'Current Value',
              value: formatCurrency(currentValue),
              subValue: `Avg NAV: ₹${averageNAV.toFixed(2)}`,
              color: 'default'
            },
            {
              label: 'Gain/Loss',
              value: `${gainLoss >= 0 ? '+' : ''}${formatCurrency(gainLoss)}`,
              subValue: `${gainLossPercentage.toFixed(2)}%`,
              color: gainLoss >= 0 ? 'success' : 'danger'
            }
          ]}
          columns={4}
          variant="compact"
        />
      </CompactCard>

      {/* SIP Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompactCard title="SIP Details">
          <DataGrid
            items={[
              {
                label: 'Start Date',
                value: formatDate(sip.startDate)
              },
              {
                label: 'End Date',
                value: sip.endDate ? formatDate(sip.endDate) : 'No end date'
              },
              {
                label: 'Next Transaction',
                value: nextTransactionDate ? formatDate(nextTransactionDate) : 'N/A'
              },
              {
                label: 'Goal',
                value: sip.goal?.name || 'No goal assigned'
              },
              {
                label: 'Account',
                value: sip.account?.name || 'Unknown account'
              }
            ]}
            columns={1}
            variant="default"
          />
          {sip.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">Notes</div>
              <div className="text-gray-800 mt-1">{sip.notes}</div>
            </div>
          )}
        </CompactCard>

        <CompactCard title="Performance Summary">
          <DataGrid
            items={[
              {
                label: 'Total Transactions',
                value: transactions.length.toString(),
                color: 'info'
              },
              {
                label: 'Average NAV',
                value: `₹${averageNAV.toFixed(2)}`,
                color: 'default'
              },
              {
                label: 'Total Units',
                value: totalUnits.toFixed(3),
                color: 'default'
              },
              {
                label: 'Return %',
                value: `${gainLossPercentage.toFixed(2)}%`,
                color: gainLoss >= 0 ? 'success' : 'danger'
              }
            ]}
            columns={1}
            variant="default"
          />
        </CompactCard>
      </div>

      {/* Transaction History */}
      <CompactCard title="Transaction History">
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3">Date</th>
                  <th className="text-right py-3">Amount</th>
                  <th className="text-right py-3">NAV</th>
                  <th className="text-right py-3">Units</th>
                  <th className="text-center py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100">
                    <td className="py-3">{formatDate(transaction.transactionDate)}</td>
                    <td className="py-3 text-right">{formatCurrency(transaction.amount)}</td>
                    <td className="py-3 text-right">₹{transaction.nav.toFixed(2)}</td>
                    <td className="py-3 text-right">{transaction.units.toFixed(3)}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-600">No transactions yet</p>
          </div>
        )}
      </CompactCard>

      {/* Edit SIP Modal */}
      <Modal
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        title="Edit SIP"
      >
        <SipForm
          sip={sip}
          goals={goals}
          accounts={accounts}
          onSubmit={handleUpdateSip}
          onCancel={() => setShowEditForm(false)}
        />
      </Modal>
    </div>
  )
}