# Component Migration Mapping

## Overview

This document defines the mapping between legacy components and new compact components, including prop transformations, breaking changes, and migration complexity assessments.

## Component Migration Map

### 1. Card Components → CompactCard

#### Legacy Components to Replace
- **PortfolioSummary** (dashboard) → Use CompactCard + DataGrid
- **AssetAllocation** (dashboard) → Use CompactCard + CompactTable/TabPanel
- **GoalProgress** (dashboard) → Use CompactCard + CompactTable
- **Custom card-like divs** with `bg-white rounded-lg shadow-md p-6` → CompactCard

#### Prop Mapping
```typescript
// Legacy pattern
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-semibold text-gray-800 mb-4">Title</h2>
  {/* content */}
</div>

// New CompactCard
<CompactCard
  title="Title"
  variant="default"
  className="mb-4"
>
  {/* content */}
</CompactCard>
```

#### Breaking Changes
- Manual title styling replaced with `title` prop
- Custom padding/margin classes need to be adjusted
- Shadow and border styling handled by variant prop

#### Migration Complexity: **Medium**
- Requires restructuring of content layout
- Need to extract titles from JSX to props
- Some custom styling may need adjustment

### 2. Loading Patterns → LoadingState

#### Legacy Components to Replace
- **Direct LoadingSpinner usage** with wrapper divs
- **Custom animate-spin divs** in Table.tsx, CompactTable.tsx, ImportModal.tsx, ImportHistoryModal.tsx
- **Inline loading patterns** with "Loading..." text

#### Prop Mapping
```typescript
// Legacy pattern
<div className="flex justify-center items-center py-12">
  <LoadingSpinner size="lg" />
  <p className="mt-4 text-gray-600">Loading investments...</p>
</div>

// New LoadingState
<LoadingState
  message="Loading investments..."
  size="lg"
/>

// Legacy custom spinner
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
<p className="mt-2 text-gray-600">Loading...</p>

// New LoadingState
<LoadingState
  message="Loading..."
  size="md"
/>
```

#### Breaking Changes
- Wrapper div structure changes
- Message positioning handled internally
- Size prop values may need adjustment

#### Migration Complexity: **Low**
- Simple prop mapping
- Minimal structural changes
- Easy to identify and replace

### 3. Data Display Patterns → DataGrid

#### Legacy Components to Replace
- **PortfolioSummary grid layout** → DataGrid
- **Custom metric display grids** → DataGrid
- **Stats display patterns** → DataGrid

#### Prop Mapping
```typescript
// Legacy pattern
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="bg-blue-50 rounded-lg p-4">
    <div className="text-sm font-medium text-blue-600 mb-1">Total Value</div>
    <div className="text-2xl font-bold text-blue-900">{value}</div>
  </div>
</div>

// New DataGrid
<DataGrid
  items={[
    {
      label: 'Total Value',
      value: value,
      color: 'info',
      icon: <IconComponent />
    }
  ]}
  columns={4}
  variant="default"
/>
```

#### Breaking Changes
- Grid structure completely changes to item-based array
- Color classes replaced with semantic color props
- Icons need to be provided as React nodes

#### Migration Complexity: **High**
- Requires complete restructuring of data
- Need to convert layout to item array format
- Color and styling logic needs refactoring

### 4. Action Button Patterns → QuickActions

#### Legacy Components to Replace
- **Custom button groups** in various components
- **Action button arrays** in headers and toolbars
- **Inline button collections**

#### Prop Mapping
```typescript
// Legacy pattern
<div className="flex space-x-2">
  <button onClick={action1} className="btn-primary">Action 1</button>
  <button onClick={action2} className="btn-secondary">Action 2</button>
</div>

// New QuickActions
<QuickActions
  actions={[
    {
      id: 'action1',
      label: 'Action 1',
      icon: <Icon1 />,
      onClick: action1,
      variant: 'primary'
    },
    {
      id: 'action2',
      label: 'Action 2',
      icon: <Icon2 />,
      onClick: action2,
      variant: 'secondary'
    }
  ]}
  layout="horizontal"
  size="md"
/>
```

#### Breaking Changes
- Button structure changes to action object array
- Icons are required for each action
- Styling handled by variant prop instead of CSS classes

#### Migration Complexity: **Medium**
- Need to restructure button definitions
- Icons need to be added to all actions
- Event handlers remain the same

### 5. Table Loading States → LoadingState

#### Legacy Components to Replace
- **Table.tsx loading state** with custom spinner
- **CompactTable.tsx loading state** with custom spinner
- **Other table loading patterns**

