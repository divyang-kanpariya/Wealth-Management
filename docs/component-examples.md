# Component Usage Examples

## Overview

This document provides practical, real-world examples of using the modernized UI components in the Personal Wealth Management application. Each example includes complete code snippets that can be used as templates for common use cases.

## Dashboard Examples

### Portfolio Overview Dashboard

```tsx
import React from 'react';
import { 
  CompactCard, 
  DataGrid, 
  QuickActions, 
  LoadingState, 
  ErrorState 
} from '@/components/ui';
import { 
  TrendingUpIcon, 
  DollarSignIcon, 
  PieChartIcon,
  RefreshIcon,
  DownloadIcon,
  PlusIcon
} from 'lucide-react';

function PortfolioDashboard() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const portfolioMetrics = [
    {
      label: 'Total Portfolio Value',
      value: '₹2,45,000',
      subValue: '+₹15,000 (6.5%)',
      color: 'success',
      icon: <TrendingUpIcon className="w-4 h-4" />
    },
    {
      label: 'Today\'s Change',
      value: '+₹1,250',
      subValue: '+0.51%',
      color: 'success',
      icon: <DollarSignIcon className="w-4 h-4" />
    },
    {
      label: 'Total Invested',
      value: '₹2,00,000',
      color: 'default'
    },
    {
      label: 'Available Cash',
      value: '₹25,000',
      color: 'info'
    }
  ];

  const dashboardActions = [
    {
      id: 'add-investment',
      label: 'Add Investment',
      icon: <PlusIcon className="w-4 h-4" />,
      onClick: () => setShowAddModal(true),
      variant: 'primary'
    },
    {
      id: 'refresh-prices',
      label: 'Refresh Prices',
      icon: <RefreshIcon className="w-4 h-4" />,
      onClick: handleRefreshPrices
    },
    {
      id: 'export-data',
      label: 'Export',
      icon: <DownloadIcon className="w-4 h-4" />,
      onClick: handleExport
    }
  ];

  if (loading) {
    return <LoadingState message="Loading portfolio data..." size="lg" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Portfolio"
        message="Unable to fetch your portfolio data. Please check your connection and try again."
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <CompactCard
        title="Portfolio Overview"
        subtitle="Last updated: 2 minutes ago"
        icon={<PieChartIcon className="w-5 h-5" />}
        actions={<QuickActions actions={dashboardActions} size="sm" />}
      >
        <DataGrid
          items={portfolioMetrics}
          columns={2}
          variant="default"
        />
      </CompactCard>

      {/* Account Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(account => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
```

### Investment Account Card

```tsx
function AccountCard({ account }) {
  const accountActions = [
    {
      id: 'view-holdings',
      label: 'View Holdings',
      icon: <EyeIcon className="w-4 h-4" />,
      onClick: () => navigateToHoldings(account.id)
    },
    {
      id: 'add-transaction',
      label: 'Add Transaction',
      icon: <PlusIcon className="w-4 h-4" />,
      onClick: () => openTransactionModal(account.id),
      variant: 'primary'
    }
  ];

  const accountMetrics = [
    {
      label: 'Current Value',
      value: formatCurrency(account.currentValue),
      subValue: `${account.changePercent > 0 ? '+' : ''}${account.changePercent}%`,
      color: account.changePercent >= 0 ? 'success' : 'danger'
    },
    {
      label: 'Holdings',
      value: `${account.holdingsCount} investments`
    },
    {
      label: 'Last Transaction',
      value: formatDate(account.lastTransaction)
    }
  ];

  return (
    <CompactCard
      title={account.name}
      subtitle={account.broker}
      badge={account.status}
      variant="default"
      actions={<QuickActions actions={accountActions} size="sm" />}
    >
      <DataGrid
        items={accountMetrics}
        columns={1}
        variant="compact"
      />
    </CompactCard>
  );
}
```

## Investment Management Examples

### Investment List with Actions

