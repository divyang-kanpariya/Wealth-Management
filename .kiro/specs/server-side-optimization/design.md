# Design Document

## Overview

This design outlines the conversion of the current client-side rendered pages to server-side rendered or statically generated pages using Next.js capabilities. The goal is to eliminate frontend API calls and data processing by pre-processing all data on the server and serving complete, ready-to-display pages.

## Architecture

### Current Architecture Issues
- All pages use `'use client'` directive and perform client-side data fetching
- Multiple API calls per page (dashboard, investments, goals, etc.)
- Data processing and calculations happen on the frontend
- Loading states and error handling add complexity
- Charts page makes multiple sequential API calls

### Target Architecture
- Convert pages to use Next.js Server Components or Server-Side Rendering (SSR)
- Pre-process all data on the server before page rendering
- Consolidate multiple API calls into single server-side data preparation functions
- Serve complete pages with all data ready for immediate display
- Maintain interactivity only for user actions (forms, navigation, animations)

## Components and Interfaces

### Server-Side Data Preparation Layer

#### Data Aggregation Services
```typescript
// Server-side data preparation functions
interface PageDataPreparator {
  prepareDashboardData(): Promise<DashboardPageData>
  prepareChartsData(): Promise<ChartsPageData>
  prepareInvestmentsData(): Promise<InvestmentsPageData>
  prepareGoalsData(): Promise<GoalsPageData>
  prepareSIPsData(): Promise<SIPsPageData>
  prepareAccountsData(): Promise<AccountsPageData>
}

interface DashboardPageData {
  summary: DashboardSummary
  recentTransactions: Transaction[]
  goalProgress: GoalProgress[]
  portfolioSummary: PortfolioSummary
}

interface ChartsPageData {
  dashboardData: DashboardSummary
  investments: InvestmentWithCurrentValue[]
  sips: SIPWithCurrentValue[]
  portfolioTrendData: TrendDataPoint[]
}
```

#### Page-Specific Data Preparators
```typescript
// Individual page data preparation
class DashboardDataPreparator {
  async prepare(): Promise<DashboardPageData> {
    // Consolidate all dashboard API calls
    const [summary, transactions, goals, portfolio] = await Promise.all([
      this.getDashboardSummary(),
      this.getRecentTransactions(),
      this.getGoalProgress(),
      this.getPortfolioSummary()
    ])
    
    return { summary, transactions, goals, portfolio }
  }
}

class ChartsDataPreparator {
  async prepare(): Promise<ChartsPageData> {
    // Consolidate all charts API calls and data processing
    const [dashboardData, investments, sips, portfolioHistory] = await Promise.all([
      this.getDashboardSummary(),
      this.getInvestmentsWithCurrentValue(),
      this.getSIPsWithCurrentValue(),
      this.getPortfolioTrendData()
    ])
    
    return { dashboardData, investments, sips, portfolioTrendData: portfolioHistory }
  }
}
```

### Page Conversion Strategy

#### Server Component Pages
Convert pages to use Next.js Server Components for static data:
```typescript
// src/app/dashboard/page.tsx (converted)
import { DashboardDataPreparator } from '@/lib/server/data-preparators'
import { DashboardView } from '@/components/dashboard/DashboardView'

export default async function DashboardPage() {
  const preparator = new DashboardDataPreparator()
  const pageData = await preparator.prepare()
  
  return <DashboardView data={pageData} />
}
```

#### Server-Side Rendering for Dynamic Data
For pages with dynamic parameters:
```typescript
// src/app/investments/[id]/page.tsx (converted)
interface PageProps {
  params: { id: string }
}

export default async function InvestmentDetailPage({ params }: PageProps) {
  const investment = await getInvestmentWithDetails(params.id)
  
  if (!investment) {
    notFound()
  }
  
  return <InvestmentDetailView investment={investment} />
}
```

### Client-Side Component Separation

