# Component Usage Statistics

## Detailed Component Usage Analysis

### Modern Compact Components

#### CompactCard
**Usage Count:** 8 occurrences
**Files:**
1. `src/components/dashboard/CompactQuickStats.tsx` - Line 5
2. `src/components/dashboard/CompactTopPerformers.tsx` - Line 5
3. `src/components/dashboard/CompactPortfolioSummary.tsx` - Line 5
4. `src/components/dashboard/CompactGoalProgress.tsx` - Line 5
5. `src/components/dashboard/CompactAssetAllocation.tsx` - Line 5
6. `src/app/page.tsx` - Line 13
7. `src/app/dashboard-compact/page.tsx` - Line 13
8. `src/components/investments/InvestmentList.tsx` - Lines 460, 533, 546, 573

**Status:** ✅ Well adopted, modern component

#### QuickActions
**Usage Count:** 2 occurrences
**Files:**
1. `src/components/dashboard/CompactQuickStats.tsx` - Line 5
2. `src/components/dashboard/CompactGoalProgress.tsx` - Line 5
3. `src/components/investments/InvestmentList.tsx` - Line 465

**Status:** ✅ Modern component, good adoption

#### DataGrid
**Usage Count:** 3 occurrences
**Files:**
1. `src/components/dashboard/CompactQuickStats.tsx` - Line 5
2. `src/components/dashboard/CompactPortfolioSummary.tsx` - Line 5

**Status:** ✅ Modern component, good adoption

#### CompactTable
**Usage Count:** 3 occurrences
**Files:**
1. `src/components/dashboard/CompactTopPerformers.tsx` - Line 5
2. `src/components/dashboard/CompactGoalProgress.tsx` - Line 5
3. `src/components/dashboard/CompactAssetAllocation.tsx` - Line 5

**Status:** ✅ Modern component, good adoption

#### TabPanel
**Usage Count:** 2 occurrences
**Files:**
1. `src/components/dashboard/CompactTopPerformers.tsx` - Line 5
2. `src/components/dashboard/CompactAssetAllocation.tsx` - Line 5
3. `src/app/dashboard-compact/page.tsx` - Line 13

**Status:** ✅ Modern component, good adoption

#### StatusIndicator
**Usage Count:** 3 occurrences
**Files:**
1. `src/components/dashboard/CompactTopPerformers.tsx` - Line 5
2. `src/components/dashboard/CompactPortfolioSummary.tsx` - Line 5
3. `src/components/dashboard/CompactGoalProgress.tsx` - Line 5

**Status:** ✅ Modern component, good adoption

### Core UI Components

#### Button
**Usage Count:** 15+ occurrences
**Files:**
1. `src/components/investments/ImportModal.tsx` - Line 4
2. `src/components/investments/ImportHistoryModal.tsx` - Line 4
3. `src/components/investments/ColumnMappingForm.tsx` - Line 4
4. `src/components/investments/InvestmentList.tsx` - Lines 582, 641, 651
5. `src/components/investments/InvestmentForm.tsx` - Lines 335, 344
6. `src/components/investments/InvestmentFilters.tsx` - Lines 117, 125
7. `src/components/investments/InvestmentDetails.tsx` - Lines 163, 183, 192, 197
8. `src/components/investments/InvestmentTable.tsx` - Lines 202, 210, 218
9. `src/components/ui/ErrorState.tsx` - Line 53
10. `src/app/accounts/[id]/page.tsx` - Line 7

**Status:** ✅ Core component, widely used

#### Modal
**Usage Count:** 4 occurrences
**Files:**
1. `src/components/investments/ImportModal.tsx` - Line 5
2. `src/components/investments/ImportHistoryModal.tsx` - Line 5
3. `src/components/investments/InvestmentList.tsx` - Lines 604, 627, 663
4. `src/app/accounts/[id]/page.tsx` - Line 7

**Status:** ✅ Core component, good usage

