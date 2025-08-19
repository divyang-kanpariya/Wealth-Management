'use client'

import React, { useState, useEffect } from 'react';
import {
  Investment,
  InvestmentWithCurrentValue,
  Goal,
  Account,
  InvestmentFilters,
  InvestmentSortOptions,
  BulkOperationResult
} from '@/types';
import { filterInvestments, sortInvestments } from '@/lib/portfolio-utils';
import InvestmentForm from './InvestmentForm';
import InvestmentDetails from './InvestmentDetails';
import ExportPortfolio from './ExportPortfolio';
import { ImportModal } from './ImportModal';
import { ImportHistoryModal } from './ImportHistoryModal';
import { 
  Modal, 
  Button
} from '../ui';
import { Alert } from '../ui';

interface InvestmentInteractionsProps {
  investments: InvestmentWithCurrentValue[];
  goals: Goal[];
  accounts: Account[];
  children: (props: {
    // State
    filteredAndSortedInvestments: InvestmentWithCurrentValue[];
    filters: InvestmentFilters;
    sortOptions: InvestmentSortOptions;
    selectedInvestments: InvestmentWithCurrentValue[];
    showBulkSelection: boolean;
    isSubmitting: boolean;
    error: string | null;
    statusMessage: { type: 'success' | 'error', text: string } | null;
    setStatusMessage: (message: { type: 'success' | 'error', text: string } | null) => void;
    
    // Modal states
    isEditModalOpen: boolean;
    isDeleteModalOpen: boolean;
    isDetailsModalOpen: boolean;
    isExportModalOpen: boolean;
    isImportModalOpen: boolean;
    isImportHistoryModalOpen: boolean;
    selectedInvestment: Investment | null;
    
    // Handlers
    handleFiltersChange: (filters: InvestmentFilters) => void;
    handleFiltersReset: () => void;
    handleSortChange: (sortOptions: InvestmentSortOptions) => void;
    handleSelectionChange: (investment: InvestmentWithCurrentValue, selected: boolean) => void;
    handleBulkSelectionToggle: () => void;
    handleBulkSelectionChange: (investments: InvestmentWithCurrentValue[]) => void;
    handleBulkDelete: (investmentIds: string[]) => Promise<BulkOperationResult>;
    handleEdit: (investment: Investment) => void;
    handleDelete: (investment: Investment) => void;
    handleViewDetails: (investment: Investment) => void;
    handleAddNew: () => void;
    handleRefreshPrices: () => void;
    handleExportOpen: () => void;
    handleExportClose: () => void;
    handleImportOpen: () => void;
    handleImportClose: () => void;
    handleImportComplete: (result: any) => void;
    handleImportHistoryOpen: () => void;
    handleImportHistoryClose: () => void;
  }) => React.ReactNode;
}

