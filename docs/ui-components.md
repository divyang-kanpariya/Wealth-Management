# UI Component Usage Documentation

## Overview

This document provides comprehensive usage guidelines for the modernized UI component system in the Personal Wealth Management application. The components follow a consistent design system with compact, accessible, and responsive patterns.

## Component Categories

### Modern Compact Components
- **CompactCard** - Flexible card component with variants and collapsible functionality
- **QuickActions** - Action button groups with consistent styling and layouts
- **DataGrid** - Flexible data display component for metrics and statistics
- **LoadingState** - Standardized loading indicators with customizable messages
- **ErrorState** - Consistent error display with retry functionality
- **Alert** - Notification and message component with multiple types

### Core UI Components
- **Button** - Primary action component with variants and loading states
- **Modal** - Overlay component for dialogs and forms
- **Input** - Form input with validation and icon support
- **Select** - Dropdown selection with validation
- **LoadingSpinner** - Basic spinner component

## Component Reference

### CompactCard

A flexible card component that supports multiple variants, collapsible content, and action buttons.

#### Props

```typescript
interface CompactCardProps {
  title?: string;                    // Card title
  subtitle?: string;                 // Card subtitle
  children: React.ReactNode;         // Card content
  className?: string;                // Additional CSS classes
  collapsible?: boolean;             // Enable collapse functionality
  defaultCollapsed?: boolean;        // Initial collapsed state
  actions?: React.ReactNode;         // Action buttons in header
  icon?: React.ReactNode;           // Icon in header
  badge?: string | number;          // Badge in header
  variant?: 'default' | 'minimal' | 'dense'; // Visual variant
}
```

#### Usage Examples

```tsx
// Basic card
<CompactCard title="Portfolio Summary">
  <p>Your portfolio content here</p>
</CompactCard>

// Card with actions and badge
<CompactCard 
  title="Investment Account"
  subtitle="Zerodha Demat"
  badge="Active"
  actions={
    <QuickActions actions={[
      { id: 'edit', label: 'Edit', icon: <EditIcon />, onClick: handleEdit }
    ]} />
  }
>
  <DataGrid items={accountData} />
</CompactCard>

// Collapsible minimal card
<CompactCard 
  title="Advanced Settings"
  variant="minimal"
  collapsible
  defaultCollapsed
>
  <div>Settings content</div>
</CompactCard>

// Dense variant for compact layouts
<CompactCard 
  title="Quick Stats"
  variant="dense"
  icon={<StatsIcon />}
>
  <DataGrid items={stats} columns={3} variant="compact" />
</CompactCard>
```

#### Variants

- **default**: Standard card with full padding and shadow
- **minimal**: Reduced styling with gray background
- **dense**: Compact spacing with colored left border

### QuickActions

Action button groups with consistent styling and flexible layouts.

#### Props

```typescript
interface QuickAction {
  id: string;                       // Unique identifier
  label: string;                    // Button label
  icon: React.ReactNode;           // Button icon
  onClick: () => void;             // Click handler
  disabled?: boolean;              // Disabled state
  variant?: 'primary' | 'secondary' | 'danger' | 'success'; // Visual variant
  tooltip?: string;                // Tooltip text
}

interface QuickActionsProps {
  actions: QuickAction[];          // Array of actions
  className?: string;              // Additional CSS classes
  size?: 'sm' | 'md' | 'lg';      // Button size
  layout?: 'horizontal' | 'vertical' | 'grid'; // Layout direction
}
```

#### Usage Examples

```tsx
// Horizontal action buttons
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

// Vertical layout for sidebars
<QuickActions 
  layout="vertical"
  size="sm"
  actions={sidebarActions}
/>

// Grid layout for compact spaces
<QuickActions 
  layout="grid"
  actions={[
    { id: 'edit', label: 'Edit', icon: <EditIcon />, onClick: handleEdit },
    { id: 'delete', label: 'Delete', icon: <DeleteIcon />, onClick: handleDelete, variant: 'danger' },
    { id: 'share', label: 'Share', icon: <ShareIcon />, onClick: handleShare },
    { id: 'copy', label: 'Copy', icon: <CopyIcon />, onClick: handleCopy }
  ]}
/>
```

### DataGrid

Flexible data display component for metrics, statistics, and key-value pairs.

#### Props

