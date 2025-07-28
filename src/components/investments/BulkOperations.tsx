import React, { useState } from 'react';
import { InvestmentWithCurrentValue, BulkOperationResult } from '@/types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Alert from '../ui/Alert';
import QuickActions from '../ui/QuickActions';

interface BulkOperationsProps {
  selectedInvestments: InvestmentWithCurrentValue[];
  onSelectionChange: (investments: InvestmentWithCurrentValue[]) => void;
  onBulkDelete: (investmentIds: string[]) => Promise<BulkOperationResult>;
  onRefresh: () => void;
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedInvestments,
  onSelectionChange,
  onBulkDelete,
  onRefresh
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<BulkOperationResult | null>(null);

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  const handleBulkDeleteClick = () => {
    if (selectedInvestments.length === 0) return;
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedInvestments.length === 0) return;

    try {
      setIsDeleting(true);
      // Filter out any investments with null or undefined IDs
      const investmentIds = selectedInvestments
        .map(inv => inv.investment.id)
        .filter(id => id != null && id !== '');

      if (investmentIds.length === 0) {
        throw new Error('No valid investment IDs found for deletion');
      }

      const result = await onBulkDelete(investmentIds);

      setDeleteResult(result);

      if (result.success > 0) {
        onSelectionChange([]);
        onRefresh();
      }
    } catch (error) {
      setDeleteResult({
        success: 0,
        failed: selectedInvestments.length,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteResult(null);
  };

  if (selectedInvestments.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Select investments to perform bulk operations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalValue = selectedInvestments.reduce((sum, inv) => {
    // Use the current value from InvestmentWithCurrentValue
    return sum + inv.currentValue;
  }, 0);

  return (
    <>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-yellow-700">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">
                {selectedInvestments.length} investment{selectedInvestments.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="text-sm text-gray-600">
              Total Value: ₹{totalValue.toLocaleString('en-IN')}
            </div>
          </div>

          <QuickActions
            actions={[
              {
                id: 'clear-selection',
                label: 'Clear Selection',
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ),
                onClick: handleClearSelection,
                variant: 'secondary'
              },
              {
                id: 'delete-selected',
                label: 'Delete Selected',
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ),
                onClick: handleBulkDeleteClick,
                variant: 'danger'
              }
            ]}
            size="sm"
            layout="horizontal"
          />
        </div>

        {/* Selected investments preview */}
        <div className="mt-3 pt-3 border-t border-yellow-200">
          <div className="flex flex-wrap gap-2">
            {selectedInvestments.slice(0, 5).map((investmentWithValue, index) => (
              <span
                key={investmentWithValue.investment.id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {investmentWithValue.investment.name}
                <button
                  onClick={() => onSelectionChange(selectedInvestments.filter(inv => inv.investment.id !== investmentWithValue.investment.id))}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {selectedInvestments.length > 5 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                +{selectedInvestments.length - 5} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Selected Investments"
        size="md"
      >
        <div className="space-y-4">
          {!deleteResult ? (
            <>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    Warning: This action cannot be undone
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    You are about to delete {selectedInvestments.length} investment{selectedInvestments.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                      {selectedInvestments.map((investmentWithValue) => (
                        <li key={investmentWithValue.investment.id}>{investmentWithValue.investment.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCloseDeleteModal}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : `Delete ${selectedInvestments.length} Investment${selectedInvestments.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                {deleteResult.success > 0 && (
                  <Alert
                    type="success"
                    message={`Successfully deleted ${deleteResult.success} investment${deleteResult.success !== 1 ? 's' : ''}`}
                  />
                )}

                {deleteResult.failed > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-red-800 mb-2">
                      Failed to delete {deleteResult.failed} investment${deleteResult.failed !== 1 ? 's' : ''}:
                    </h4>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                      {deleteResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleCloseDeleteModal}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default BulkOperations;