```tsx
function InvestmentList({ investments }) {
  const [selectedInvestments, setSelectedInvestments] = useState([]);
  const [bulkActions, setBulkActions] = useState([]);

  const bulkActionsList = [
    {
      id: 'update-prices',
      label: 'Update Prices',
      icon: <RefreshIcon className="w-4 h-4" />,
      onClick: handleBulkPriceUpdate,
      disabled: selectedInvestments.length === 0
    },
    {
      id: 'export-selected',
      label: 'Export Selected',
      icon: <DownloadIcon className="w-4 h-4" />,
      onClick: handleBulkExport,
      disabled: selectedInvestments.length === 0
    },
    {
      id: 'delete-selected',
      label: 'Delete Selected',
      icon: <TrashIcon className="w-4 h-4" />,
      onClick: handleBulkDelete,
      variant: 'danger',
      disabled: selectedInvestments.length === 0
    }
  ];

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedInvestments.length > 0 && (
        <CompactCard
          title={`${selectedInvestments.length} investments selected`}
          variant="minimal"
        >
          <QuickActions
            actions={bulkActionsList}
            layout="horizontal"
            size="sm"
          />
        </CompactCard>
      )}

      {/* Investment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investments.map(investment => (
          <InvestmentCard
            key={investment.id}
            investment={investment}
            selected={selectedInvestments.includes(investment.id)}
            onSelect={handleInvestmentSelect}
          />
        ))}
      </div>
    </div>
  );
}
```

### Individual Investment Card

```tsx
function InvestmentCard({ investment, selected, onSelect }) {
  const investmentActions = [
    {
      id: 'edit',
      label: 'Edit',
      icon: <EditIcon className="w-4 h-4" />,
      onClick: () => openEditModal(investment.id)
    },
    {
      id: 'sell',
      label: 'Sell',
      icon: <TrendingDownIcon className="w-4 h-4" />,
      onClick: () => openSellModal(investment.id),
      variant: 'danger'
    },
    {
      id: 'view-history',
      label: 'History',
      icon: <HistoryIcon className="w-4 h-4" />,
      onClick: () => viewTransactionHistory(investment.id)
    }
  ];

  const investmentMetrics = [
    {
      label: 'Current Value',
      value: formatCurrency(investment.currentValue),
      color: 'default'
    },
    {
      label: 'Invested Amount',
      value: formatCurrency(investment.investedAmount),
      color: 'default'
    },
    {
      label: 'Gain/Loss',
      value: formatCurrency(investment.gainLoss),
      subValue: `${investment.gainLossPercent > 0 ? '+' : ''}${investment.gainLossPercent}%`,
      color: investment.gainLoss >= 0 ? 'success' : 'danger'
    },
    {
      label: 'Quantity',
      value: investment.quantity ? `${investment.quantity} units` : 'N/A'
    }
  ];

  return (
    <CompactCard
      title={investment.name}
      subtitle={`${investment.type} • ${investment.account}`}
      className={`transition-all ${selected ? 'ring-2 ring-blue-500' : ''}`}
      actions={
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(investment.id, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <QuickActions actions={investmentActions} size="sm" />
        </div>
      }
    >
      <DataGrid
        items={investmentMetrics}
        columns={2}
        variant="compact"
      />
    </CompactCard>
  );
}
```

## Form Examples

### Add Investment Form

```tsx
function AddInvestmentForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    account: '',
    quantity: '',
    price: '',
    date: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const investmentTypes = [
    { value: 'stock', label: 'Stock' },
    { value: 'mutual_fund', label: 'Mutual Fund' },
    { value: 'bond', label: 'Bond' },
    { value: 'etf', label: 'ETF' }
  ];

  const formActions = [
    {
      id: 'cancel',
      label: 'Cancel',
      icon: <XIcon className="w-4 h-4" />,
      onClick: onCancel
    },
    {
      id: 'save',
      label: loading ? 'Saving...' : 'Save Investment',
      icon: <SaveIcon className="w-4 h-4" />,
      onClick: handleSubmit,
      variant: 'primary',
      disabled: loading
    }
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors(error.fieldErrors || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <CompactCard
      title="Add New Investment"
      variant="default"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Investment Name"
            placeholder="Enter investment name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            error={errors.name}
            required
          />

          <Select
            label="Investment Type"
            placeholder="Choose type"
            options={investmentTypes}
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            error={errors.type}
            required
          />

          <Input
            label="Quantity"
            type="number"
            placeholder="Enter quantity"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
            error={errors.quantity}
            leftIcon={<HashIcon className="w-4 h-4" />}
          />

          <Input
            label="Price per Unit"
            type="number"
            placeholder="Enter price"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
            error={errors.price}
            leftIcon={<DollarSignIcon className="w-4 h-4" />}
            required
          />

          <Input
            label="Purchase Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            error={errors.date}
            required
          />
        </div>

        <div className="flex justify-end">
          <QuickActions
            actions={formActions}
            layout="horizontal"
          />
        </div>
      </div>
    </CompactCard>
  );
}
```

