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
import InvestmentCard from './InvestmentCard';
import InvestmentForm from './InvestmentForm';
import InvestmentDetails from './InvestmentDetails';
import InvestmentFiltersComponent from './InvestmentFilters';
import InvestmentSort from './InvestmentSort';
import BulkOperations from './BulkOperations';
import ExportPortfolio from './ExportPortfolio';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorState from '../ui/ErrorState';
import Alert from '../ui/Alert';

interface InvestmentListProps {
  className?: string;
  onViewDetails?: (investmentId: string) => void;
}

interface PriceData {
  symbol: string;
  price: number;
  source: string;
  cached: boolean;
}

const InvestmentList: React.FC<InvestmentListProps> = ({ className = '', onViewDetails }) => {
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
  const [selectedInvestments, setSelectedInvestments] = useState<Investment[]>([]);
  const [showBulkSelection, setShowBulkSelection] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [filteredAndSortedInvestments, setFilteredAndSortedInvestments] = useState<InvestmentWithCurrentValue[]>([]);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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
            .then(data => {
              console.log('Stock price response:', data);
              return data.data || [];
            })
            .catch((error) => {
              console.error('Stock price fetch error:', error);
              return [];
            })
        );
      }

      // Fetch mutual fund prices
      if (mutualFundSymbols.length > 0) {
        pricePromises.push(
          fetch(`/api/prices/mutual-funds?schemeCodes=${mutualFundSymbols.join(',')}`)
            .then(res => res.json())
            .then(data => {
              console.log('Mutual fund price response:', data);
              return data.data?.map((item: any) => ({
                symbol: item.schemeCode,
                price: item.nav,
                source: item.source,
                cached: item.cached
              })) || [];
            })
            .catch((error) => {
              console.error('Mutual fund price fetch error:', error);
              return [];
            })
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
      // Don't set error state for price fetching failures
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

  // Handle investment form submission
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

      // Refresh data
      await fetchData();
      setIsEditModalOpen(false);
      setSelectedInvestment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save investment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle investment deletion
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

      // Refresh data
      await fetchData();
      setIsDeleteModalOpen(false);
      setSelectedInvestment(null);
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
    if (onViewDetails) {
      // If external handler is provided, use it
      onViewDetails(investment.id);
    } else {
      // Otherwise, show details modal
      setSelectedInvestment(investment);
      setIsDetailsModalOpen(true);
    }
  };

  // Handle add new investment
  const handleAddNew = async () => {
    setSelectedInvestment(null);
    // Refresh accounts and goals data to ensure we have the latest options
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

        // Extract data from paginated responses
        const goalsArray = goalsData?.data || goalsData || [];
        const accountsArray = accountsData?.data || accountsData || [];

        setGoals(goalsArray);
        setAccounts(accountsArray);
      }
    } catch (err) {
      console.error('Failed to refresh accounts and goals:', err);
      // Continue opening the modal even if refresh fails
    }
    
    setIsEditModalOpen(true);
  };

  // Handle refresh prices
  const handleRefreshPrices = () => {
    fetchPrices(investments);
    setStatusMessage({ type: 'success', text: 'Refreshing prices...' });
    setTimeout(() => setStatusMessage(null), 3000);
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

  const handleSelectionChange = (investment: Investment, selected: boolean) => {
    if (selected) {
      setSelectedInvestments(prev => [...prev, investment]);
    } else {
      setSelectedInvestments(prev => prev.filter(inv => inv.id !== investment.id));
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

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Investments</h2>
          <p className="text-gray-600 mt-1">
            {filteredAndSortedInvestments.length} of {investments.length} investment{investments.length !== 1 ? 's' : ''}
            {lastPriceUpdate && (
              <span className="ml-2 text-sm">
                • Prices updated {lastPriceUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleExportOpen}
            disabled={isSubmitting || investments.length === 0}
          >
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleBulkSelectionToggle}
            disabled={isSubmitting || investments.length === 0}
          >
            {showBulkSelection ? 'Cancel Selection' : 'Select Multiple'}
          </Button>
          <Button
            variant="outline"
            onClick={handleRefreshPrices}
            disabled={isSubmitting}
          >
            Refresh Prices
          </Button>
          <Button onClick={handleAddNew} disabled={isSubmitting}>
            Add Investment
          </Button>
        </div>
      </div>

      {/* Filters */}
      {investments.length > 0 && (
        <InvestmentFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          goals={goals}
          accounts={accounts}
          onReset={handleFiltersReset}
        />
      )}

      {/* Bulk Operations */}
      {showBulkSelection && (
        <BulkOperations
          selectedInvestments={selectedInvestments}
          onSelectionChange={setSelectedInvestments}
          onBulkDelete={handleBulkDelete}
          onRefresh={fetchData}
        />
      )}

      {/* Sort and Results Info */}
      {investments.length > 0 && (
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedInvestments.length} of {investments.length} investments
          </div>
          <InvestmentSort
            sortOptions={sortOptions}
            onSortChange={handleSortChange}
          />
        </div>
      )}

      {/* Investment Cards */}
      {investments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No investments yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first investment.</p>
          <Button onClick={handleAddNew}>Add Your First Investment</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedInvestments.map((investmentWithValue) => (
            <InvestmentCard
              key={investmentWithValue.investment.id}
              investmentWithValue={investmentWithValue}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              isLoading={isSubmitting}
              showSelection={showBulkSelection}
              isSelected={selectedInvestments.some(inv => inv.id === investmentWithValue.investment.id)}
              onSelectionChange={handleSelectionChange}
            />
          ))}
        </div>
      )}

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

      {/* Export Portfolio Modal */}
      <ExportPortfolio
        investments={filteredAndSortedInvestments}
        isOpen={isExportModalOpen}
        onClose={handleExportClose}
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
    </div>
  );
};

export default InvestmentList;