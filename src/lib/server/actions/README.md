# Server Actions Documentation

This directory contains server actions that replace client-side API calls for data mutations. Server actions provide better performance, security, and user experience by handling form submissions and data updates on the server.

## Overview

Server actions are functions that run on the server and can be called directly from client components. They replace the need for API routes for simple CRUD operations and provide automatic revalidation of cached data.

## Benefits

- **Better Performance**: No need for client-side API calls
- **Automatic Revalidation**: Pages update automatically after mutations
- **Progressive Enhancement**: Forms work without JavaScript
- **Type Safety**: Full TypeScript support
- **Error Handling**: Consistent error handling patterns

## Available Actions

### Investment Actions (`investments.ts`)

- `createInvestment(formData: FormData)` - Create a new investment
- `createInvestmentFromData(data: any)` - Create investment from JSON data
- `updateInvestment(id: string, formData: FormData)` - Update an investment
- `updateInvestmentFromData(id: string, data: any)` - Update investment from JSON data
- `deleteInvestment(id: string)` - Delete an investment
- `bulkDeleteInvestments(ids: string[])` - Delete multiple investments
- `updateInvestmentGoal(investmentId: string, goalId: string | null)` - Update investment goal assignment

### Goal Actions (`goals.ts`)

- `createGoal(formData: FormData)` - Create a new goal
- `createGoalFromData(data: any)` - Create goal from JSON data
- `updateGoal(id: string, formData: FormData)` - Update a goal
- `updateGoalFromData(id: string, data: any)` - Update goal from JSON data
- `deleteGoal(id: string)` - Delete a goal
- `assignInvestmentsToGoal(goalId: string, investmentIds: string[])` - Assign investments to goal
- `removeInvestmentsFromGoal(investmentIds: string[])` - Remove investments from goal

### Account Actions (`accounts.ts`)

- `createAccount(formData: FormData)` - Create a new account
- `createAccountFromData(data: any)` - Create account from JSON data
- `updateAccount(id: string, formData: FormData)` - Update an account
- `updateAccountFromData(id: string, data: any)` - Update account from JSON data
- `deleteAccount(id: string)` - Delete an account

### SIP Actions (`sips.ts`)

- `createSip(formData: FormData)` - Create a new SIP
- `createSipFromData(data: any)` - Create SIP from JSON data
- `updateSip(id: string, formData: FormData)` - Update a SIP
- `updateSipFromData(id: string, data: any)` - Update SIP from JSON data
- `deleteSip(id: string)` - Delete a SIP
- `updateSipStatus(id: string, status: SIPStatus)` - Update SIP status

### Bulk Operations (`bulk-operations.ts`)

- `bulkDeleteInvestments(investmentIds: string[])` - Bulk delete investments
- `bulkUpdateInvestmentGoals(investmentIds: string[], goalId: string | null)` - Bulk update investment goals
- `processSipTransactions()` - Process SIP transactions

### Import Actions (`import.ts`)

- `previewCsvImport(formData: FormData)` - Preview CSV import
- `confirmCsvImport(validRows: any[])` - Confirm and process CSV import
- `getImportHistory()` - Get import history
- `deleteImportRecord(importId: string)` - Delete import record

## Usage Patterns

### 1. Basic Form Submission

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createInvestment } from '@/lib/server/actions'

export function InvestmentForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    
    startTransition(async () => {
      const result = await createInvestment(formData)
      
      if (!result.success) {
        setError(result.error || 'An error occurred')
      }
      // Success is handled automatically via revalidation
    })
  }

  return (
    <form action={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input name="name" placeholder="Investment Name" required />
      <input name="type" placeholder="Type" required />
      {/* ... other fields ... */}
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Investment'}
      </button>
    </form>
  )
}
```

### 2. Programmatic Usage

```tsx
import { createInvestmentFromData } from '@/lib/server/actions'

// In a server component or another server action
const result = await createInvestmentFromData({
  name: 'Apple Inc.',
  type: 'STOCK',
  symbol: 'AAPL',
  units: 10,
  buyPrice: 150.00,
  buyDate: new Date(),
  accountId: 'account-123'
})

if (result.success) {
  console.log('Investment created:', result.data)
} else {
  console.error('Error:', result.error)
}
```

### 3. Bulk Operations

```tsx
import { bulkDeleteInvestments } from '@/lib/server/actions'

const handleBulkDelete = async (selectedIds: string[]) => {
  const result = await bulkDeleteInvestments(selectedIds)
  
  if (result.success) {
    console.log(`Deleted ${result.data?.successCount} investments`)
  } else {
    console.error('Bulk delete failed:', result.error)
  }
}
```

### 4. Error Handling

All server actions return a consistent result format:

```typescript
type ActionResult = {
  success: boolean
  error?: string
  data?: any
}
```

Handle errors consistently:

```tsx
const result = await someAction(data)

if (result.success) {
  // Handle success
  console.log('Success:', result.data)
} else {
  // Handle error
  setError(result.error || 'An unknown error occurred')
}
```

## Migration from API Routes

### Before (API Route + Fetch)

```tsx
// Old pattern
const handleSubmit = async (data: any) => {
  const response = await fetch('/api/investments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }
  
  // Manual page refresh or state update
  window.location.reload()
}
```

### After (Server Action)

```tsx
// New pattern
const handleSubmit = async (formData: FormData) => {
  const result = await createInvestment(formData)
  
  if (!result.success) {
    setError(result.error)
  }
  // Automatic revalidation - no manual refresh needed
}
```

## Cache Invalidation

Server actions automatically invalidate relevant caches using the `CacheInvalidation` utility:

- Investment actions invalidate investment and dashboard caches
- Goal actions invalidate goal and dashboard caches
- Account actions invalidate all caches (since accounts affect multiple areas)
- SIP actions invalidate SIP and dashboard caches

## Validation

All server actions use Zod schemas for validation:

- Data is validated before database operations
- Validation errors are returned in the result object
- Type safety is maintained throughout the process

## Best Practices

1. **Use FormData for forms**: Server actions work best with FormData from HTML forms
2. **Handle loading states**: Use `useTransition` for pending states
3. **Provide error feedback**: Always handle and display errors to users
4. **Validate on both client and server**: Client validation for UX, server validation for security
5. **Use programmatic variants for complex operations**: Use `*FromData` variants when you need to pass structured data

## Testing

Server actions can be tested like regular async functions:

```typescript
import { createInvestmentFromData } from '@/lib/server/actions'

test('creates investment successfully', async () => {
  const result = await createInvestmentFromData({
    name: 'Test Investment',
    type: 'STOCK',
    // ... other required fields
  })
  
  expect(result.success).toBe(true)
  expect(result.data).toBeDefined()
})
```

## Security

Server actions provide better security than API routes:

- No need to expose API endpoints
- Automatic CSRF protection
- Server-side validation
- Type-safe data handling