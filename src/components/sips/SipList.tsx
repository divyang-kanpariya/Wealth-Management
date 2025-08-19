'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SIPWithCurrentValue, SIPStatus, SIPFrequency, Goal, Account, SIPSummary } from '@/types'
import { SIPsPageData } from '@/lib/server/data-preparators'
import { 
  Button, 
  Select, 
  Input, 
  Modal, 
  CompactCard, 
  DataGrid, 
  ErrorState,
  QuickActions 
} from '@/components/ui'
import { SipForm } from './SipForm'
import SipTable from './SipTable'

interface SipListProps {
  data: SIPsPageData
}

export function SipList({ data }: SipListProps) {
  const router = useRouter()
  const [sips, setSips] = useState<SIPWithCurrentValue[]>(data.sipsWithValues)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSip, setEditingSip] = useState<SIPWithCurrentValue | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [frequencyFilter, setFrequencyFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const refreshSips = () => {
    // Trigger a page refresh to get updated data from server
    window.location.reload()
  }

  const handleCreateSip = (newSip: SIPWithCurrentValue) => {
    setSips(prev => [newSip, ...prev])
    setShowCreateForm(false)
  }

  const handleUpdateSip = (updatedSip: SIPWithCurrentValue) => {
    setSips(prev => prev.map(sip => 
      sip.sip.id === updatedSip.sip.id ? updatedSip : sip
    ))
    setEditingSip(null)
  }

  const handleViewDetails = (sipWithValue: SIPWithCurrentValue) => {
    router.push(`/sips/${sipWithValue.sip.id}`)
  }

  const handleCreateNew = () => {
    router.push('/sips/create')
  }

  const handleDeleteSip = async (sipId: string) => {
    if (!confirm('Are you sure you want to delete this SIP? This will also delete all transaction history.')) {
      return
    }

    try {
      const response = await fetch(`/api/sips/${sipId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete SIP')
      }

      setSips(prev => prev.filter(sip => sip.sip.id !== sipId))
    } catch (error) {
      console.error('Error deleting SIP:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete SIP')
    }
  }

  const handleStatusChange = async (sipId: string, newStatus: SIPStatus) => {
    try {
      const response = await fetch(`/api/sips/${sipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update SIP status')
      }

      const updatedSip = await response.json()
      setSips(prev => prev.map(sip => 
        sip.sip.id === sipId ? updatedSip : sip
      ))
    } catch (error) {
      console.error('Error updating SIP status:', error)
      setError(error instanceof Error ? error.message : 'Failed to update SIP status')
    }
  }

  // Filter SIPs based on current filters
  const filteredSips = sips.filter(sipWithValue => {
    const sip = sipWithValue.sip
    
    // Status filter
    if (statusFilter !== 'ALL' && sip.status !== statusFilter) {
      return false
    }
    
    // Frequency filter
    if (frequencyFilter !== 'ALL' && sip.frequency !== frequencyFilter) {
      return false
    }
    
    // Search filter
    if (searchTerm && !sip.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !sip.symbol.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    return true
  })

  // Calculate filtered summary stats
  const totalSips = filteredSips.length
  const activeSips = filteredSips.filter(s => s.sip.status === 'ACTIVE').length
  const totalInvested = filteredSips.reduce((sum, s) => sum + s.totalInvested, 0)
  const totalCurrentValue = filteredSips.reduce((sum, s) => sum + s.currentValue, 0)
  const totalGainLoss = totalCurrentValue - totalInvested



  return (
    <div className="space-y-4">
      {/* Header Card */}
      <CompactCard
        title="My SIPs"
        badge={totalSips}
        variant="default"
        actions={
          <QuickActions
            actions={[
              {
                id: 'create-sip',
                label: 'Create SIP',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                ),
                onClick: handleCreateNew,
                variant: 'primary'
              },
              {
                id: 'refresh',
                label: 'Refresh',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                onClick: refreshSips,
                variant: 'secondary'
              }
            ]}
            size="sm"
            layout="horizontal"
          />
        }
      >
        <div className="text-sm text-gray-600">
          {activeSips} active • {totalSips - activeSips} inactive
        </div>
      </CompactCard>

      {/* Summary Cards */}
      <CompactCard title="SIP Portfolio Summary" variant="minimal">
        <DataGrid
          items={[
            {
              label: 'Total Invested',
              value: `₹${totalInvested.toLocaleString('en-IN')}`,
              color: 'info'
            },
            {
              label: 'Current Value',
              value: `₹${totalCurrentValue.toLocaleString('en-IN')}`,
              color: 'default'
            },
            {
              label: 'Total Gain/Loss',
              value: `₹${totalGainLoss.toLocaleString('en-IN')}`,
              color: totalGainLoss >= 0 ? 'success' : 'danger'
            },
            {
              label: 'Return %',
              value: `${totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100).toFixed(2) : '0.00'}%`,
              color: totalGainLoss >= 0 ? 'success' : 'danger'
            }
          ]}
          columns={4}
          variant="compact"
        />
      </CompactCard>

      {/* Filters */}
      <CompactCard title="Filters & Search">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Search"
            placeholder="Search by name or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PAUSED', label: 'Paused' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]}
          />
          
          <Select
            label="Frequency"
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Frequencies' },
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'QUARTERLY', label: 'Quarterly' },
              { value: 'YEARLY', label: 'Yearly' }
            ]}
          />
          
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={refreshSips}
              className="w-full"
            >
              Refresh
            </Button>
          </div>
        </div>
      </CompactCard>

      {/* Error Message */}
      {error && (
        <ErrorState
          title="Failed to load SIPs"
          message={error}
          onRetry={refreshSips}
        />
      )}

      {/* SIP Display */}
      {filteredSips.length === 0 ? (
        <CompactCard variant="minimal">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {sips.length === 0 ? 'No SIPs yet' : 'No SIPs match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {sips.length === 0 
                ? 'Get started by creating your first systematic investment plan.' 
                : 'Try adjusting your filters to see more results.'
              }
            </p>
            {sips.length === 0 && (
              <Button onClick={handleCreateNew}>Create Your First SIP</Button>
            )}
          </div>
        </CompactCard>
      ) : (
        <SipTable
          sips={filteredSips}
          onEdit={setEditingSip}
          onDelete={handleDeleteSip}
          onViewDetails={handleViewDetails}
          onStatusChange={handleStatusChange}
          isLoading={false}
        />
      )}

      {/* Create SIP Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Create New SIP"
      >
        <SipForm
          goals={data.goals}
          accounts={data.accounts}
          onSubmit={handleCreateSip}
          onCancel={() => setShowCreateForm(false)}
        />
      </Modal>

      {/* Edit SIP Modal */}
      <Modal
        isOpen={!!editingSip}
        onClose={() => setEditingSip(null)}
        title="Edit SIP"
      >
        {editingSip && (
          <SipForm
            sip={editingSip.sip}
            goals={data.goals}
            accounts={data.accounts}
            onSubmit={handleUpdateSip}
            onCancel={() => setEditingSip(null)}
          />
        )}
      </Modal>
    </div>
  )
}