# Component Migration Guide

## Overview

This guide provides detailed migration patterns for transitioning from legacy UI components to the modern compact component system. It includes specific examples, common pitfalls, and step-by-step migration instructions.

## Migration Strategy

### Phase-by-Phase Approach

1. **Assessment Phase**
   - Identify all legacy component usage
   - Categorize by migration complexity
   - Plan migration order based on impact

2. **Replacement Phase**
   - Replace high-usage components first
   - Update imports and prop mappings
   - Test functionality after each replacement

3. **Cleanup Phase**
   - Remove unused legacy components
   - Update documentation
   - Standardize import patterns

## Component Migration Mappings

### Card Components

#### Legacy Card → CompactCard

**Old Component:**
```tsx
// Legacy Card component
<Card 
  title="Investment Summary"
  subtitle="Last updated: Today"
  className="investment-card"
  collapsible={true}
>
  <div className="card-content">
    <p>Total Value: ₹1,50,000</p>
    <p>Today's Change: +₹2,500</p>
  </div>
</Card>
```

**New Component:**
```tsx
// Modern CompactCard
<CompactCard 
  title="Investment Summary"
  subtitle="Last updated: Today"
  className="investment-card"
  collapsible={true}
  variant="default"
>
  <DataGrid 
    items={[
      { label: 'Total Value', value: '₹1,50,000' },
      { label: "Today's Change", value: '+₹2,500', color: 'success' }
    ]}
    columns={2}
  />
</CompactCard>
```

**Migration Steps:**
1. Replace `Card` import with `CompactCard`
2. Props remain mostly the same
3. Consider using `DataGrid` for structured data
4. Add `variant` prop if needed
5. Test collapsible functionality

#### Legacy InfoCard → CompactCard

**Old Component:**
```tsx
// Legacy InfoCard
<InfoCard 
  icon={<AccountIcon />}
  title="Zerodha Account"
  value="₹45,000"
  change="+2.5%"
  changeType="positive"
/>
```

**New Component:**
```tsx
// Modern CompactCard with DataGrid
<CompactCard 
  title="Zerodha Account"
  icon={<AccountIcon />}
  variant="minimal"
>
  <DataGrid 
    items={[
      { 
        label: 'Current Value', 
        value: '₹45,000', 
        subValue: '+2.5%', 
        color: 'success' 
      }
    ]}
    columns={1}
    variant="compact"
  />
</CompactCard>
```

**Migration Steps:**
1. Replace `InfoCard` with `CompactCard`
2. Move `icon` to CompactCard props
3. Convert value/change to DataGrid items
4. Map `changeType` to DataGrid color
5. Use `minimal` variant for compact display

### Action Components

#### Legacy ButtonGroup → QuickActions

**Old Component:**
```tsx
// Legacy ButtonGroup
<ButtonGroup 
  buttons={[
    { label: 'Edit', onClick: handleEdit, icon: 'edit' },
    { label: 'Delete', onClick: handleDelete, icon: 'delete', variant: 'danger' },
    { label: 'Share', onClick: handleShare, icon: 'share' }
  ]}
  size="small"
  layout="horizontal"
/>
```

**New Component:**
```tsx
// Modern QuickActions
<QuickActions 
  actions={[
    { 
      id: 'edit', 
      label: 'Edit', 
      onClick: handleEdit, 
      icon: <EditIcon /> 
    },
    { 
      id: 'delete', 
      label: 'Delete', 
      onClick: handleDelete, 
      icon: <DeleteIcon />, 
      variant: 'danger' 
    },
    { 
      id: 'share', 
      label: 'Share', 
      onClick: handleShare, 
      icon: <ShareIcon /> 
    }
  ]}
  size="sm"
  layout="horizontal"
/>
```

**Migration Steps:**
1. Replace `ButtonGroup` with `QuickActions`
2. Change `buttons` prop to `actions`
3. Add unique `id` to each action
4. Replace string icons with React components
5. Map size: `small` → `sm`, `medium` → `md`, `large` → `lg`