```typescript
interface DataGridItem {
  label: string;                    // Item label
  value: React.ReactNode;          // Item value
  subValue?: React.ReactNode;      // Secondary value
  color?: 'default' | 'success' | 'danger' | 'warning' | 'info'; // Value color
  icon?: React.ReactNode;          // Item icon
  tooltip?: string;                // Tooltip text
}

interface DataGridProps {
  items: DataGridItem[];           // Array of data items
  columns?: 1 | 2 | 3 | 4 | 6;    // Number of columns
  variant?: 'default' | 'compact' | 'minimal'; // Visual variant
  className?: string;              // Additional CSS classes
}
```

#### Usage Examples

```tsx
// Portfolio metrics
<DataGrid 
  columns={3}
  items={[
    { 
      label: 'Total Value', 
      value: '₹2,45,000', 
      color: 'success',
      icon: <TrendingUpIcon />
    },
    { 
      label: 'Today\'s Change', 
      value: '+₹1,250', 
      subValue: '+0.51%',
      color: 'success'
    },
    { 
      label: 'Invested Amount', 
      value: '₹2,00,000',
      color: 'default'
    }
  ]}
/>

// Compact account summary
<DataGrid 
  variant="compact"
  columns={2}
  items={[
    { label: 'Account Type', value: 'Demat Account' },
    { label: 'Broker', value: 'Zerodha' },
    { label: 'Status', value: 'Active', color: 'success' },
    { label: 'Holdings', value: '12 stocks' }
  ]}
/>

// Minimal stats for dense layouts
<DataGrid 
  variant="minimal"
  columns={4}
  items={quickStats}
/>
```

### LoadingState

Standardized loading component with customizable messages and sizes.

#### Props

```typescript
interface LoadingStateProps {
  message?: string;                // Loading message
  size?: 'sm' | 'md' | 'lg';      // Spinner size
  fullScreen?: boolean;            // Full screen overlay
  className?: string;              // Additional CSS classes
}
```

#### Usage Examples

```tsx
// Basic loading state
<LoadingState message="Loading portfolio data..." />

// Full screen loading
<LoadingState 
  message="Importing transactions..." 
  fullScreen 
  size="lg" 
/>

// Small loading for components
<LoadingState 
  message="Updating prices..." 
  size="sm" 
/>
```

### ErrorState

Consistent error display with optional retry functionality.

#### Props

```typescript
interface ErrorStateProps {
  title?: string;                  // Error title
  message: string;                 // Error message
  onRetry?: () => void;           // Retry callback
  retryText?: string;             // Retry button text
  fullScreen?: boolean;           // Full screen display
  className?: string;             // Additional CSS classes
}
```

#### Usage Examples

```tsx
// Basic error state
<ErrorState 
  message="Failed to load investment data. Please try again." 
  onRetry={handleRetry}
/>

// Error with custom title
<ErrorState 
  title="Import Failed"
  message="The CSV file format is invalid. Please check the file and try again."
  onRetry={handleRetryImport}
  retryText="Choose Different File"
/>

// Full screen error
<ErrorState 
  title="Connection Error"
  message="Unable to connect to the server. Please check your internet connection."
  fullScreen
  onRetry={handleReconnect}
/>
```

### Alert

Notification component for success, error, warning, and info messages.

#### Props

```typescript
interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info'; // Alert type
  title?: string;                  // Alert title
  message: string | React.ReactNode; // Alert message
  onClose?: () => void;           // Close callback
  className?: string;             // Additional CSS classes
}
```

#### Usage Examples

```tsx
// Success notification
<Alert 
  type="success"
  title="Import Successful"
  message="25 transactions have been imported successfully."
  onClose={handleClose}
/>

// Warning alert
<Alert 
  type="warning"
  message="Some price data is outdated. Consider refreshing the prices."
/>

// Error alert with JSX content
<Alert 
  type="error"
  title="Validation Error"
  message={
    <div>
      <p>The following fields are required:</p>
      <ul className="list-disc list-inside mt-1">
        <li>Investment name</li>
        <li>Purchase date</li>
        <li>Amount</li>
      </ul>
    </div>
  }
/>
```

### Button

Primary action component with multiple variants and loading states.

#### Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success'; // Visual variant
  size?: 'sm' | 'md' | 'lg';      // Button size
  loading?: boolean;               // Loading state
  children: React.ReactNode;       // Button content
  leftIcon?: React.ReactNode;      // Left icon
  rightIcon?: React.ReactNode;     // Right icon
}
```

#### Usage Examples

```tsx
// Primary action button
<Button variant="primary" onClick={handleSave}>
  Save Investment
