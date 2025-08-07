'use client'

import { useState } from 'react'
import { SIPSummary, SIPWithCurrentValue, SIPTransaction } from '@/types'
import { Button, CompactCard, DataGrid, ErrorState } from '@/components/ui'

interface SipDashboardData {
  summary: SIPSummary
  sipsByStatus: Record<string, number>
  sipsByFrequency: Record<string, number>
  topPerformers: SIPWithCurrentValue[]
  bottomPerformers: SIPWithCurrentValue[]
  recentTransactions: (SIPTransaction & { sip: { name: string; symbol: string } })[]
}

interface SipDashboardProps {
  data?: SipDashboardData
}

export function SipDashboard({ data }: SipDashboardProps) {
  // Provide default empty data if not provided
  const defaultData: SipDashboardData = {
    summary: {
      totalSIPs: 0,
      activeSIPs: 0,
      totalMonthlyAmount: 0,
      totalInvested: 0,
      totalCurrentValue: 0,
      totalGainLoss: 0,
      totalGainLossPercentage: 0
    },
    sipsByStatus: {},
    sipsByFrequency: {},
    topPerformers: [],
    bottomPerformers: [],
    recentTransactions: []
  }
  
  const sipData = data || defaultData
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processSips = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/sips/process', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to process SIPs')
      }

      const result = await response.json()
      
      // Show result to user
      alert(`Processed ${result.processed} SIPs successfully. ${result.errors} errors occurred.`)
      
      // Refresh the page to get updated data
      window.location.reload()
    } catch (error) {
      console.error('Error processing SIPs:', error)
      setError(error instanceof Error ? error.message : 'Failed to process SIPs')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`
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
      <ErrorState
        title="Failed to process SIPs"
        message={error}
        onRetry={() => setError(null)}
      />
    )
  }

  const { summary, sipsByStatus, sipsByFrequency, topPerformers, bottomPerformers, recentTransactions } = sipData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SIP Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your systematic investment plans
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={processSips}
            disabled={processing}
            variant="outline"
          >
            {processing ? 'Processing...' : 'Process Due SIPs'}
          </Button>
          <Button onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <CompactCard title="SIP Portfolio Overview" variant="minimal">
        <DataGrid
          items={[
            {
              label: 'Total SIPs',
              value: summary.totalSIPs.toString(),
              subValue: `${summary.activeSIPs} active`,
              color: 'info'
            },
            {
              label: 'Monthly Investment',
              value: formatCurrency(summary.totalMonthlyAmount),
              subValue: 'Equivalent monthly amount',
              color: 'default'
            },
            {
              label: 'Total Invested',
              value: formatCurrency(summary.totalInvested),
              subValue: 'Across all SIPs',
              color: 'default'
            },
            {
              label: 'Current Value',
              value: formatCurrency(summary.totalCurrentValue),
              subValue: `${summary.totalGainLoss >= 0 ? '+' : ''}${formatCurrency(summary.totalGainLoss)} (${formatPercentage(summary.totalGainLossPercentage)})`,
              color: summary.totalGainLoss >= 0 ? 'success' : 'danger'
            }
          ]}
          columns={4}
          variant="compact"
        />
      </CompactCard>

      {/* Status and Frequency Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompactCard title="SIPs by Status">
          <DataGrid
            items={Object.entries(sipsByStatus).map(([status, count]) => ({
              label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
              value: count.toString(),
              color: status === 'ACTIVE' ? 'success' : status === 'PAUSED' ? 'warning' : 'default'
            }))}
            columns={1}
            variant="default"
          />
        </CompactCard>

        <CompactCard title="SIPs by Frequency">
          <DataGrid
            items={Object.entries(sipsByFrequency).map(([frequency, count]) => ({
              label: frequency.charAt(0).toUpperCase() + frequency.slice(1).toLowerCase(),
              value: count.toString(),
              color: 'info'
            }))}
            columns={1}
            variant="default"
          />
        </CompactCard>
      </div>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompactCard title="Top Performers" className="border-green-200">
          {topPerformers.length > 0 ? (
            <div className="space-y-3">
              {topPerformers.map((sipWithValue) => (
                <div key={sipWithValue.sip.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{sipWithValue.sip.name}</div>
                    <div className="text-sm text-gray-600">{sipWithValue.sip.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-semibold">
                      +{formatPercentage(sipWithValue.gainLossPercentage)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(sipWithValue.gainLoss)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </CompactCard>

        <CompactCard title="Bottom Performers" className="border-red-200">
          {bottomPerformers.length > 0 ? (
            <div className="space-y-3">
              {bottomPerformers.map((sipWithValue) => (
                <div key={sipWithValue.sip.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{sipWithValue.sip.name}</div>
                    <div className="text-sm text-gray-600">{sipWithValue.sip.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-600 font-semibold">
                      {formatPercentage(sipWithValue.gainLossPercentage)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(sipWithValue.gainLoss)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </CompactCard>
      </div>

      {/* Recent Transactions */}
      <CompactCard title="Recent Transactions">
        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">SIP</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">NAV</th>
                  <th className="text-right py-2">Units</th>
                  <th className="text-center py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100">
                    <td className="py-2">{formatDate(transaction.transactionDate)}</td>
                    <td className="py-2">
                      <div className="font-medium">{transaction.sip.name}</div>
                      <div className="text-gray-600">{transaction.sip.symbol}</div>
                    </td>
                    <td className="py-2 text-right">{formatCurrency(transaction.amount)}</td>
                    <td className="py-2 text-right">₹{transaction.nav.toFixed(2)}</td>
                    <td className="py-2 text-right">{transaction.units.toFixed(3)}</td>
                    <td className="py-2 text-center">
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
    </div>
  )
}