#### Legacy ActionButtons → QuickActions

**Old Component:**
```tsx
// Legacy ActionButtons
<ActionButtons>
  <ActionButton 
    icon="plus" 
    label="Add Investment" 
    onClick={handleAdd}
    primary
  />
  <ActionButton 
    icon="import" 
    label="Import Data" 
    onClick={handleImport}
  />
  <ActionButton 
    icon="export" 
    label="Export" 
    onClick={handleExport}
  />
</ActionButtons>
```

**New Component:**
```tsx
// Modern QuickActions
<QuickActions 
  actions={[
    { 
      id: 'add', 
      label: 'Add Investment', 
      icon: <PlusIcon />, 
      onClick: handleAdd,
      variant: 'primary'
    },
    { 
      id: 'import', 
      label: 'Import Data', 
      icon: <ImportIcon />, 
      onClick: handleImport 
    },
    { 
      id: 'export', 
      label: 'Export', 
      icon: <ExportIcon />, 
      onClick: handleExport 
    }
  ]}
/>
```

**Migration Steps:**
1. Replace `ActionButtons` wrapper with `QuickActions`
2. Convert each `ActionButton` to action object
3. Map `primary` prop to `variant: 'primary'`
4. Replace string icons with React components
5. Add unique `id` for each action

### Data Display Components

#### Legacy StatsGrid → DataGrid

**Old Component:**
```tsx
// Legacy StatsGrid
<StatsGrid 
  stats={[
    { label: 'Total Investments', value: '12', icon: 'portfolio' },
    { label: 'Current Value', value: '₹2,45,000', trend: 'up' },
    { label: 'Total Returns', value: '₹45,000', percentage: '+22.5%', trend: 'up' },
    { label: 'Today Change', value: '₹1,250', percentage: '+0.51%', trend: 'up' }
  ]}
  columns={4}
/>
```

**New Component:**
```tsx
// Modern DataGrid
<DataGrid 
  items={[
    { 
      label: 'Total Investments', 
      value: '12', 
      icon: <PortfolioIcon /> 
    },
    { 
      label: 'Current Value', 
      value: '₹2,45,000', 
      color: 'success' 
    },
    { 
      label: 'Total Returns', 
      value: '₹45,000', 
      subValue: '+22.5%', 
      color: 'success' 
    },
    { 
      label: 'Today Change', 
      value: '₹1,250', 
      subValue: '+0.51%', 
      color: 'success' 
    }
  ]}
  columns={4}
/>
```

**Migration Steps:**
1. Replace `StatsGrid` with `DataGrid`
2. Change `stats` prop to `items`
3. Replace string icons with React components
4. Map `trend` to `color` (up → success, down → danger)
5. Move `percentage` to `subValue`

#### Legacy MetricsDisplay → DataGrid

**Old Component:**
```tsx
// Legacy MetricsDisplay
<MetricsDisplay 
  metrics={portfolioMetrics}
  layout="grid"
  showIcons={true}
  colorCoding={true}
/>
```

**New Component:**
```tsx
// Modern DataGrid
<DataGrid 
  items={portfolioMetrics.map(metric => ({
    label: metric.name,
    value: metric.value,
    subValue: metric.change,
    color: metric.trend === 'positive' ? 'success' : 
           metric.trend === 'negative' ? 'danger' : 'default',
    icon: metric.icon ? <metric.icon /> : undefined
  }))}
  columns={3}
  variant="default"
/>
```

**Migration Steps:**
1. Replace `MetricsDisplay` with `DataGrid`
2. Transform metrics data structure
3. Map trend values to color props
4. Convert icon references to React components
5. Set appropriate column count

### State Components

#### Legacy Spinner → LoadingState

**Old Component:**
```tsx
// Legacy Spinner
{isLoading && (
  <div className="loading-container">
    <Spinner size="large" />
    <p>Loading portfolio data...</p>
  </div>
)}
```

