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
import { calculateInvestmentValue } from '@/lib/calculations';
import { filterInvestments, sortInvestments } from '@/lib/portfolio-utils';
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
  Tab
} from '../ui';

import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorState from '../ui/ErrorState';
import Alert from '../ui/Alert';

interface CompactInvestmentListProps {
  className?: string;
  onViewDetails?: (investmentId: string) => void;
}

interface PriceData {
  symbol: string;
  price: number;
  source: string;
  cached: boolean;
}

const CompactInvestmentList: React.FC<CompactInvestmentListProps> = ({ className = '', onViewDetails }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentsWithValues, setInvestmentsWithValues] = useState<InvestmentWithCurrentValue[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<Map<string, number>>(new Map());
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

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
  const [filteredAndSortedInvestments, setFilteredAndSortedInvestments] = useState<InvestmentWithCurrentValue[]>([]);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch all required data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [investmentsRes, goalsRes, accountsRes] = await Promise.all([
        fetch('/api/investments'),
        fetch('/api/goals'),
        fetch('/api/accounts'),
      ]);

      if (!investmentsRes.ok) throw new Error('Failed to fetch investments');
      if (!goalsRes.ok) throw new Error('Failed to fetch goals');
      if (!accountsRes.ok) throw new Error('Failed to fetch accounts');

      const [investmentsData, goalsData, accountsData] = await Promise.all([
        investmentsRes.json(),
        goalsRes.json(),
        accountsRes.json(),
      ]);

      // Extract data from paginated responses
      const investmentsArray = investmentsData?.data || investmentsData || [];
      const goalsArray = goalsData?.data || goalsData || [];
      const accountsArray = accountsData?.data || accountsData || [];

      setInvestments(investmentsArray);
      setGoals(goalsArray);
      setAccounts(accountsArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current prices for investments with symbols
  const fetchPrices = async (investmentList: Investment[]) => {
    try {
      const symbolsToFetch = investmentList
        .filter(inv => inv.symbol && ['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(inv.type))
        .map(inv => ({ symbol: inv.symbol!, type: inv.type }));

      if (symbolsToFetch.length === 0) {
        setLastPriceUpdate(new Date());
        return;
      }

      // Group by type for different API endpoints
      const stockSymbols = symbolsToFetch
        .filter(item => item.type === 'STOCK')
        .map(item => item.symbol);

      const mutualFundSymbols = symbolsToFetch
        .filter(item => item.type === 'MUTUAL_FUND')
        .map(item => item.symbol);

      const pricePromises: Promise<PriceData[]>[] = [];

      // Fetch stock prices
      if (stockSymbols.length > 0) {
        pricePromises.push(
          fetch(`/api/prices/stocks?symbols=${stockSymbols.join(',')}`)
            .then(res => res.json())
            .then(data => data.data || [])
            .catch(() => [])
        );
      }

      // Fetch mutual fund prices
      if (mutualFundSymbols.length > 0) {
        pricePromises.push(
          fetch(`/api/prices/mutual-funds?schemeCodes=${mutualFundSymbols.join(',')}`)
            .then(res => res.json())
            .then(data => data.data?.map((item: any) => ({
              symbol: item.schemeCode,
              price: item.nav,
              source: item.source,
              cached: item.cached
            })) || [])
            .catch(() => [])
        );
      }

      const priceResults = await Promise.all(pricePromises);
      const allPrices = priceResults.flat();

      // Update price data map
      const newPriceData = new Map<string, number>();
      allPrices.forEach(priceInfo => {
        if (priceInfo.price && priceInfo.price > 0) {
          newPriceData.set(priceInfo.symbol, priceInfo.price);
        }
      });

      setPriceData(newPriceData);
      setLastPriceUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch prices:', err);
      setLastPriceUpdate(new Date());
    }
  };

  // Calculate investments with current values
  useEffect(() => {
    if (investments.length > 0) {
      const investmentsWithValues = investments.map(investment => {
        const currentPrice = investment.symbol ? priceData.get(investment.symbol) : undefined;
        return calculateInvestmentValue(investment, currentPrice);
      });
      setInvestmentsWithValues(investmentsWithValues);
    }
  }, [investments, priceData]);

  // Apply filters and sorting
  useEffect(() => {
    if (investmentsWithValues.length > 0) {
      let filtered = filterInvestments(investmentsWithValues, filters);
      let sorted = sortInvestments(filtered, sortOptions);
      setFilteredAndSortedInvestments(sorted);
    } else {
      setFilteredAndSortedInvestments([]);
    }
  }, [investmentsWithValues, filters, sortOptions]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch prices when investments change
  useEffect(() => {
    if (investments.length > 0) {
      fetchPrices(investments);
    }
  }, [investments]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const getGainLossColor = (value: number) => {
    if (value > 0) return 'success';
    if (value < 0) return 'danger';
    return 'neutral';
  };

  const getInvestmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STOCK: 'Stock',
      MUTUAL_FUND: 'Mutual Fund',
      GOLD: 'Gold',
      JEWELRY: 'Jewelry',
      REAL_ESTATE: 'Real Estate',
      FD: 'Fixed Deposit',
      CRYPTO: 'Cryptocurrency',
      OTHER: 'Other',
    };
    return labels[type] || type;
  };

  const getGoalName = (goalId?: string) => {
    if (!goalId) return 'No Goal';
    const goal = goals.find(g => g.id === goalId);
    return goal?.name || 'Unknown Goal';
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown Account';
  };

  // Table columns for compact view
  const compactColumns: CompactTableColumn<InvestmentWithCurrentValue>[] = [
    {
      key: 'name',
      title: 'Investment',
      width: '25%',
      render: (_, item) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate text-sm">
            {item.investment.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {getInvestmentTypeLabel(item.investment.type)}
            {item.investment.symbol && ` • ${item.investment.symbol}`}
          </div>
        </div>
      )
    },
    {
      key: 'currentValue',
      title: 'Value',
      align: 'right',
      width: '20%',
      render: (_, item) => (
        <div className="text-right">
          <div className="font-semibold text-gray-900 text-sm">
            {formatCurrency(item.currentValue)}
          </div>
          {item.investment.units && item.investment.buyPrice && (
            <div className="text-xs text-gray-500">
              {item.investment.units.toLocaleString('en-IN', { maximumFractionDigits: 2 })} units
            </div>
          )}
        </div>
      )
    },
    {
      key: 'gainLoss',
      title: 'P&L',
      align: 'right',
      width: '20%',
      render: (_, item) => (
        <div className="text-right space-y-1">
          <div className="flex items-center justify-end space-x-1">
            <span className="font-semibold text-sm">
              {formatCurrency(Math.abs(item.gainLoss))}
            </span>
            <StatusIndicator
              status={getGainLossColor(item.gainLoss)}
              variant="dot"
              size="sm"
            />
          </div>
          <div className="text-xs">
            {formatPercentage(item.gainLossPercentage)}
          </div>
        </div>
      )
    },
    {
      key: 'goal',
      title: 'Goal',
      width: '15%',
      mobileHidden: true,
      render: (_, item) => (
        <span className="text-xs text-gray-600 truncate block">
          {getGoalName(item.investment.goalId)}
        </span>
      )
    },
    {
      key: 'account',
      title: 'Account',
      width: '15%',
      mobileHidden: true,
      render: (_, item) => (
        <span className="text-xs text-gray-600 truncate block">
          {getAccountName(item.investment.accountId)}
        </span>
      )
    }
  ];

  // Quick actions
  const quickActions: QuickAction[] = [
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
      disabled: investments.length === 0
    }
  ];

  // Action handlers (keeping existing logic)
  const handleInvestmentSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const url = selectedInvestment
        ? `/api/investments/${selectedInvestment.id}`
        : '/api/investments';

      const method = selectedInvestment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          buyDate: new Date(formData.buyDate),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save investment');
      }

      await fetchData();
      setIsEditModalOpen(false);
      setSelectedInvestment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save investment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvestmentDelete = async () => {
    if (!selectedInvestment) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/investments/${selectedInvestment.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete investment');
      }

      await fetchData();
      setIsDeleteModalOpen(false);
      setSelectedInvestment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete investment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (investment: Investment) => {
    setSelectedInvestment(investment);
    setIsEditModalOpen(true);
  };

  const handleDelete = (investment: Investment) => {
    setSelectedInvestment(investment);
    setIsDeleteModalOpen(true);
  };

  const handleViewDetails = (investment: Investment) => {
    if (onViewDetails) {
      onViewDetails(investment.id);
    } else {
      setSelectedInvestment(investment);
      setIsDetailsModalOpen(true);
    }
  };

  async function handleAddNew() {
    setSelectedInvestment(null);
    try {
      const [goalsRes, accountsRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/accounts'),
      ]);

      if (goalsRes.ok && accountsRes.ok) {
        const [goalsData, accountsData] = await Promise.all([
          goalsRes.json(),
          accountsRes.json(),
        ]);

        const goalsArray = goalsData?.data || goalsData || [];
        const accountsArray = accountsData?.data || accountsData || [];

        setGoals(goalsArray);
        setAccounts(accountsArray);
      }
    } catch (err) {
      console.error('Failed to refresh accounts and goals:', err);
    }

    setIsEditModalOpen(true);
  }

  const handleRefreshPrices = () => {
    fetchPrices(investments);
    setStatusMessage({ type: 'success', text: 'Refreshing prices...' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

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

  const handleBulkDelete = async (investmentIds: string[]): Promise<BulkOperationResult> => {
    const response = await fetch('/api/investments/bulk', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ investmentIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete investments');
    }

    const result = await response.json();
    return result;
  };

  const handleExportOpen = () => {
    setIsExportModalOpen(true);
  };

  const handleExportClose = () => {
    setIsExportModalOpen(false);
  };

  const handleImportOpen = () => {
    setIsImportModalOpen(true);
  };

  const handleImportClose = () => {
    setIsImportModalOpen(false);
  };

  const handleImportComplete = (result: any) => {
    setStatusMessage({
      type: 'success',
      text: `Import completed: ${result.success} successful, ${result.failed} failed`
    });
    setTimeout(() => setStatusMessage(null), 5000);
    fetchData();
  };

  const handleImportHistoryOpen = () => {
    setIsImportHistoryModalOpen(true);
  };

  const handleImportHistoryClose = () => {
    setIsImportHistoryModalOpen(false);
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
          title="Failed to load investments"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  // Table actions
  const tableActions = (item: InvestmentWithCurrentValue) => (
    <QuickActions
      actions={[
        {
          id: 'view',
          label: 'View',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
          onClick: () => handleViewDetails(item.investment),
          variant: 'secondary'
        },
        {
          id: 'edit',
          label: 'Edit',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          onClick: () => handleEdit(item.investment),
          variant: 'secondary'
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
          onClick: () => handleDelete(item.investment),
          variant: 'danger'
        }
      ]}
      size="sm"
      layout="horizontal"
    />
  );

  // Tab content
  const listTab: Tab = {
    id: 'list',
    label: 'List View',
    badge: filteredAndSortedInvestments.length,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    content: (
      <div className="space-y-4">
        {/* Filters */}
        {investments.length > 0 && (
          <CompactCard variant="minimal" collapsible defaultCollapsed={true} title="Filters">
            <InvestmentFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              goals={goals}
              accounts={accounts}
              onReset={handleFiltersReset}
            />
          </CompactCard>
        )}

        {/* Bulk Operations */}
        {showBulkSelection && (
          <CompactCard variant="minimal" title="Bulk Operations">
            <BulkOperations
              selectedInvestments={selectedInvestments}
              onSelectionChange={setSelectedInvestments}
              onBulkDelete={handleBulkDelete}
              onRefresh={fetchData}
            />
          </CompactCard>
        )}

        {/* Investment Table */}
        {investments.length === 0 ? (
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
          <CompactTable
            data={filteredAndSortedInvestments}
            columns={compactColumns}
            rowKey={(item) => item.investment.id}
            onSort={(key, direction) => handleSortChange({ field: key as any, direction })}
            sortKey={sortOptions.field}
            sortDirection={sortOptions.direction}
            loading={isSubmitting}
            emptyMessage="No investments found"
            selectable={showBulkSelection}
            selectedItems={selectedInvestments}
            onSelectionChange={handleSelectionChange}
            actions={tableActions}
            variant="compact"
            maxHeight="600px"
          />
        )}
      </div>
    )
  };

  const tabs: Tab[] = [listTab];

  return (
    <div className={className}>
      {/* Header */}
      <CompactCard
        title="My Investments"
        badge={`${filteredAndSortedInvestments.length} of ${investments.length}`}
        subtitle={lastPriceUpdate ? `Prices updated ${lastPriceUpdate.toLocaleTimeString()}` : undefined}
        variant="default"
        className="mb-4"
        actions={
          <QuickActions
            actions={quickActions}
            size="sm"
            layout="horizontal"
          />
        }
      />

      {/* Main Content */}
      <TabPanel
        tabs={tabs}
        variant="minimal"
        size="sm"
      />

      {/* Modals - keeping existing modal logic */}
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
          <InvestmentDetails
            investmentId={selectedInvestment.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBack={() => {
              setIsDetailsModalOpen(false);
              setSelectedInvestment(null);
            }}
          />
        )}
      </Modal>

      <ExportPortfolio
        investments={filteredAndSortedInvestments}
        isOpen={isExportModalOpen}
        onClose={handleExportClose}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={handleImportClose}
        onImportComplete={handleImportComplete}
      />

      <ImportHistoryModal
        isOpen={isImportHistoryModalOpen}
        onClose={handleImportHistoryClose}
      />

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

export default CompactInvestmentList;