#### Prop Mapping
```typescript
// Legacy pattern (in Table.tsx)
if (loading) {
  return (
    <div className="bg-white shadow-sm rounded-lg border">
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// New LoadingState
if (loading) {
  return (
    <div className="bg-white shadow-sm rounded-lg border">
      <LoadingState message="Loading..." size="md" />
    </div>
  );
}
```

#### Breaking Changes
- Spinner implementation changes
- Container structure may need adjustment

#### Migration Complexity: **Low**
- Simple replacement of loading UI
- Minimal prop changes needed

### 6. Error Display Patterns → ErrorState

#### Legacy Components to Replace
- **Custom error messages** in various components
- **Error display patterns** without retry functionality
- **Inconsistent error styling**

#### Prop Mapping
```typescript
// Legacy pattern
<div className="text-center py-8">
  <p className="text-red-600">Error loading data</p>
</div>

// New ErrorState
<ErrorState
  message="Error loading data"
  onRetry={retryFunction}
  retryText="Try again"
/>
```

#### Breaking Changes
- Error display structure changes
- Retry functionality becomes standardized
- Styling handled by component

#### Migration Complexity: **Low**
- Simple prop mapping
- Optional retry functionality
- Consistent error presentation

### 7. Notification Patterns → Alert

#### Legacy Components to Replace
- **Custom success/error messages**
- **Inline notification displays**
- **Status message patterns**

#### Prop Mapping
```typescript
// Legacy pattern
<div className="bg-green-50 border border-green-200 rounded-md p-4">
  <div className="text-green-800">Success message</div>
</div>

// New Alert
<Alert
  type="success"
  message="Success message"
  onClose={closeHandler}
/>
```

#### Breaking Changes
- Color classes replaced with type prop
- Close functionality standardized
- Icon handling automated

#### Migration Complexity: **Low**
- Simple type mapping
- Consistent API across all alert types

## Migration Priority Matrix

### High Priority (Most Used Components)
1. **Loading patterns** → LoadingState (Low complexity, high impact)
2. **Card-like divs** → CompactCard (Medium complexity, high impact)
3. **Table loading states** → LoadingState (Low complexity, medium impact)

### Medium Priority
4. **Action button groups** → QuickActions (Medium complexity, medium impact)
5. **Error displays** → ErrorState (Low complexity, medium impact)
6. **Notification patterns** → Alert (Low complexity, medium impact)

### Low Priority (Complex Migrations)
7. **Data display grids** → DataGrid (High complexity, medium impact)

## Breaking Changes Summary

### TypeScript Interface Changes
- All new components have strict TypeScript interfaces
- Props are more structured (objects vs. individual props)
- Some props are required that were optional before

### Styling Changes
- CSS classes replaced with semantic props
- Variants control appearance instead of custom classes
- Some custom styling may not be supported

### Structure Changes
- Content organization may change (titles, actions, etc.)
- Some components require data restructuring
- Event handlers generally remain compatible

## Migration Validation Checklist

For each component migration:

- [ ] **Functionality preserved** - All features work as before
- [ ] **Visual consistency** - Appearance matches design system
- [ ] **TypeScript compliance** - No type errors
- [ ] **Responsive behavior** - Works on all screen sizes
- [ ] **Accessibility maintained** - ARIA attributes and keyboard navigation
- [ ] **Performance impact** - No significant performance regression

## Common Migration Patterns

### Pattern 1: Simple Wrapper Replacement
```typescript
// Before
<div className="bg-white rounded-lg shadow-md p-6">
  <h2>Title</h2>
  {content}
</div>

// After
<CompactCard title="Title">
  {content}
</CompactCard>
```

### Pattern 2: Data Structure Transformation
```typescript
// Before
<div className="grid grid-cols-2 gap-4">
  <div>Label 1: {value1}</div>
  <div>Label 2: {value2}</div>
</div>

// After
<DataGrid
  items={[
    { label: 'Label 1', value: value1 },
    { label: 'Label 2', value: value2 }
  ]}
  columns={2}
/>
```

### Pattern 3: Action Array Conversion
```typescript
// Before
<div className="flex space-x-2">
  <button onClick={fn1}>Action 1</button>
  <button onClick={fn2}>Action 2</button>
</div>

// After
<QuickActions
  actions={[
    { id: '1', label: 'Action 1', icon: <Icon1 />, onClick: fn1 },
    { id: '2', label: 'Action 2', icon: <Icon2 />, onClick: fn2 }
  ]}
/>
```

This mapping provides a comprehensive guide for systematically migrating legacy UI components to the new compact design system while maintaining functionality and improving consistency.