**New Component:**
```tsx
// Modern LoadingState
{isLoading && (
  <LoadingState 
    message="Loading portfolio data..."
    size="lg"
  />
)}
```

**Migration Steps:**
1. Replace custom loading markup with `LoadingState`
2. Move loading message to `message` prop
3. Map size: `large` → `lg`, `medium` → `md`, `small` → `sm`
4. Remove custom container styling

#### Legacy ErrorMessage → ErrorState

**Old Component:**
```tsx
// Legacy ErrorMessage
{error && (
  <div className="error-container">
    <ErrorIcon />
    <h3>Something went wrong</h3>
    <p>{error.message}</p>
    <button onClick={handleRetry}>Try Again</button>
  </div>
)}
```

**New Component:**
```tsx
// Modern ErrorState
{error && (
  <ErrorState 
    title="Something went wrong"
    message={error.message}
    onRetry={handleRetry}
    retryText="Try Again"
  />
)}
```

**Migration Steps:**
1. Replace custom error markup with `ErrorState`
2. Move title and message to props
3. Convert retry button to `onRetry` callback
4. Remove custom styling and icons

### Notification Components

#### Legacy NotificationBanner → Alert

**Old Component:**
```tsx
// Legacy NotificationBanner
<NotificationBanner 
  type="success"
  title="Import Successful"
  message="25 transactions imported successfully"
  dismissible={true}
  onDismiss={handleDismiss}
/>
```

**New Component:**
```tsx
// Modern Alert
<Alert 
  type="success"
  title="Import Successful"
  message="25 transactions imported successfully"
  onClose={handleDismiss}
/>
```

**Migration Steps:**
1. Replace `NotificationBanner` with `Alert`
2. Change `onDismiss` to `onClose`
3. Remove `dismissible` prop (handled automatically if `onClose` provided)
4. Props remain mostly the same

## Common Migration Patterns

### Prop Mapping Reference

| Legacy Prop | Modern Prop | Notes |
|-------------|-------------|-------|
| `buttons` | `actions` | Array structure changed |
| `stats` | `items` | Object structure changed |
| `trend` | `color` | Value mapping required |
| `primary` | `variant: 'primary'` | Boolean to string |
| `dismissible` | `onClose` | Implicit if callback provided |
| `size: 'large'` | `size: 'lg'` | String value change |
| `layout: 'horizontal'` | `layout: 'horizontal'` | Same value |

### Icon Migration

**Legacy String Icons:**
```tsx
// Old pattern
icon="edit"
icon="delete"
icon="plus"
```

**Modern React Icons:**
```tsx
// New pattern
icon={<EditIcon />}
icon={<DeleteIcon />}
icon={<PlusIcon />}
```

### Event Handler Updates

**Legacy Patterns:**
```tsx
// Old button structure
buttons={[
  { label: 'Save', onClick: handleSave, primary: true }
]}
```

**Modern Patterns:**
```tsx
// New action structure
actions={[
  { 
    id: 'save', 
    label: 'Save', 
    onClick: handleSave, 
    variant: 'primary',
    icon: <SaveIcon />
  }
]}
```

## Step-by-Step Migration Process

### 1. Pre-Migration Assessment

```bash
# Find all legacy component usage
grep -r "Card\|ButtonGroup\|StatsGrid" src/components/
grep -r "InfoCard\|ActionButtons\|MetricsDisplay" src/components/
grep -r "Spinner\|ErrorMessage\|NotificationBanner" src/components/
```

### 2. Create Migration Checklist

- [ ] Identify all legacy component instances
- [ ] Plan migration order (high-usage first)
- [ ] Prepare test cases for each component
- [ ] Update import statements
- [ ] Map props and event handlers
- [ ] Test functionality and styling
- [ ] Remove unused legacy components

### 3. Migration Implementation

#### Step 1: Update Imports
```tsx
// Before
import { Card, ButtonGroup, StatsGrid } from '../ui/legacy';

// After
import { CompactCard, QuickActions, DataGrid } from '../ui';
```

