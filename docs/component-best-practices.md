# Component Best Practices Guide

## Overview

This guide establishes best practices for using the modernized UI component system effectively. It covers component selection, composition patterns, accessibility standards, and performance optimization techniques.

## Component Selection Guidelines

### When to Use Each Component

#### CompactCard
**Use for:**
- Grouping related information
- Creating visual sections on a page
- Displaying data that benefits from a container
- Content that might need to be collapsed

**Don't use for:**
- Single data points (use DataGrid instead)
- Full-page layouts (use proper layout components)
- Temporary notifications (use Alert instead)

**Examples:**
```tsx
// ✅ Good: Grouping related account information
<CompactCard title="Investment Account" subtitle="Zerodha Demat">
  <DataGrid items={accountMetrics} />
  <QuickActions actions={accountActions} />
</CompactCard>

// ❌ Bad: Single data point
<CompactCard title="Total Value">
  ₹2,45,000
</CompactCard>

// ✅ Better: Use DataGrid for single metrics
<DataGrid items={[{ label: 'Total Value', value: '₹2,45,000' }]} />
```

#### QuickActions
**Use for:**
- Grouping related actions
- Primary and secondary actions on cards
- Toolbar-style action groups
- Context-specific actions

**Don't use for:**
- Single actions (use Button instead)
- Form submission (use Button in forms)
- Navigation (use proper navigation components)

**Examples:**
```tsx
// ✅ Good: Related actions on an investment
<QuickActions 
  actions={[
    { id: 'edit', label: 'Edit', icon: <EditIcon />, onClick: handleEdit },
    { id: 'sell', label: 'Sell', icon: <SellIcon />, onClick: handleSell, variant: 'danger' },
    { id: 'view', label: 'View Details', icon: <ViewIcon />, onClick: handleView }
  ]}
/>

// ❌ Bad: Single action
<QuickActions 
  actions={[
    { id: 'save', label: 'Save', icon: <SaveIcon />, onClick: handleSave }
  ]}
/>

// ✅ Better: Use Button for single actions
<Button onClick={handleSave} leftIcon={<SaveIcon />}>
  Save
</Button>
```

#### DataGrid
**Use for:**
- Displaying metrics and statistics
- Key-value pairs
- Structured data presentation
- Dashboard summaries

**Don't use for:**
- Tabular data with many columns (use Table instead)
- Single values without context
- Complex nested data structures

**Examples:**
```tsx
// ✅ Good: Portfolio metrics
<DataGrid 
  items={[
    { label: 'Total Value', value: '₹2,45,000', color: 'success' },
    { label: 'Today\'s Change', value: '+₹1,250', subValue: '+0.51%', color: 'success' },
    { label: 'Total Invested', value: '₹2,00,000' }
  ]}
  columns={3}
/>

// ❌ Bad: Complex tabular data
<DataGrid 
  items={transactions.map(t => ({
    label: t.date,
    value: `${t.stock} - ${t.quantity} @ ${t.price}`
  }))}
/>

// ✅ Better: Use Table for complex data
<Table 
  columns={transactionColumns}
  data={transactions}
/>
```

## Component Composition Patterns

### Card-Based Layouts

#### Standard Card Pattern
```tsx
// Consistent card structure
<CompactCard 
  title="Section Title"
  subtitle="Optional subtitle"
  actions={<QuickActions actions={cardActions} />}
  variant="default"
>
  <DataGrid items={sectionData} />
</CompactCard>
```

#### Collapsible Content Pattern
```tsx
// Use for optional or detailed information
<CompactCard 
  title="Advanced Settings"
  collapsible
  defaultCollapsed
  variant="minimal"
>
  <div className="space-y-4">
    <Input label="Custom Field" />
    <Select label="Options" options={advancedOptions} />
  </div>
</CompactCard>
```

#### Dense Information Pattern
```tsx
// Use for compact displays
<CompactCard 
  title="Quick Stats"
  variant="dense"
  icon={<StatsIcon />}
>
  <DataGrid 
    items={quickStats} 
    columns={4} 
    variant="compact" 
  />
</CompactCard>
```

### Action Grouping Patterns