#### Pure Presentation Components
Convert existing components to accept pre-processed data:
```typescript
// Client components only handle presentation and user interaction
interface DashboardViewProps {
  data: DashboardPageData
}

export function DashboardView({ data }: DashboardViewProps) {
  // No data fetching, only presentation and user interactions
  return (
    <Layout>
      <DashboardSummaryCard summary={data.summary} />
      <RecentTransactions transactions={data.recentTransactions} />
      <GoalProgressSection goals={data.goalProgress} />
    </Layout>
  )
}
```

#### Interactive Elements
Keep client-side only for immediate user feedback:
```typescript
'use client'

interface InteractiveFormProps {
  onSubmit: (data: FormData) => Promise<void>
}

export function InteractiveForm({ onSubmit }: InteractiveFormProps) {
  // Handle form interactions, validation, optimistic updates
  // Server Actions for data mutations
}
```

## Data Models

### Page Data Models
```typescript
interface PageDataBase {
  timestamp: Date
  cacheKey?: string
}

interface DashboardPageData extends PageDataBase {
  summary: DashboardSummary
  recentTransactions: Transaction[]
  goalProgress: GoalProgress[]
  portfolioSummary: PortfolioSummary
}

interface ChartsPageData extends PageDataBase {
  dashboardData: DashboardSummary
  investments: InvestmentWithCurrentValue[]
  sips: SIPWithCurrentValue[]
  portfolioTrendData: TrendDataPoint[]
}

interface InvestmentDetailPageData extends PageDataBase {
  investment: InvestmentWithCurrentValue
  transactions: Transaction[]
  performance: PerformanceMetrics
}
```

### Server-Side Utilities
```typescript
interface DataPreparationUtils {
  calculatePortfolioMetrics(investments: Investment[]): PortfolioMetrics
  processChartData(rawData: any[]): ChartDataPoint[]
  aggregateTransactionData(transactions: Transaction[]): TransactionSummary
  formatCurrencyValues(data: any): any
}
```

## Error Handling

### Server-Side Error Handling
```typescript
// Graceful error handling in data preparation
class DataPreparator {
  async prepareWithFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryFn()
    } catch (error) {
      console.error('Primary data preparation failed:', error)
      return await fallbackFn()
    }
  }
}
```

### Client-Side Error Boundaries
```typescript
// Error boundaries for client components
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      {children}
    </ErrorBoundary>
  )
}
```

## Testing Strategy

### Server-Side Testing
- Unit tests for data preparation functions
- Integration tests for server-side data aggregation
- Performance tests for page generation times

### Component Testing
- Test presentation components with mock data
- Test interactive components in isolation
- Test error boundary behavior

### End-to-End Testing
- Test complete page rendering with real data
- Test page load performance
- Test user interactions on server-rendered pages

## Performance Considerations

### Caching Strategy
- Use Next.js built-in caching for static data
- Implement memory caching for frequently accessed data
- Cache expensive calculations and API responses

### Data Preparation Optimization
- Parallel data fetching where possible
- Minimize database queries through efficient joins
- Pre-calculate expensive operations

### Page Generation Strategy
- Use Static Site Generation (SSG) for pages with stable data
- Use Server-Side Rendering (SSR) for dynamic content
- Implement Incremental Static Regeneration (ISR) for semi-dynamic data

## Migration Strategy

### Phase 1: Core Pages
1. Dashboard page (`/`)
2. Charts page (`/charts`)

### Phase 2: List Pages
1. Investments page (`/investments`)
2. Goals page (`/goals`)
3. SIPs page (`/sips`)
4. Accounts page (`/accounts`)

### Phase 3: Detail Pages
1. Investment detail pages (`/investments/[id]`)
2. Goal detail pages (`/goals/[id]`)
3. SIP detail pages (`/sips/[id]`)
4. Account detail pages (`/accounts/[id]`)

### Phase 4: Cleanup
1. Remove unused client-side data fetching hooks
2. Remove redundant API endpoints
3. Optimize remaining API endpoints for server-side use
4. Update error handling and loading states