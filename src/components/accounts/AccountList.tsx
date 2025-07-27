import React, { useState, useEffect } from 'react';
import { Account, Investment } from '@/types';
import AccountTable from './AccountTable';
import AccountForm from './AccountForm';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorState from '../ui/ErrorState';
import Alert from '../ui/Alert';

interface AccountWithTotals extends Account {
  totalValue: number;
  investmentCount: number;
}

interface AccountListProps {
  className?: string;
  onViewDetails?: (accountId: string) => void;
}

const AccountList: React.FC<AccountListProps> = ({ className = '', onViewDetails }) => {
  const [accounts, setAccounts] = useState<AccountWithTotals[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithTotals | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  


  // Calculate account totals from investments
  const calculateAccountTotals = (account: Account): AccountWithTotals => {
    const investments = account.investments || [];
    let totalValue = 0;

    investments.forEach((investment: Investment) => {
      if (investment.units && investment.buyPrice) {
        // Unit-based calculation (stocks, mutual funds, crypto)
        totalValue += investment.units * investment.buyPrice;
      } else if (investment.totalValue) {
        // Total value calculation (real estate, jewelry, etc.)
        totalValue += investment.totalValue;
      }
    });

    return {
      ...account,
      totalValue,
      investmentCount: investments.length,
    };
  };

  // Fetch all accounts with investments
  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/accounts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const data = await response.json();
      const accountsWithTotals = (data || []).map(calculateAccountTotals);
      setAccounts(accountsWithTotals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle account form submission
  const handleAccountSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const url = selectedAccount 
        ? `/api/accounts/${selectedAccount.id}`
        : '/api/accounts';
      
      const method = selectedAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save account');
      }

      // Refresh data
      await fetchAccounts();
      setIsEditModalOpen(false);
      setSelectedAccount(null);
      
      // Show success message
      setStatusMessage({
        type: 'success',
        text: selectedAccount ? 'Account updated successfully' : 'Account created successfully'
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle account deletion
  const handleAccountDelete = async () => {
    if (!selectedAccount) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      // Refresh data
      await fetchAccounts();
      setIsDeleteModalOpen(false);
      setSelectedAccount(null);
      
      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Account deleted successfully'
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit button click
  const handleEdit = (account: AccountWithTotals) => {
    setSelectedAccount(account);
    setIsEditModalOpen(true);
  };

  // Handle delete button click
  const handleDelete = (account: AccountWithTotals) => {
    setSelectedAccount(account);
    setIsDeleteModalOpen(true);
  };

  // Handle view details click
  const handleViewDetails = (account: AccountWithTotals) => {
    if (onViewDetails) {
      // If external handler is provided, use it
      onViewDetails(account.id);
    } else {
      // Otherwise, show details modal
      setSelectedAccount(account);
      setIsDetailsModalOpen(true);
    }
  };

  // Handle add new account
  const handleAddNew = () => {
    setSelectedAccount(null);
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-12 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorState
          title="Failed to load accounts"
          message={error}
          onRetry={fetchAccounts}
        />
      </div>
    );
  }

  const totalPortfolioValue = accounts.reduce((sum, account) => sum + account.totalValue, 0);
  const totalInvestments = accounts.reduce((sum, account) => sum + account.investmentCount, 0);

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-600">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} • {totalInvestments} investment{totalInvestments !== 1 ? 's' : ''} • ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} total
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={handleAddNew} disabled={isSubmitting}>
            Add Account
          </Button>
        </div>
      </div>

      {/* Account Display */}
      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first investment account or platform.</p>
          <Button onClick={handleAddNew}>Add Your First Account</Button>
        </div>
      ) : (
        <AccountTable
          accounts={accounts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          isLoading={isSubmitting}
        />
      )}

      {/* Edit/Add Account Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAccount(null);
        }}
        title={selectedAccount ? 'Edit Account' : 'Add New Account'}
        size="lg"
      >
        <AccountForm
          account={selectedAccount || undefined}
          onSubmit={handleAccountSubmit}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedAccount(null);
          }}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedAccount(null);
        }}
        title="Delete Account"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete &quot;{selectedAccount?.name}&quot;?
          </p>
          {(selectedAccount?.investmentCount ?? 0) > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Cannot delete account
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      This account has {selectedAccount?.investmentCount ?? 0} linked investment{(selectedAccount?.investmentCount ?? 0) !== 1 ? 's' : ''}. 
                      Please reassign or delete these investments first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedAccount(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccountDelete}
              disabled={isSubmitting || (selectedAccount?.investmentCount || 0) > 0}
              className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Account Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAccount(null);
        }}
        title={`${selectedAccount?.name} Details`}
        size="lg"
      >
        {selectedAccount && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAccount.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Value</label>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  ₹{selectedAccount.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Investments</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedAccount.investmentCount} investment{selectedAccount.investmentCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedAccount.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
            
            {selectedAccount.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <p className="mt-1 text-sm text-gray-900">{selectedAccount.notes}</p>
              </div>
            )}

            {selectedAccount.investments && selectedAccount.investments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Linked Investments</label>
                <div className="space-y-2">
                  {selectedAccount.investments.map((investment: Investment) => (
                    <div key={investment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium text-gray-900">{investment.name}</p>
                        <p className="text-sm text-gray-600">{investment.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ₹{((investment.units && investment.buyPrice) 
                            ? (investment.units * investment.buyPrice) 
                            : (investment.totalValue || 0)
                          ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(investment.buyDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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

export default AccountList;