#### Primary/Secondary Action Pattern
```tsx
// Group actions by importance
<div className="flex justify-between items-center">
  <QuickActions 
    actions={[
      { id: 'edit', label: 'Edit', icon: <EditIcon />, onClick: handleEdit },
      { id: 'duplicate', label: 'Duplicate', icon: <CopyIcon />, onClick: handleDuplicate }
    ]}
    size="sm"
  />
  <Button variant="primary" onClick={handleSave}>
    Save Changes
  </Button>
</div>
```

#### Contextual Action Pattern
```tsx
// Actions specific to content context
<CompactCard 
  title="Investment Details"
  actions={
    <QuickActions 
      actions={[
        { id: 'refresh', label: 'Refresh Price', icon: <RefreshIcon />, onClick: handleRefresh },
        { id: 'history', label: 'View History', icon: <HistoryIcon />, onClick: handleHistory }
      ]}
      size="sm"
    />
  }
>
  <DataGrid items={investmentData} />
</CompactCard>
```

### Data Display Patterns

#### Metric Dashboard Pattern
```tsx
// Consistent metric display
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <CompactCard title="Portfolio Overview">
    <DataGrid 
      items={portfolioMetrics} 
      columns={2}
      variant="default"
    />
  </CompactCard>
  
  <CompactCard title="Today's Performance">
    <DataGrid 
      items={todayMetrics} 
      columns={1}
      variant="compact"
    />
  </CompactCard>
  
  <CompactCard title="Quick Actions">
    <QuickActions 
      actions={dashboardActions}
      layout="vertical"
    />
  </CompactCard>
</div>
```

#### Hierarchical Data Pattern
```tsx
// Nested information display
<CompactCard title="Account Summary">
  <DataGrid 
    items={[
      { label: 'Account Type', value: 'Demat Account' },
      { label: 'Broker', value: 'Zerodha' },
      { label: 'Status', value: 'Active', color: 'success' }
    ]}
    columns={1}
    variant="minimal"
  />
  
  <CompactCard 
    title="Holdings" 
    variant="minimal" 
    className="mt-4"
    collapsible
  >
    <DataGrid 
      items={holdingsData} 
      columns={2}
      variant="compact"
    />
  </CompactCard>
</CompactCard>
```

## State Management Patterns

### Loading States

#### Component-Level Loading
```tsx
// Loading state for individual components
function InvestmentCard({ investmentId }) {
  const { data, loading, error } = useInvestment(investmentId);
  
  if (loading) {
    return <LoadingState message="Loading investment data..." />;
  }
  
  if (error) {
    return (
      <ErrorState 
        message="Failed to load investment data"
        onRetry={() => refetch()}
      />
    );
  }
  
  return (
    <CompactCard title={data.name}>
      <DataGrid items={formatInvestmentData(data)} />
    </CompactCard>
  );
}
```

#### Page-Level Loading
```tsx
// Loading state for entire page sections
function PortfolioPage() {
  const { data, loading, error } = usePortfolio();
  
  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingState message="Loading portfolio..." size="lg" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <CompactCard title="Portfolio Summary">
        <DataGrid items={data.summary} />
      </CompactCard>
      {/* Other components */}
    </div>
  );
}
```

### Error Handling

#### Graceful Error Display
```tsx
// Error boundaries with retry functionality
function InvestmentSection() {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
    // Retry logic
  };
  
  if (error) {
    return (
      <CompactCard title="Investment Data">
        <ErrorState 
          title="Unable to Load Data"
          message={error.message}
          onRetry={handleRetry}
          retryText={retryCount > 0 ? `Retry (${retryCount})` : 'Retry'}
        />
      </CompactCard>
    );
  }
  
  // Normal component rendering
}
```

### Notification Patterns

#### Success Notifications
```tsx
// Success feedback for user actions
function ImportSuccess({ onClose, importStats }) {
  return (
    <Alert 
      type="success"
      title="Import Completed"
      message={
        <div>
          <p>Successfully imported {importStats.count} transactions.</p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>Stocks: {importStats.stocks}</li>
            <li>Mutual Funds: {importStats.mutualFunds}</li>
            <li>Bonds: {importStats.bonds}</li>
          </ul>
        </div>
      }
      onClose={onClose}
    />
  );
}
```