### Import Data Form

```tsx
function ImportDataForm() {
  const [file, setFile] = useState(null);
  const [importStatus, setImportStatus] = useState('idle'); // idle, uploading, processing, success, error
  const [importResults, setImportResults] = useState(null);
  const [errors, setErrors] = useState([]);

  const handleFileUpload = async (selectedFile) => {
    setFile(selectedFile);
    setImportStatus('uploading');
    
    try {
      const results = await uploadAndProcessFile(selectedFile);
      setImportResults(results);
      setImportStatus('success');
    } catch (error) {
      setErrors(error.errors || [error.message]);
      setImportStatus('error');
    }
  };

  const renderImportStatus = () => {
    switch (importStatus) {
      case 'uploading':
        return (
          <LoadingState
            message="Uploading file..."
            size="md"
          />
        );
      
      case 'processing':
        return (
          <LoadingState
            message="Processing transactions..."
            size="md"
          />
        );
      
      case 'success':
        return (
          <Alert
            type="success"
            title="Import Successful"
            message={
              <div>
                <p>Successfully imported {importResults.totalCount} transactions:</p>
                <DataGrid
                  items={[
                    { label: 'Stocks', value: importResults.stocks },
                    { label: 'Mutual Funds', value: importResults.mutualFunds },
                    { label: 'Bonds', value: importResults.bonds },
                    { label: 'Errors', value: importResults.errors, color: importResults.errors > 0 ? 'danger' : 'success' }
                  ]}
                  columns={2}
                  variant="minimal"
                  className="mt-2"
                />
              </div>
            }
          />
        );
      
      case 'error':
        return (
          <ErrorState
            title="Import Failed"
            message={
              <div>
                <p>The following errors occurred during import:</p>
                <ul className="list-disc list-inside mt-2">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            }
            onRetry={() => setImportStatus('idle')}
            retryText="Try Again"
          />
        );
      
      default:
        return (
          <CompactCard
            title="Import Transactions"
            subtitle="Upload a CSV file with your transaction data"
            variant="minimal"
          >
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Choose file or drag and drop
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    CSV files up to 10MB
                  </span>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                  className="sr-only"
                />
              </div>
            </div>
          </CompactCard>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderImportStatus()}
      
      {importStatus === 'success' && (
        <CompactCard title="Next Steps" variant="minimal">
          <QuickActions
            actions={[
              {
                id: 'view-imported',
                label: 'View Imported Data',
                icon: <EyeIcon className="w-4 h-4" />,
                onClick: () => navigateToInvestments(),
                variant: 'primary'
              },
              {
                id: 'import-more',
                label: 'Import More',
                icon: <PlusIcon className="w-4 h-4" />,
                onClick: () => setImportStatus('idle')
              }
            ]}
          />
        </CompactCard>
      )}
    </div>
  );
}
```

## Settings and Configuration Examples

### Account Settings

```tsx
function AccountSettings() {
  const [accounts, setAccounts] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);

  const accountActions = [
    {
      id: 'add-account',
      label: 'Add Account',
      icon: <PlusIcon className="w-4 h-4" />,
      onClick: () => setShowAddAccount(true),
      variant: 'primary'
    }
  ];

  return (
    <div className="space-y-6">
      <CompactCard
        title="Investment Accounts"
        subtitle="Manage your brokerage and investment accounts"
        actions={<QuickActions actions={accountActions} />}
      >
        <div className="space-y-3">
          {accounts.map(account => (
            <AccountSettingsCard key={account.id} account={account} />
          ))}
          
          {accounts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <BankIcon className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">No accounts configured</p>
              <p className="text-sm">Add your first investment account to get started</p>
            </div>
          )}
        </div>
      </CompactCard>

      {showAddAccount && (
        <AddAccountForm
          onSubmit={handleAddAccount}
          onCancel={() => setShowAddAccount(false)}
        />
      )}
    </div>
  );
}
```

### Account Settings Card

