import React from 'react';
import {
  Investment,
  InvestmentWithCurrentValue,
  Goal,
  Account,
  InvestmentFilters,
  InvestmentSortOptions,
  BulkOperationResult
} from '@/types';
import { InvestmentsPageData } from '@/lib/server/data-preparators';
import InvestmentTable from './InvestmentTable';
import InvestmentForm from './InvestmentForm';
import InvestmentDetails from './InvestmentDetails';
import InvestmentFiltersComponent from './InvestmentFilters';
import InvestmentSort from './InvestmentSort';
import BulkOperations from './BulkOperations';
import ExportPortfolio from './ExportPortfolio';
import { ImportModal } from './ImportModal';
import { ImportHistoryModal } from './ImportHistoryModal';
import { 
  Modal, 
  Button, 
  CompactCard, 
  QuickActions
} from '../ui';
import { ErrorState, Alert } from '../ui';
import { InvestmentInteractions } from './InvestmentInteractions';

interface InvestmentListProps {
  data: InvestmentsPageData;
  className?: string;
  onViewDetails?: (investmentId: string) => void;
}

const InvestmentList: React.FC<InvestmentListProps> = ({ 
  data, 
  className = '', 
  onViewDetails 
}) => {
  // This component is now presentation-only and uses InvestmentInteractions for state management
  return (
    <InvestmentInteractions
      investments={data.investmentsWithValues}
      goals={data.goals}
      accounts={data.accounts}
    >
      {({
        filteredAndSortedInvestments,
        filters,
        sortOptions,
        selectedInvestments,
        showBulkSelection,
        isSubmitting,
        error,
        statusMessage,
        setStatusMessage,
        handleFiltersChange,
        handleFiltersReset,
        handleSortChange,
        handleSelectionChange,
        handleBulkSelectionToggle,
        handleBulkSelectionChange,
        handleBulkDelete,
        handleEdit,
        handleDelete,
        handleViewDetails: handleViewDetailsInternal,
        handleAddNew,
        handleRefreshPrices,
        handleExportOpen,
        handleExportClose,
        handleImportOpen,
        handleImportClose,
        handleImportComplete,
        handleImportHistoryOpen,
        handleImportHistoryClose,
      }) => {
        // Handle view details with external handler if provided
        const handleViewDetailsWrapper = (investment: Investment) => {
          if (onViewDetails) {
            onViewDetails(investment.id);
          } else {
            handleViewDetailsInternal(investment);
          }
        };

        if (error) {
          return (
            <div className={className}>
              <ErrorState
                title="Failed to load investments"
                message={error}
                onRetry={() => window.location.reload()}
              />
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {/* Header Card */}
            <CompactCard
              title="My Investments"
              badge={`${filteredAndSortedInvestments.length} of ${data.totalInvestments}`}
              subtitle={`Prices updated ${data.lastPriceUpdate.toLocaleTimeString()}`}
              variant="default"
              actions={
                <QuickActions
                  actions={[
                    {
                      id: 'add-investment',
                      label: 'Add',
                      icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      ),
                      onClick: handleAddNew,
                      variant: 'primary'
                    },
                    {
                      id: 'refresh-prices',
                      label: 'Refresh',
                      icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ),
                      onClick: handleRefreshPrices,
                      variant: 'secondary'
                    },
                    {
                      id: 'import',
                      label: 'Import',
                      icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      ),
                      onClick: handleImportOpen,
                      variant: 'secondary'
                    },
                    {
                      id: 'export',
                      label: 'Export',
                      icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      ),
                      onClick: handleExportOpen,
                      variant: 'secondary',
                      disabled: data.totalInvestments === 0
                    },
                    {
                      id: 'bulk-select',
                      label: showBulkSelection ? 'Cancel' : 'Select',
                      icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                      onClick: handleBulkSelectionToggle,
                      variant: 'secondary',
                      disabled: data.totalInvestments === 0
                    }
                  ]}
                  size="sm"
                  layout="horizontal"
                />
              }
            >
              <div></div>
            </CompactCard>

            {/* Filters */}
            {data.totalInvestments > 0 && (
              <CompactCard variant="minimal" collapsible defaultCollapsed={true} title="Filters">
                <InvestmentFiltersComponent
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  goals={data.goals}
                  accounts={data.accounts}
                  onReset={handleFiltersReset}
                />
              </CompactCard>
            )}

            {/* Bulk Operations */}
            {showBulkSelection && (
              <CompactCard variant="minimal" title="Bulk Operations">
                <BulkOperations
                  selectedInvestments={selectedInvestments}
                  onSelectionChange={handleBulkSelectionChange}
                  onBulkDelete={handleBulkDelete}
                  onRefresh={() => window.location.reload()}
                />
              </CompactCard>
            )}

            {/* Sort and Results Info */}
            {data.totalInvestments > 0 && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {filteredAndSortedInvestments.length} of {data.totalInvestments} investments
                </div>
                <div className="flex items-center space-x-4">
                  <InvestmentSort
                    sortOptions={sortOptions}
                    onSortChange={handleSortChange}
                  />
                </div>
              </div>
            )}

            {/* Investment Display */}
            {data.totalInvestments === 0 ? (
              <CompactCard variant="minimal">
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No investments yet</h3>
                  <p className="text-gray-600 mb-6">Get started by adding your first investment.</p>
                  <Button onClick={handleAddNew}>Add Your First Investment</Button>
                </div>
              </CompactCard>
            ) : (
              <InvestmentTable
                investments={filteredAndSortedInvestments}
                goals={data.goals}
                accounts={data.accounts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleViewDetailsWrapper}
                isLoading={isSubmitting}
                showSelection={showBulkSelection}
                selectedInvestments={selectedInvestments}
                onSelectionChange={handleSelectionChange}
                onSort={(key, direction) => handleSortChange({ field: key as any, direction })}
                sortKey={sortOptions.field}
                sortDirection={sortOptions.direction}
              />
            )}

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
      }}
    </InvestmentInteractions>
  );
};

export default InvestmentList;