#### Step 2: Replace Components
```tsx
// Before
<Card title="Portfolio">
  <StatsGrid stats={data} />
  <ButtonGroup buttons={actions} />
</Card>

// After
<CompactCard title="Portfolio">
  <DataGrid items={data} />
  <QuickActions actions={actions} />
</CompactCard>
```

#### Step 3: Update Props
```tsx
// Before
const actions = [
  { label: 'Edit', onClick: handleEdit, primary: true }
];

// After
const actions = [
  { 
    id: 'edit', 
    label: 'Edit', 
    onClick: handleEdit, 
    variant: 'primary',
    icon: <EditIcon />
  }
];
```

### 4. Testing Migration

#### Unit Tests
```tsx
// Test component rendering
test('renders CompactCard with correct props', () => {
  render(
    <CompactCard title="Test Card">
      <div>Content</div>
    </CompactCard>
  );
  expect(screen.getByText('Test Card')).toBeInTheDocument();
});

// Test action functionality
test('QuickActions handles click events', () => {
  const handleClick = jest.fn();
  const actions = [
    { id: 'test', label: 'Test', onClick: handleClick, icon: <div /> }
  ];
  
  render(<QuickActions actions={actions} />);
  fireEvent.click(screen.getByText('Test'));
  expect(handleClick).toHaveBeenCalled();
});
```

#### Visual Testing
```tsx
// Storybook story for visual testing
export const MigratedCard = () => (
  <CompactCard title="Migrated Component">
    <DataGrid items={sampleData} />
    <QuickActions actions={sampleActions} />
  </CompactCard>
);
```

### 5. Post-Migration Cleanup

#### Remove Legacy Components
```bash
# Remove unused legacy component files
rm src/components/ui/legacy/Card.tsx
rm src/components/ui/legacy/ButtonGroup.tsx
rm src/components/ui/legacy/StatsGrid.tsx
```

#### Update Exports
```tsx
// Remove from src/components/ui/index.ts
// export { default as Card } from './legacy/Card';
// export { default as ButtonGroup } from './legacy/ButtonGroup';

// Ensure new components are exported
export { default as CompactCard } from './CompactCard';
export { default as QuickActions } from './QuickActions';
export { default as DataGrid } from './DataGrid';
```

## Troubleshooting Common Issues

### TypeScript Errors

**Issue:** Property does not exist on type
```tsx
// Error: Property 'buttons' does not exist on type 'QuickActionsProps'
<QuickActions buttons={actionList} />
```

**Solution:** Update prop name
```tsx
// Fixed: Use correct prop name
<QuickActions actions={actionList} />
```

### Styling Issues

**Issue:** Component styling looks different
```tsx
// Problem: Missing variant or size
<CompactCard title="Card">Content</CompactCard>
```

**Solution:** Add appropriate variant
```tsx
// Fixed: Add variant to match legacy styling
<CompactCard title="Card" variant="default">Content</CompactCard>
```

### Event Handler Issues

**Issue:** Click handlers not working
```tsx
// Problem: Missing id in action object
actions={[
  { label: 'Edit', onClick: handleEdit, icon: <EditIcon /> }
]}
```

**Solution:** Add required id field
```tsx
// Fixed: Include unique id
actions={[
  { id: 'edit', label: 'Edit', onClick: handleEdit, icon: <EditIcon /> }
]}
```

## Best Practices for Migration

### 1. Incremental Migration
- Migrate one component type at a time
- Test thoroughly after each migration
- Keep legacy components until migration is complete

### 2. Maintain Functionality
- Ensure all existing functionality is preserved
- Test user interactions and edge cases
- Verify accessibility features work correctly

### 3. Consistent Patterns
- Use consistent prop naming across migrations
- Follow established component patterns
- Document any custom adaptations needed

### 4. Performance Considerations
- Monitor bundle size changes
- Test rendering performance
- Optimize re-renders where necessary

This migration guide provides comprehensive patterns and examples for successfully transitioning from legacy components to the modern compact component system.