#### Warning Notifications
```tsx
// Warning for potential issues
function DataValidationWarning({ issues, onProceed, onCancel }) {
  return (
    <Alert 
      type="warning"
      title="Data Validation Issues"
      message={
        <div>
          <p>Found {issues.length} potential issues:</p>
          <ul className="list-disc list-inside mt-2 text-sm">
            {issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          <div className="mt-4 space-x-2">
            <Button size="sm" onClick={onProceed}>
              Proceed Anyway
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      }
    />
  );
}
```

## Accessibility Best Practices

### Keyboard Navigation

#### Focus Management
```tsx
// Proper focus management in modals
function InvestmentModal({ isOpen, onClose }) {
  const firstInputRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [isOpen]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Investment">
      <form onSubmit={handleSubmit}>
        <Input 
          ref={firstInputRef}
          label="Investment Name"
          required
        />
        <QuickActions 
          actions={[
            { id: 'cancel', label: 'Cancel', onClick: onClose },
            { id: 'save', label: 'Save', onClick: handleSubmit, variant: 'primary' }
          ]}
        />
      </form>
    </Modal>
  );
}
```

#### ARIA Labels and Descriptions
```tsx
// Proper ARIA attributes for screen readers
<CompactCard 
  title="Portfolio Performance"
  aria-label="Portfolio performance metrics and trends"
>
  <DataGrid 
    items={[
      { 
        label: 'Total Return', 
        value: '+22.5%', 
        color: 'success',
        tooltip: 'Total return since inception'
      }
    ]}
    aria-describedby="performance-description"
  />
  <div id="performance-description" className="sr-only">
    Portfolio performance data showing positive returns
  </div>
</CompactCard>
```

### Color and Contrast

#### Meaningful Color Usage
```tsx
// Don't rely solely on color for information
<DataGrid 
  items={[
    { 
      label: 'Account Status', 
      value: 'Active', 
      color: 'success',
      icon: <CheckCircleIcon />  // Icon reinforces status
    },
    { 
      label: 'Risk Level', 
      value: 'High Risk', 
      color: 'danger',
      icon: <WarningIcon />      // Icon reinforces risk level
    }
  ]}
/>
```

#### High Contrast Support
```tsx
// Ensure sufficient contrast in custom styling
<CompactCard 
  title="Important Notice"
  className="border-2 border-red-500 bg-red-50"  // High contrast border
>
  <Alert 
    type="error"
    message="Action required: Please update your account information"
  />
</CompactCard>
```

## Performance Optimization

### Component Memoization

#### Memoizing Expensive Components
```tsx
// Memoize components with expensive calculations
const MemoizedDataGrid = React.memo(function MemoizedDataGrid({ items, columns }) {
  const processedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      value: formatCurrency(item.value),
      color: calculateTrendColor(item.change)
    }));
  }, [items]);
  
  return <DataGrid items={processedItems} columns={columns} />;
});
```

#### Optimizing Action Handlers
```tsx
// Memoize action handlers to prevent re-renders
function InvestmentCard({ investment, onEdit, onDelete }) {
  const actions = useMemo(() => [
    { 
      id: 'edit', 
      label: 'Edit', 
      icon: <EditIcon />, 
      onClick: () => onEdit(investment.id) 
    },
    { 
      id: 'delete', 
      label: 'Delete', 
      icon: <DeleteIcon />, 
      onClick: () => onDelete(investment.id),
      variant: 'danger'
    }
  ], [investment.id, onEdit, onDelete]);
  
  return (
    <CompactCard title={investment.name}>
      <DataGrid items={investment.metrics} />
      <QuickActions actions={actions} />
    </CompactCard>
  );
}
```

### Bundle Optimization

#### Tree Shaking Friendly Imports
```tsx
// ✅ Good: Import only what you need
import { CompactCard, DataGrid, QuickActions } from '@/components/ui';

// ❌ Bad: Import entire library
import * as UI from '@/components/ui';
```

#### Lazy Loading for Large Components
```tsx
// Lazy load heavy components
const HeavyChartComponent = lazy(() => import('./HeavyChartComponent'));

function PortfolioAnalytics() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <CompactCard title="Portfolio Analytics">
      <QuickActions 
        actions={[
          { 
            id: 'show-chart', 
            label: 'Show Chart', 
            onClick: () => setShowChart(true),
            icon: <ChartIcon />
          }
        ]}
      />
      
      {showChart && (
        <Suspense fallback={<LoadingState message="Loading chart..." />}>
          <HeavyChartComponent />
        </Suspense>
      )}
    </CompactCard>
  );
}
```