</Button>

// Button with loading state
<Button 
  variant="primary" 
  loading={isSubmitting}
  onClick={handleSubmit}
>
  {isSubmitting ? 'Saving...' : 'Save Changes'}
</Button>

// Button with icons
<Button 
  variant="outline"
  leftIcon={<DownloadIcon />}
  onClick={handleExport}
>
  Export Data
</Button>

// Danger button for destructive actions
<Button 
  variant="danger"
  size="sm"
  rightIcon={<TrashIcon />}
  onClick={handleDelete}
>
  Delete
</Button>
```

### Modal

Overlay component for dialogs, forms, and detailed views.

#### Props

```typescript
interface ModalProps {
  isOpen: boolean;                 // Modal visibility
  onClose: () => void;            // Close callback
  title?: string;                 // Modal title
  children: React.ReactNode;      // Modal content
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Modal size
  showCloseButton?: boolean;      // Show close button
  variant?: 'default' | 'compact'; // Visual variant
  className?: string;             // Additional CSS classes
}
```

#### Usage Examples

```tsx
// Basic modal
<Modal 
  isOpen={isModalOpen}
  onClose={handleCloseModal}
  title="Add New Investment"
>
  <InvestmentForm onSubmit={handleSubmit} />
</Modal>

// Large modal for complex forms
<Modal 
  isOpen={isImportModalOpen}
  onClose={handleCloseImport}
  title="Import Transactions"
  size="lg"
>
  <ImportWizard />
</Modal>

// Compact modal for quick actions
<Modal 
  isOpen={isQuickEditOpen}
  onClose={handleCloseQuickEdit}
  variant="compact"
  size="sm"
>
  <QuickEditForm />
</Modal>
```

### Input

Form input component with validation, icons, and helper text.

#### Props

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;                 // Input label
  error?: string | string[];      // Error message(s)
  helperText?: string;           // Helper text
  leftIcon?: React.ReactNode;    // Left icon
  rightIcon?: React.ReactNode;   // Right icon
}
```

#### Usage Examples

```tsx
// Basic input with label
<Input 
  label="Investment Name"
  placeholder="Enter investment name"
  value={investmentName}
  onChange={(e) => setInvestmentName(e.target.value)}
/>

// Input with validation error
<Input 
  label="Amount"
  type="number"
  value={amount}
  onChange={handleAmountChange}
  error={amountError}
  leftIcon={<CurrencyIcon />}
/>

// Input with helper text
<Input 
  label="ISIN Code"
  placeholder="INE123456789"
  helperText="12-character alphanumeric code for the security"
  rightIcon={<InfoIcon />}
/>
```

### Select

Dropdown selection component with validation and options.

#### Props

```typescript
interface SelectOption {
  value: string;                  // Option value
  label: string;                  // Option label
  disabled?: boolean;             // Disabled state
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;                 // Select label
  error?: string | string[];      // Error message(s)
  helperText?: string;           // Helper text
  options: SelectOption[];       // Available options
  placeholder?: string;          // Placeholder text
}
```

#### Usage Examples

```tsx
// Basic select
<Select 
  label="Investment Type"
  placeholder="Choose investment type"
  options={[
    { value: 'stock', label: 'Stock' },
    { value: 'mutual_fund', label: 'Mutual Fund' },
    { value: 'bond', label: 'Bond' }
  ]}
  value={investmentType}
  onChange={(e) => setInvestmentType(e.target.value)}
/>

// Select with validation
<Select 
  label="Account"
  options={accountOptions}
  value={selectedAccount}
  onChange={handleAccountChange}
  error={accountError}
  helperText="Select the account for this investment"
/>
```

## Best Practices

### Component Selection Guidelines

1. **Use CompactCard for content grouping**
   - Wrap related information in cards
   - Use variants based on content density
   - Enable collapsible for optional content

2. **Use QuickActions for action grouping**
   - Group related actions together
   - Use appropriate variants for action importance
   - Consider layout based on available space

3. **Use DataGrid for metrics display**
   - Display key-value pairs and statistics
   - Use colors to indicate status or trends
   - Adjust columns based on screen size

