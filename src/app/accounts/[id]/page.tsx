'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Account, Investment } from '@/types';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorState from '@/components/ui/ErrorState';
import { AccountForm } from '@/components/accounts';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';

interface AccountWithInvestments extends Account {
  totalValue: number;
  investmentCount: number;
}

const AccountDetailsPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [account, setAccount] = useState<AccountWithInvestments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Calculate account totals from investments
  const calculateAccountTotals = (accountData: Account): AccountWithInvestments => {
    const investments = accountData.investments || [];
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
      ...accountData,
      totalValue,
      investmentCount: investments.length,
    };
  };

  // Fetch account details
  const fetchAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/accounts/${accountId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Account not found');
        }
        throw new Error('Failed to fetch account details');
      }

      const data = await response.json();
      const accountWithTotals = calculateAccountTotals(data);
      setAccount(accountWithTotals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account details');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (accountId) {
      fetchAccount();
    }
  }, [accountId]);

  // Handle account update
  const handleAccountUpdate = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update account');
      }

      // Refresh data
      await fetchAccount();
      setIsEditModalOpen(false);
      
      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Account updated successfully'
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle account deletion
  const handleAccountDelete = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      // Redirect to accounts list
      router.push('/accounts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleteModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'BROKER':
        return 'bg-blue-100 text-blue-800';
      case 'DEMAT':
        return 'bg-green-100 text-green-800';
      case 'BANK':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'BROKER':
        return 'Broker';
      case 'DEMAT':
        return 'Demat';
      case 'BANK':
        return 'Bank';
      default:
        return 'Other';
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <ErrorState
            title="Failed to load account"
            message={error}
            onRetry={fetchAccount}
          />
        </div>
      </Layout>
    );
  }

  if (!account) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <ErrorState
            title="Account not found"
            message="The requested account could not be found."
            onRetry={() => router.push('/accounts')}
            retryLabel="Back to Accounts"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/accounts')}
              >
                ← Back to Accounts
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{account.name}</h1>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getAccountTypeColor(account.type)}`}>
                {getAccountTypeLabel(account.type)}
              </span>
              <span className="text-gray-600">
                Created {new Date(account.createdAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              disabled={isSubmitting}
            >
              Edit Account
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isSubmitting}
              className="text-red-600 hover:text-red-700 hover:border-red-300"
            >
              Delete Account
            </Button>
          </div>
        </div>

        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Value</h3>
            <p className="text-3xl font-bold text-green-600">
              ₹{account.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Investments</h3>
            <p className="text-3xl font-bold text-blue-600">
              {account.investmentCount}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Type</h3>
            <p className="text-xl font-semibold text-gray-700">
              {getAccountTypeLabel(account.type)}
            </p>
          </div>
        </div>

        {/* Notes */}
        {account.notes && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
            <p className="text-gray-700">{account.notes}</p>
          </div>
        )}

        {/* Investments */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Investments</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/investments')}
            >
              Manage Investments
            </Button>
          </div>

          {account.investments && account.investments.length > 0 ? (
            <div className="space-y-4">
              {account.investments.map((investment: Investment) => (
                <div key={investment.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">{investment.name}</h4>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {investment.type}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {investment.units && investment.buyPrice ? (
                        <span>
                          {investment.units} units @ ₹{investment.buyPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span>Total Value</span>
                      )}
                      <span className="mx-2">•</span>
                      <span>Purchased {new Date(investment.buyDate).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₹{((investment.units && investment.buyPrice) 
                        ? (investment.units * investment.buyPrice) 
                        : (investment.totalValue || 0)
                      ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    {investment.goal && (
                      <p className="text-sm text-gray-600">Goal: {investment.goal.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No investments yet</h4>
              <p className="text-gray-600 mb-4">This account doesn't have any investments linked to it.</p>
              <Button
                variant="outline"
                onClick={() => router.push('/investments')}
              >
                Add Investment
              </Button>
            </div>
          )}
        </div>

        {/* Edit Account Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Account"
          size="lg"
        >
          <AccountForm
            account={account}
            onSubmit={handleAccountUpdate}
            onCancel={() => setIsEditModalOpen(false)}
            isLoading={isSubmitting}
          />
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Account"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete "{account.name}"?
            </p>
            {account.investmentCount > 0 ? (
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
                        This account has {account.investmentCount} linked investment{account.investmentCount !== 1 ? 's' : ''}. 
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
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAccountDelete}
                disabled={isSubmitting || account.investmentCount > 0}
                className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
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
    </Layout>
  );
};

export default AccountDetailsPage;