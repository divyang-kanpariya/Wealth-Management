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
import { InvestmentInteractions } from './InvestmentInteractions';
import InvestmentForm from './InvestmentForm';
import InvestmentDetails from './InvestmentDetails';
import InvestmentFiltersComponent from './InvestmentFilters';
import InvestmentSort from './InvestmentSort';
import BulkOperations from './BulkOperations';
import ExportPortfolio from './ExportPortfolio';
import { ImportModal } from './ImportModal';
import { ImportHistoryModal } from './ImportHistoryModal';
import { 
  CompactCard, 
  CompactTable, 
  CompactTableColumn, 
  Modal, 
  Button, 
  StatusIndicator,
  QuickActions,
  QuickAction,
  TabPanel,
  LoadingState
} from '../ui';
import { ErrorState } from '../ui';
import Alert from '../ui/Alert';

interface CompactInvestmentListProps {
  data: InvestmentsPageData;
  className?: string;
  onViewDetails?: (investmentId: string) => void;
}

const CompactInvestmentList: React.FC<CompactInvestmentListProps> = ({ 
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

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
          }).format(amount);
        };

        const formatPercentage = (percentage: number) => {
          return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
        };

        const getStatusColor = (gainLoss: number): "info" | "success" | "danger" | "warning" | "neutral" => {
          if (gainLoss > 0) return 'success';
          if (gainLoss < 0) return 'danger';
          return 'neutral';
        };

        const columns: CompactTableColumn<InvestmentWithCurrentValue>[] = [
          {
            key: 'name',
            title: 'Investment',
            render: (item) => (
              <div>
                <div className="font-medium text-gray-900">{item.investment.name}</div>
                <div className="text-sm text-gray-500">
                  {item.investment.type} • {item.investment.account?.name}
                </div>
              </div>
            ),
            sortable: true,
          },
          {
            key: 'currentValue',
            title: 'Current Value',
            render: (item) => (
              <div className="text-right">
                <div className="font-medium">{formatCurrency(item.currentValue)}</div>
                <div className="text-sm text-gray-500">
                  {item.investment.units ? `${item.investment.units} units` : 'Total value'}
                </div>
              </div>
            ),
            sortable: true,
          },
          {
            key: 'gainLoss',
            title: 'Gain/Loss',
            render: (item) => (
              <div className="text-right">
                <StatusIndicator
                  status={getStatusColor(item.gainLoss)}
                  label={formatCurrency(item.gainLoss)}
                />
                <div className="text-sm text-gray-500">
                  {formatPercentage(item.gainLossPercentage)}
                </div>
              </div>
            ),
            sortable: true,
          },
          {
            key: 'actions',
            title: '',
            render: (item) => (
              <QuickActions
                actions={[
                  {
                    id: 'view',
                    label: 'View',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ),
                    onClick: () => handleViewDetailsWrapper(item.investment),
                    variant: 'secondary'
                  },
                  {
                    id: 'edit',
                    label: 'Edit',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    ),
                    onClick: () => handleEdit(item.investment),
                    variant: 'secondary'
                  }
                ]}
                size="sm"
                layout="horizontal"
              />
            ),
          },
        ];

        return (
          <div className={`space-y-4 ${className}`}>
            {/* Header */}
            <CompactCard
              title="Investments"
              badge={`${filteredAndSortedInvestments.length} of ${data.totalInvestments}`}
              subtitle={`Updated ${data.lastPriceUpdate.toLocaleTimeString()}`}
              variant="minimal"
              actions={
                <QuickActions
                  actions={[
                    {
                      id: 'add',
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
                      id: 'refresh',
                      label: 'Refresh',
                      icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ),
                      onClick: handleRefreshPrices,
                      variant: 'secondary'
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

            {/* Investment Table */}
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
              <CompactTable<InvestmentWithCurrentValue>
                data={filteredAndSortedInvestments}
                columns={columns}
                loading={isSubmitting}
                rowKey={(item) => item.investment.id}
                emptyMessage="No investments match your filters"
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

export default CompactInvestmentList;