4. **Use consistent loading and error states**
   - Always use LoadingState for async operations
   - Use ErrorState with retry for recoverable errors
   - Use Alert for notifications and feedback

### Accessibility Guidelines

1. **Keyboard Navigation**
   - All interactive components support keyboard navigation
   - Use Tab and Enter/Space for activation
   - Modal components trap focus appropriately

2. **Screen Reader Support**
   - All components include appropriate ARIA labels
   - Error states are announced to screen readers
   - Loading states provide status updates

3. **Color and Contrast**
   - Don't rely solely on color for information
   - All text meets WCAG contrast requirements
   - Use icons and text together for clarity

### Performance Considerations

1. **Component Optimization**
   - Components use React.memo where appropriate
   - Event handlers are memoized to prevent re-renders
   - Large data sets should be virtualized

2. **Bundle Size**
   - Import only needed components
   - Use tree-shaking friendly imports
   - Consider lazy loading for large modals

### Responsive Design

1. **Mobile-First Approach**
   - All components are mobile-responsive
   - Touch targets meet minimum size requirements
   - Content adapts to different screen sizes

2. **Breakpoint Usage**
   - Use Tailwind's responsive prefixes
   - Test components at all breakpoints
   - Consider content priority on smaller screens

## Migration Patterns

### Legacy Component Replacements

#### Card Components → CompactCard

```tsx
// Old pattern
<Card title="Portfolio" className="mb-4">
  <div className="stats">...</div>
</Card>

// New pattern
<CompactCard title="Portfolio" className="mb-4">
  <DataGrid items={stats} />
</CompactCard>
```

#### Button Groups → QuickActions

```tsx
// Old pattern
<div className="button-group">
  <button onClick={handleEdit}>Edit</button>
  <button onClick={handleDelete}>Delete</button>
</div>

// New pattern
<QuickActions 
  actions={[
    { id: 'edit', label: 'Edit', icon: <EditIcon />, onClick: handleEdit },
    { id: 'delete', label: 'Delete', icon: <DeleteIcon />, onClick: handleDelete, variant: 'danger' }
  ]}
/>
```

#### Custom Loading → LoadingState

```tsx
// Old pattern
{isLoading && <div className="spinner">Loading...</div>}

// New pattern
{isLoading && <LoadingState message="Loading data..." />}
```

### Common Migration Steps

1. **Identify the legacy component**
2. **Find the appropriate modern replacement**
3. **Map old props to new props**
4. **Update imports and exports**
5. **Test functionality and styling**
6. **Remove unused legacy component**

## Testing Guidelines

### Component Testing

1. **Unit Tests**
   - Test all prop variations
   - Test user interactions
   - Test accessibility features
   - Test error states

2. **Integration Tests**
   - Test component combinations
   - Test responsive behavior
   - Test keyboard navigation
   - Test screen reader compatibility

### Visual Testing

1. **Storybook Stories**
   - Create stories for all variants
   - Include interactive examples
   - Document prop options
   - Show responsive behavior

2. **Screenshot Testing**
   - Capture component states
   - Test across browsers
   - Verify responsive layouts
   - Check dark mode compatibility

## Troubleshooting

### Common Issues

1. **TypeScript Errors**
   - Ensure proper prop types
   - Check import statements
   - Verify component exports

2. **Styling Issues**
   - Check Tailwind class conflicts
   - Verify responsive classes
   - Test component combinations

3. **Accessibility Issues**
   - Run accessibility audits
   - Test keyboard navigation
   - Verify ARIA attributes

### Getting Help

1. **Documentation**
   - Check component prop interfaces
   - Review usage examples
   - Read best practices

2. **Testing**
   - Run component tests
   - Check Storybook stories
   - Test in different browsers

This documentation provides comprehensive guidance for using the modernized UI component system effectively and consistently across the application.

## Related Documentation

- **[Component Migration Guide](./component-migration-guide.md)** - Detailed patterns for migrating from legacy components
- **[Component Best Practices](./component-best-practices.md)** - Best practices for component usage, composition, and optimization
- **[Component Examples](./component-examples.md)** - Practical, real-world implementation examples

## Quick Reference

For quick access to common patterns:
- **Card layouts**: Use CompactCard with DataGrid for structured content
- **Action groups**: Use QuickActions for related button groups
- **Loading states**: Use LoadingState for async operations
- **Error handling**: Use ErrorState with retry functionality
- **Notifications**: Use Alert for user feedback