## Responsive Design Patterns

### Mobile-First Approach

#### Responsive Card Layouts
```tsx
// Responsive grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <CompactCard title="Mobile-First Card">
    <DataGrid 
      items={data} 
      columns={1}  // Single column on mobile
      className="sm:grid-cols-2"  // Two columns on larger screens
    />
  </CompactCard>
</div>
```

#### Adaptive Action Layouts
```tsx
// Actions adapt to screen size
<QuickActions 
  actions={actions}
  layout="horizontal"  // Horizontal on desktop
  className="flex-col sm:flex-row"  // Vertical on mobile
  size="sm"  // Smaller on mobile
/>
```

### Touch-Friendly Design

#### Adequate Touch Targets
```tsx
// Ensure touch targets are large enough
<QuickActions 
  actions={mobileActions}
  size="lg"  // Larger touch targets on mobile
  className="touch-manipulation"  // Optimize for touch
/>
```

## Testing Patterns

### Component Testing

#### Testing Component Interactions
```tsx
// Test component behavior
describe('CompactCard', () => {
  test('toggles collapse state when collapsible', () => {
    render(
      <CompactCard title="Test Card" collapsible>
        <div data-testid="content">Content</div>
      </CompactCard>
    );
    
    const toggleButton = screen.getByLabelText(/collapse/i);
    const content = screen.getByTestId('content');
    
    expect(content).toBeVisible();
    
    fireEvent.click(toggleButton);
    expect(content).not.toBeVisible();
  });
});
```

#### Testing Action Handlers
```tsx
// Test QuickActions functionality
describe('QuickActions', () => {
  test('calls action handlers when clicked', () => {
    const handleEdit = jest.fn();
    const actions = [
      { id: 'edit', label: 'Edit', icon: <div />, onClick: handleEdit }
    ];
    
    render(<QuickActions actions={actions} />);
    
    fireEvent.click(screen.getByText('Edit'));
    expect(handleEdit).toHaveBeenCalledTimes(1);
  });
});
```

### Visual Regression Testing

#### Storybook Integration
```tsx
// Storybook stories for visual testing
export default {
  title: 'Components/CompactCard',
  component: CompactCard,
};

export const Default = () => (
  <CompactCard title="Default Card">
    <DataGrid items={sampleData} />
  </CompactCard>
);

export const WithActions = () => (
  <CompactCard 
    title="Card with Actions"
    actions={<QuickActions actions={sampleActions} />}
  >
    <DataGrid items={sampleData} />
  </CompactCard>
);
```

## Common Anti-Patterns to Avoid

### Component Misuse

#### ❌ Don't: Nest cards unnecessarily
```tsx
// Bad: Excessive nesting
<CompactCard title="Outer Card">
  <CompactCard title="Inner Card">
    <CompactCard title="Deep Card">
      <p>Content</p>
    </CompactCard>
  </CompactCard>
</CompactCard>
```

#### ✅ Do: Use proper hierarchy
```tsx
// Good: Logical structure
<CompactCard title="Investment Portfolio">
  <DataGrid items={portfolioSummary} />
  
  <div className="mt-4 space-y-2">
    {investments.map(investment => (
      <CompactCard 
        key={investment.id}
        title={investment.name}
        variant="minimal"
      >
        <DataGrid items={investment.metrics} />
      </CompactCard>
    ))}
  </div>
</CompactCard>
```

### Performance Anti-Patterns

#### ❌ Don't: Create actions in render
```tsx
// Bad: Creates new objects on every render
function InvestmentCard({ investment }) {
  return (
    <CompactCard title={investment.name}>
      <QuickActions 
        actions={[
          { id: 'edit', label: 'Edit', onClick: () => edit(investment.id) }
        ]}
      />
    </CompactCard>
  );
}
```

#### ✅ Do: Memoize actions
```tsx
// Good: Stable action references
function InvestmentCard({ investment, onEdit }) {
  const actions = useMemo(() => [
    { id: 'edit', label: 'Edit', onClick: () => onEdit(investment.id) }
  ], [investment.id, onEdit]);
  
  return (
    <CompactCard title={investment.name}>
      <QuickActions actions={actions} />
    </CompactCard>
  );
}
```

This best practices guide provides comprehensive guidance for using the component system effectively while maintaining performance, accessibility, and code quality standards.