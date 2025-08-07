'use client';

import React, { useState, useEffect } from 'react';
import { Goal, Investment, InvestmentType, Account, InvestmentWithCurrentValue } from '@/types';
import CompactCard from '../ui/CompactCard';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Alert from '../ui/Alert';

interface GoalInvestmentListProps {
  goal: Goal;
  investments: InvestmentWithCurrentValue[];
  accounts: Account[];
  availableGoals: Goal[];
  onInvestmentUpdate?: () => void;
  className?: string;
}

interface FilterOptions {
  search: string;
  type: InvestmentType | 'ALL';
  account: string;
  sortBy: 'name' | 'value' | 'gainLoss' | 'date';
  sortOrder: 'asc' | 'desc';
}

const GoalInvestmentList: React.FC<GoalInvestmentListProps> = ({
  goal,
  investments,
  accounts,
  availableGoals,
  onInvestmentUpdate,
  className = ''
}) => {
  const [filteredInvestments, setFilteredInvestments] = useState<InvestmentWithCurrentValue[]>([]);
  const [selectedInvestments, setSelectedInvestments] = useState<Set<string>>(new Set());
  const [showReallocationModal, setShowReallocationModal] = useState(false);
  const [reallocationTarget, setReallocationTarget] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    type: 'ALL',
    account: 'ALL',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  useEffect(() => {
    applyFilters();
  }, [investments, filters]);



  const applyFilters = () => {
    let filtered = [...investments];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.investment.name.toLowerCase().includes(searchLower) ||
        inv.investment.symbol?.toLowerCase().includes(searchLower) ||
        inv.investment.type.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filters.type !== 'ALL') {
      filtered = filtered.filter(inv => inv.investment.type === filters.type);
    }

    // Account filter
    if (filters.account !== 'ALL') {
      filtered = filtered.filter(inv => inv.investment.accountId === filters.account);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.investment.name.toLowerCase();
          bValue = b.investment.name.toLowerCase();
          break;
        case 'value':
          aValue = a.currentValue;
          bValue = b.currentValue;
          break;
        case 'gainLoss':
          aValue = a.gainLossPercentage;
          bValue = b.gainLossPercentage;
          break;
        case 'date':
          aValue = new Date(a.investment.buyDate).getTime();
          bValue = new Date(b.investment.buyDate).getTime();
          break;
        default:
          aValue = a.investment.name.toLowerCase();
          bValue = b.investment.name.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredInvestments(filtered);
  };

  const handleSelectionChange = (investmentId: string, selected: boolean) => {
    const newSelection = new Set(selectedInvestments);
    if (selected) {
      newSelection.add(investmentId);
    } else {
      newSelection.delete(investmentId);
    }
    setSelectedInvestments(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedInvestments.size === filteredInvestments.length) {
      setSelectedInvestments(new Set());
    } else {
      setSelectedInvestments(new Set(filteredInvestments.map(inv => inv.investment.id)));
    }
  };

  const handleReallocation = async () => {
    if (!reallocationTarget || selectedInvestments.size === 0) return;

    try {
      const promises = Array.from(selectedInvestments).map(investmentId =>
        fetch(`/api/investments/${investmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goalId: reallocationTarget })
        })
      );

      await Promise.all(promises);
      
      setStatusMessage({
        type: 'success',
        text: `${selectedInvestments.size} investments reallocated successfully`
      });
      
      setShowReallocationModal(false);
      setSelectedInvestments(new Set());
      setReallocationTarget('');
      
      if (onInvestmentUpdate) {
        onInvestmentUpdate();
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: 'Failed to reallocate investments'
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={className}>
      <CompactCard 
        title={`Goal Investments (${filteredInvestments.length})`}
        actions={
          <div className="flex space-x-2">
            {selectedInvestments.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReallocationModal(true)}
              >
                Reallocate ({selectedInvestments.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/investments'}
            >
              Add Investment
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Search investments..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          
          <Select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
            options={[
              { value: 'ALL', label: 'All Types' },
              { value: 'STOCK', label: 'Stocks' },
              { value: 'MUTUAL_FUND', label: 'Mutual Funds' },
              { value: 'GOLD', label: 'Gold' },
              { value: 'REAL_ESTATE', label: 'Real Estate' },
              { value: 'FD', label: 'Fixed Deposits' },
              { value: 'CRYPTO', label: 'Crypto' },
              { value: 'OTHER', label: 'Other' }
            ]}
          />

          <Select
            value={filters.account}
            onChange={(e) => setFilters(prev => ({ ...prev, account: e.target.value }))}
            options={[
              { value: 'ALL', label: 'All Accounts' },
              ...accounts.map(account => ({ value: account.id, label: account.name }))
            ]}
          />

          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(prev => ({ ...prev, sortBy: sortBy as any, sortOrder: sortOrder as any }));
            }}
            options={[
              { value: 'name-asc', label: 'Name (A-Z)' },
              { value: 'name-desc', label: 'Name (Z-A)' },
              { value: 'value-desc', label: 'Value (High-Low)' },
              { value: 'value-asc', label: 'Value (Low-High)' },
              { value: 'gainLoss-desc', label: 'Gain/Loss (High-Low)' },
              { value: 'gainLoss-asc', label: 'Gain/Loss (Low-High)' },
              { value: 'date-desc', label: 'Date (Newest)' },
              { value: 'date-asc', label: 'Date (Oldest)' }
            ]}
          />
        </div>

        {/* Investment Table */}
        {filteredInvestments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedInvestments.size === filteredInvestments.length && filteredInvestments.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gain/Loss
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvestments.map((investment) => (
                  <tr key={investment.investment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedInvestments.has(investment.investment.id)}
                        onChange={(e) => handleSelectionChange(investment.investment.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{investment.investment.name}</div>
                      {investment.investment.symbol && (
                        <div className="text-xs text-gray-500">{investment.investment.symbol}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {investment.investment.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(investment.currentValue)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        investment.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(investment.gainLoss)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        investment.gainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(investment.gainLossPercentage)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {investment.investment.account?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(investment.investment.buyDate.toString())}
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
            <p className="text-gray-600 mb-4">
              {investments.length === 0 
                ? 'No investments are linked to this goal yet.'
                : 'No investments match your current filters.'
              }
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/investments'}
            >
              Add Investment
            </Button>
          </div>
        )}
      </CompactCard>

      {/* Reallocation Modal */}
      <Modal
        isOpen={showReallocationModal}
        onClose={() => setShowReallocationModal(false)}
        title="Reallocate Investments"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Reallocate {selectedInvestments.size} selected investments to a different goal:
          </p>
          
          <Select
            value={reallocationTarget}
            onChange={(e) => setReallocationTarget(e.target.value)}
            required
            options={[
              { value: '', label: 'Select target goal...' },
              ...availableGoals.map(goal => ({ value: goal.id, label: goal.name }))
            ]}
          />

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowReallocationModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReallocation}
              disabled={!reallocationTarget}
            >
              Reallocate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Message */}
      {statusMessage && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert 
            type={statusMessage.type} 
            message={statusMessage.text}
            onClose={() => setStatusMessage(null)}
          />
        </div>
      )}
    </div>
  );
};

export default GoalInvestmentList;