'use client'

import { useState } from 'react'
import { SIPWithCurrentValue, SIPStatus, SIPFrequency, Goal, Account, SIPSummary } from '@/types'
import { SIPsPageData } from '@/lib/server/data-preparators'
import { 
  Button, 
  Select, 
  Input, 
  Modal, 
  CompactCard, 
  DataGrid, 
  ErrorState 
} from '@/components/ui'
import { SipCard } from './SipCard'
import { SipForm } from './SipForm'

interface SipListProps {
  data: SIPsPageData
}

export function SipList({ data }: SipListProps) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My SIPs
          </h1>
          <p className="text-gray-600 mt-1">
            {totalSips} SIP{totalSips !== 1 ? 's' : ''} • {activeSips} active
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          Create New SIP
        </Button>
      </div>

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

      {/* SIP List */}
      {filteredSips.length === 0 ? (
        <CompactCard variant="minimal" className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-gray-500 mb-4">
            {sips.length === 0 ? 'No SIPs found' : 'No SIPs match your filters'}
          </div>
          {sips.length === 0 && (
            <Button onClick={() => setShowCreateForm(true)}>
              Create Your First SIP
            </Button>
          )}
        </CompactCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSips.map((sipWithValue) => (
            <SipCard
              key={sipWithValue.sip.id}
              sipWithValue={sipWithValue}
              onEdit={() => setEditingSip(sipWithValue)}
              onDelete={() => handleDeleteSip(sipWithValue.sip.id)}
              onStatusChange={(status) => handleStatusChange(sipWithValue.sip.id, status)}
            />
          ))}
        </div>
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