#### LoadingState
**Usage Count:** 3 occurrences
**Files:**
1. `src/app/page.tsx` - Line 13
2. `src/app/dashboard-compact/page.tsx` - Line 13

**Status:** ✅ Modern component, should replace LoadingSpinner

#### ErrorState
**Usage Count:** 4 occurrences
**Files:**
1. `src/app/page.tsx` - Line 13
2. `src/app/dashboard-compact/page.tsx` - Line 13
3. `src/components/investments/InvestmentListDebug.tsx` - Line 112
4. `src/components/investments/InvestmentList.tsx` - Line 448
5. `src/components/investments/InvestmentDetails.tsx` - Line 139
6. `src/app/accounts/[id]/page.tsx` - Line 7

**Status:** ✅ Modern component, good adoption

#### Alert
**Usage Count:** 3 occurrences
**Files:**
1. `src/components/investments/InvestmentList.tsx` - Line 708
2. `src/components/investments/CompactInvestmentList.tsx` - Line 37
3. `src/app/accounts/[id]/page.tsx` - Line 7

**Status:** ✅ Modern component, good adoption

### Legacy Components (Need Replacement)

#### LoadingSpinner
**Usage Count:** 4 occurrences
**Files:**
1. `src/components/ui/LoadingState.tsx` - Line 2 (internal usage)
2. `src/components/investments/InvestmentListDebug.tsx` - Lines 5, 102
3. `src/components/investments/InvestmentList.tsx` - Lines 27, 440
4. `src/components/investments/InvestmentDetails.tsx` - Lines 6, 131
5. `src/components/investments/CompactInvestmentList.tsx` - Lines 34, 587

**Status:** ⚠️ Legacy component, should be replaced with LoadingState

#### Table
**Usage Count:** 1 occurrence
**Files:**
1. `src/components/investments/InvestmentTable.tsx` - Line 230

**Status:** ⚠️ Legacy component, should be replaced with CompactTable

### Dashboard Legacy Components

#### AssetAllocation, GoalProgress, PortfolioSummary, TopPerformers
**Usage Count:** Unknown (need to check page usage)
**Files:** Located in `src/components/dashboard/`

**Status:** ⚠️ Legacy components, have compact versions available

## Component Import Analysis

### Barrel Exports Usage
- ✅ Most components properly use barrel exports from `src/components/ui/index.ts`
- ✅ Feature components use barrel exports from their respective `index.ts` files

### Direct Imports
- Some components still use direct file imports instead of barrel imports
- This is acceptable for internal component usage

## Migration Priority Matrix

### High Priority (Immediate Action Required)
1. **LoadingSpinner → LoadingState** (4 usages)
2. **Table → CompactTable** (1 usage)
3. **InvestmentList → CompactInvestmentList** (if legacy version exists)

### Medium Priority (Review and Replace)
1. **Dashboard legacy components** - Check if still used in pages
2. **Core component standardization** - Ensure Button, Modal, etc. follow design system

### Low Priority (Documentation and Optimization)
1. **Component documentation** - Create usage guides
2. **Import standardization** - Prefer barrel imports where appropriate

## Unused Components Detection

### Components with Zero Usage (Candidates for Removal)
- Need to verify by checking actual page usage
- Some components might be used in pages not captured in this analysis

### Components with Low Usage (Review for Necessity)
- **Toast** - 1 usage
- **FormError** - Low usage
- **Input** - Low usage
- **Select** - 2 usages

## Recommendations

### Immediate Actions
1. Replace LoadingSpinner with LoadingState in 4 files
2. Replace Table with CompactTable in InvestmentTable.tsx
3. Audit dashboard pages to see if legacy components are still used

### Code Quality Improvements
1. Standardize import patterns
2. Remove unused components after verification
3. Update component documentation

### Testing Requirements
1. Ensure all modern components have adequate test coverage
2. Test component replacements thoroughly
3. Verify responsive behavior across all components