```tsx
function AccountSettingsCard({ account }) {
  const [isEditing, setIsEditing] = useState(false);

  const accountActions = [
    {
      id: 'edit',
      label: 'Edit',
      icon: <EditIcon className="w-4 h-4" />,
      onClick: () => setIsEditing(true)
    },
    {
      id: 'sync',
      label: 'Sync Data',
      icon: <RefreshIcon className="w-4 h-4" />,
      onClick: () => handleSync(account.id)
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon className="w-4 h-4" />,
      onClick: () => handleDelete(account.id),
      variant: 'danger'
    }
  ];

  const accountInfo = [
    { label: 'Account Type', value: account.type },
    { label: 'Broker', value: account.broker },
    { label: 'Status', value: account.status, color: account.status === 'Active' ? 'success' : 'warning' },
    { label: 'Last Sync', value: formatDate(account.lastSync) }
  ];

  return (
    <CompactCard
      title={account.name}
      subtitle={account.accountNumber}
      variant="minimal"
      actions={<QuickActions actions={accountActions} size="sm" />}
    >
      <DataGrid
        items={accountInfo}
        columns={2}
        variant="compact"
      />
    </CompactCard>
  );
}
```

## Error Handling Examples

### Network Error Handling

```tsx
function NetworkErrorBoundary({ children }) {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorState
            title="Connection Error"
            message="Unable to connect to the server. Please check your internet connection and try again."
            onRetry={handleRetry}
            retryText={retryCount > 0 ? `Retry (${retryCount})` : 'Retry'}
            fullScreen={false}
          />
        </div>
      </div>
    );
  }

  return children;
}
```

### Form Validation Errors

```tsx
function FormWithValidation() {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async () => {
    try {
      setSubmitError(null);
      await submitForm(formData);
    } catch (error) {
      if (error.type === 'validation') {
        setErrors(error.fieldErrors);
      } else {
        setSubmitError(error.message);
      }
    }
  };

  return (
    <div className="space-y-4">
      {submitError && (
        <Alert
          type="error"
          title="Submission Failed"
          message={submitError}
          onClose={() => setSubmitError(null)}
        />
      )}

      <CompactCard title="Investment Form">
        <div className="space-y-4">
          <Input
            label="Investment Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            error={errors.name}
          />
          
          <Input
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            error={errors.amount}
          />

          <Button onClick={handleSubmit} variant="primary">
            Save Investment
          </Button>
        </div>
      </CompactCard>
    </div>
  );
}
```

## Responsive Layout Examples

### Mobile-Optimized Dashboard

```tsx
function MobileDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabActions = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <HomeIcon className="w-4 h-4" />,
      onClick: () => setActiveTab('overview'),
      variant: activeTab === 'overview' ? 'primary' : 'secondary'
    },
    {
      id: 'investments',
      label: 'Investments',
      icon: <TrendingUpIcon className="w-4 h-4" />,
      onClick: () => setActiveTab('investments'),
      variant: activeTab === 'investments' ? 'primary' : 'secondary'
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: <CreditCardIcon className="w-4 h-4" />,
      onClick: () => setActiveTab('accounts'),
      variant: activeTab === 'accounts' ? 'primary' : 'secondary'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:hidden">
        <QuickActions
          actions={tabActions}
          layout="horizontal"
          size="sm"
          className="justify-center"
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === 'overview' && <MobileOverviewTab />}
        {activeTab === 'investments' && <MobileInvestmentsTab />}
        {activeTab === 'accounts' && <MobileAccountsTab />}
      </div>
    </div>
  );
}
```

### Responsive Card Grid

```tsx
function ResponsiveCardGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map(item => (
        <CompactCard
          key={item.id}
          title={item.name}
          subtitle={item.type}
          variant="default"
          className="h-full" // Ensure equal height cards
        >
          <DataGrid
            items={item.metrics}
            columns={1} // Single column for mobile
            variant="compact"
          />
          
          <div className="mt-4">
            <QuickActions
              actions={item.actions}
              layout="horizontal"
              size="sm"
              className="flex-wrap" // Allow wrapping on small screens
            />
          </div>
        </CompactCard>
      ))}
    </div>
  );
}
```

These examples demonstrate practical usage patterns for the modernized UI components in real-world scenarios within the Personal Wealth Management application. Each example includes proper error handling, responsive design considerations, and follows the established component patterns.