export function InvestmentInteractions({ 
  investments, 
  goals, 
  accounts, 
  children 
}: InvestmentInteractionsProps) {
  // State for client-side interactions only
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Advanced features state
  const [filters, setFilters] = useState<InvestmentFilters>({});
  const [sortOptions, setSortOptions] = useState<InvestmentSortOptions>({
    field: 'buyDate',
    direction: 'desc'
  });
  const [selectedInvestments, setSelectedInvestments] = useState<InvestmentWithCurrentValue[]>([]);
  const [showBulkSelection, setShowBulkSelection] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportHistoryModalOpen, setIsImportHistoryModalOpen] = useState(false);
  const [filteredAndSortedInvestments, setFilteredAndSortedInvestments] = useState<InvestmentWithCurrentValue[]>(investments);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Apply filters and sorting to the server-provided data
  useEffect(() => {
    if (investments.length > 0) {
      let filtered = filterInvestments(investments, filters);
      let sorted = sortInvestments(filtered, sortOptions);
      setFilteredAndSortedInvestments(sorted);
    } else {
      setFilteredAndSortedInvestments([]);
    }
  }, [investments, filters, sortOptions]);

  // Handle investment form submission using server actions
  const handleInvestmentSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Convert form data to FormData for server action
      const serverFormData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'buyDate' && value) {
            serverFormData.append(key, new Date(value as string).toISOString());
          } else {
            serverFormData.append(key, String(value));
          }
        }
      });

      let result;
      if (selectedInvestment) {
        // Import server action dynamically to avoid SSR issues
        const { updateInvestment } = await import('@/lib/server/actions/investments');
        result = await updateInvestment(selectedInvestment.id, serverFormData);
      } else {
        // Import server action dynamically to avoid SSR issues
        const { createInvestment } = await import('@/lib/server/actions/investments');
        result = await createInvestment(serverFormData);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save investment');
      }

      // Close modal and show success message
      setIsEditModalOpen(false);
      setSelectedInvestment(null);
      setStatusMessage({ type: 'success', text: selectedInvestment ? 'Investment updated successfully' : 'Investment created successfully' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save investment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle investment deletion using server actions
  const handleInvestmentDelete = async () => {
    if (!selectedInvestment) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Import server action dynamically to avoid SSR issues
      const { deleteInvestment } = await import('@/lib/server/actions/investments');
      const result = await deleteInvestment(selectedInvestment.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete investment');
      }

      // Close modal and show success message
      setIsDeleteModalOpen(false);
      setSelectedInvestment(null);
      setStatusMessage({ type: 'success', text: 'Investment deleted successfully' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete investment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit button click
  const handleEdit = (investment: Investment) => {
    setSelectedInvestment(investment);
    setIsEditModalOpen(true);
  };

  // Handle delete button click
  const handleDelete = (investment: Investment) => {
    setSelectedInvestment(investment);
    setIsDeleteModalOpen(true);
  };

  // Handle view details click
  const handleViewDetails = (investment: Investment) => {
    setSelectedInvestment(investment);
    setIsDetailsModalOpen(true);
  };

  // Handle add new investment
  const handleAddNew = () => {
    setSelectedInvestment(null);
    setIsEditModalOpen(true);
  };

  // Handle refresh prices - enhanced with progress tracking and better error handling
  const handleRefreshPrices = async () => {
    try {
      setStatusMessage({ type: 'success', text: 'Starting fresh price refresh from API...' });
      
      // Import enhanced refresh actions dynamically
      const { refreshDashboard, getRefreshStatus } = await import('@/app/actions/dashboard');
      const result = await refreshDashboard();
      
      if (result.success && result.requestId) {
        setStatusMessage({ type: 'success', text: 'Fetching fresh prices from API...' });
        
        // Poll for progress updates
        const pollForProgress = async (requestId: string, attempts = 0) => {
          const maxAttempts = 60; // 60 seconds max
          
          if (attempts >= maxAttempts) {
            setStatusMessage({ type: 'error', text: 'Refresh timeout - please try again' });
            setTimeout(() => setStatusMessage(null), 5000);
            return;
          }
          
          try {
            const statusResult = await getRefreshStatus(requestId);
            
            if (statusResult.success && statusResult.status) {
              const status = statusResult.status;
              
              if (status.status === 'completed') {
                const results = status.results;
                if (results) {
                  if (results.failed > 0) {
                    setStatusMessage({ 
                      type: 'error', 
                      text: `Refresh completed with issues: ${results.success} success, ${results.failed} failed` 
                    });
                    setTimeout(() => setStatusMessage(null), 8000);
                  } else {
                    setStatusMessage({ 
                      type: 'success', 
                      text: `Fresh prices fetched successfully! Updated ${results.success} symbols in ${results.duration}ms` 
                    });
                    setTimeout(() => setStatusMessage(null), 5000);
                  }
                } else {
                  setStatusMessage({ type: 'success', text: 'Fresh prices fetched from API successfully' });
                  setTimeout(() => setStatusMessage(null), 3000);
                }
              } else if (status.status === 'failed') {
                setStatusMessage({ 
                  type: 'error', 
                  text: `Refresh failed: ${status.error || 'Unknown error'}` 
                });
                setTimeout(() => setStatusMessage(null), 8000);
              } else if (status.status === 'cancelled') {
                setStatusMessage({ type: 'error', text: 'Refresh was cancelled' });
                setTimeout(() => setStatusMessage(null), 5000);
              } else if (status.status === 'in-progress') {
                // Update progress message
                const progress = status.progress;
                setStatusMessage({ 
                  type: 'success', 
                  text: `Refreshing prices... ${progress.completed}/${progress.total} (${progress.percentage}%)` 
                });
                
                // Continue polling
                setTimeout(() => pollForProgress(requestId, attempts + 1), 1000);
              } else {
                // Still pending, continue polling
                setTimeout(() => pollForProgress(requestId, attempts + 1), 1000);
              }
            } else {
              // Status not found, assume completed
              setStatusMessage({ type: 'success', text: 'Fresh prices fetched from API successfully' });
              setTimeout(() => setStatusMessage(null), 3000);
            }
          } catch (pollError) {
            console.error('Error polling refresh status:', pollError);
            // Continue polling with reduced frequency
            setTimeout(() => pollForProgress(requestId, attempts + 1), 2000);
          }
        };
        
        // Start polling after a short delay
        setTimeout(() => pollForProgress(result.requestId), 1000);
        
      } else {
        setStatusMessage({ type: 'error', text: result.message || 'Failed to start price refresh' });
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      setStatusMessage({ type: 'error', text: 'Failed to fetch fresh prices from API' });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Advanced features handlers
  const handleFiltersChange = (newFilters: InvestmentFilters) => {
    setFilters(newFilters);
  };

  const handleFiltersReset = () => {
    setFilters({});
  };

  const handleSortChange = (newSortOptions: InvestmentSortOptions) => {
    setSortOptions(newSortOptions);
  };

  const handleSelectionChange = (investmentWithValue: InvestmentWithCurrentValue, selected: boolean) => {
    if (selected) {
      setSelectedInvestments(prev => [...prev, investmentWithValue]);
    } else {
      setSelectedInvestments(prev => prev.filter(inv => inv.investment.id !== investmentWithValue.investment.id));
    }
  };

  const handleBulkSelectionToggle = () => {
    setShowBulkSelection(!showBulkSelection);
    if (showBulkSelection) {
      setSelectedInvestments([]);
    }
  };

  const handleBulkSelectionChange = (investments: InvestmentWithCurrentValue[]) => {
    setSelectedInvestments(investments);
  };

  const handleBulkDelete = async (investmentIds: string[]): Promise<BulkOperationResult> => {
    try {
      // Import server action dynamically to avoid SSR issues
      const { bulkDeleteInvestments } = await import('@/lib/server/actions/investments');
      const result = await bulkDeleteInvestments(investmentIds);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete investments');
      }

      // Show success message
      setStatusMessage({ type: 'success', text: `${investmentIds.length} investments deleted successfully` });
      setTimeout(() => setStatusMessage(null), 3000);

      return {
        success: investmentIds.length,
        failed: 0,
        errors: []
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete investments');
    }
  };

  const handleExportOpen = () => {
    setIsExportModalOpen(true);
  };

  const handleExportClose = () => {
    setIsExportModalOpen(false);
  };

  // Import handlers
  const handleImportOpen = () => {
    setIsImportModalOpen(true);
  };

  const handleImportClose = () => {
    setIsImportModalOpen(false);
  };

  const handleImportComplete = async (result: any) => {
    setStatusMessage({
      type: 'success',
      text: `Import completed: ${result.success} successful, ${result.failed} failed`
    });
    
    // Refresh dashboard to show imported investments
    try {
      const { refreshDashboard } = await import('@/app/actions/dashboard');
      await refreshDashboard();
    } catch (error) {
      console.error('Failed to refresh dashboard after import:', error);
    }
    
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleImportHistoryOpen = () => {
    setIsImportHistoryModalOpen(true);
  };

  const handleImportHistoryClose = () => {
    setIsImportHistoryModalOpen(false);
  };

  return (
    <>
      {children({
        // State
        filteredAndSortedInvestments,
        filters,
        sortOptions,
        selectedInvestments,
        showBulkSelection,
        isSubmitting,
        error,
        statusMessage,
        setStatusMessage,
        
        // Modal states
        isEditModalOpen,
        isDeleteModalOpen,
        isDetailsModalOpen,
        isExportModalOpen,
        isImportModalOpen,
        isImportHistoryModalOpen,
        selectedInvestment,
        
        // Handlers
        handleFiltersChange,
        handleFiltersReset,
        handleSortChange,
        handleSelectionChange,
        handleBulkSelectionToggle,
        handleBulkSelectionChange,
        handleBulkDelete,
        handleEdit,
        handleDelete,
        handleViewDetails,
        handleAddNew,
        handleRefreshPrices,
        handleExportOpen,
        handleExportClose,
        handleImportOpen,
        handleImportClose,
        handleImportComplete,
        handleImportHistoryOpen,
        handleImportHistoryClose,
      })}

      {/* Edit/Add Investment Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedInvestment(null);
        }}
        title={selectedInvestment ? 'Edit Investment' : 'Add New Investment'}
        size="lg"
      >
        <InvestmentForm
          investment={selectedInvestment || undefined}
          goals={goals}
          accounts={accounts}
          onSubmit={handleInvestmentSubmit}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedInvestment(null);
          }}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedInvestment(null);
        }}
        title="Delete Investment"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete &quot;{selectedInvestment?.name}&quot;? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedInvestment(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvestmentDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Investment Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedInvestment(null);
        }}
        title={selectedInvestment?.name || 'Investment Details'}
        size="xl"
      >
        {selectedInvestment && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Type:</strong> {selectedInvestment.type}</p>
              <p><strong>Symbol:</strong> {selectedInvestment.symbol || 'N/A'}</p>
              <p><strong>Buy Date:</strong> {new Date(selectedInvestment.buyDate).toLocaleDateString()}</p>
              {selectedInvestment.units && (
                <p><strong>Units:</strong> {selectedInvestment.units}</p>
              )}
              {selectedInvestment.buyPrice && (
                <p><strong>Buy Price:</strong> ₹{selectedInvestment.buyPrice.toLocaleString()}</p>
              )}
              {selectedInvestment.totalValue && (
                <p><strong>Total Value:</strong> ₹{selectedInvestment.totalValue.toLocaleString()}</p>
              )}
              {selectedInvestment.notes && (
                <p><strong>Notes:</strong> {selectedInvestment.notes}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => handleEdit(selectedInvestment)}
              >
                Edit
              </Button>
              <Button
                onClick={() => handleDelete(selectedInvestment)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Export Portfolio Modal */}
      <ExportPortfolio
        investments={filteredAndSortedInvestments}
        isOpen={isExportModalOpen}
        onClose={handleExportClose}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={handleImportClose}
        onImportComplete={handleImportComplete}
      />

      {/* Import History Modal */}
      <ImportHistoryModal
        isOpen={isImportHistoryModalOpen}
        onClose={handleImportHistoryClose}
      />

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
    </>
  );
}