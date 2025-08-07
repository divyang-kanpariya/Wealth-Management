'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Investment } from '@/types';
import { Button, Modal, Alert, BreadcrumbItem } from '@/components/ui';
import { AccountForm } from '@/components/accounts';
import CompactCard from '@/components/ui/CompactCard';
import DataGrid from '@/components/ui/DataGrid';
import { AccountDetailPageData } from '@/lib/server/data-preparators/account-detail';

interface AccountDetailViewProps {
  data: AccountDetailPageData;
}

export const AccountDetailView: React.FC<AccountDetailViewProps> = ({ data }) => {
  const router = useRouter();
  const { account } = data;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Handle account update
  const handleAccountUpdate = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/accounts/${account.id}`, {
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

      setIsEditModalOpen(false);
      
      // Show success message and refresh page
      setStatusMessage({
        type: 'success',
        text: 'Account updated successfully'
      });
      setTimeout(() => {
        setStatusMessage(null);
        router.refresh(); // Refresh the server-rendered page
      }, 1500);
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

      const response = await fetch(`/api/accounts/${account.id}`, {
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

  return (
    <div>
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
      <CompactCard title="Account Summary" className="mb-8">
        <DataGrid
          items={[
            {
              label: 'Total Value',
              value: `₹${account.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
              color: 'success'
            },
            {
              label: 'Investments',
              value: account.investmentCount.toString(),
              color: 'info'
            },
            {
              label: 'Account Type',
              value: getAccountTypeLabel(account.type),
              color: 'default'
            }
          ]}
          columns={3}
          variant="default"
        />
      </CompactCard>

      {/* Notes */}
      {account.notes && (
        <CompactCard title="Notes" className="mb-8">
          <p className="text-gray-700">{account.notes}</p>
        </CompactCard>
      )}

      {/* Investments */}
      <CompactCard 
        title="Investments"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/investments')}
          >
            Manage Investments
          </Button>
        }
      >
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
            <p className="text-gray-600 mb-4">This account doesn&apos;t have any investments linked to it.</p>
            <Button
              variant="outline"
              onClick={() => router.push('/investments')}
            >
              Add Investment
            </Button>
          </div>
        )}
      </CompactCard>

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
            Are you sure you want to delete &quot;{account.name}&quot;?
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

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert 
            type="error" 
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      )}
    </div>
  );
};