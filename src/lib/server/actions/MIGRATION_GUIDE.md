# Migration Guide: From API Routes to Server Actions

This guide shows how to migrate existing components from using client-side API calls to server actions.

## Overview

Server actions provide a better way to handle form submissions and data mutations by:
- Eliminating the need for API routes for simple CRUD operations
- Providing automatic cache revalidation
- Improving performance with server-side processing
- Enabling progressive enhancement (forms work without JavaScript)

## Step-by-Step Migration

### 1. Identify Components to Migrate

Look for components that:
- Make `fetch()` calls to `/api/*` endpoints
- Handle form submissions
- Perform CRUD operations
- Use `useState` and `useEffect` for data fetching

### 2. Replace API Calls with Server Actions

#### Before: Using fetch() with API routes

```tsx
// Old pattern - InvestmentForm.tsx
'use client'

import { useState } from 'react'

export function InvestmentForm({ investment, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData(e.target)
      const data = Object.fromEntries(formData.entries())

      const response = await fetch(
        investment ? `/api/investments/${investment.id}` : '/api/investments',
        {
          method: investment ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message)
      }

      // Manual refresh or state update
      window.location.reload()
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

#### After: Using server actions

```tsx
// New pattern - InvestmentForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { createInvestment, updateInvestment } from '@/lib/server/actions'

export function InvestmentForm({ investment, onSuccess }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(null)

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    
    startTransition(async () => {
      const result = investment 
        ? await updateInvestment(investment.id, formData)
        : await createInvestment(formData)
      
      if (result.success) {
        onSuccess?.()
        // No manual refresh needed - automatic revalidation
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form action={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* form fields */}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

### 3. Key Changes Explained

#### Form Handling
- **Before**: `onSubmit` event handler with `e.preventDefault()`
- **After**: `action` prop with server action function

#### Loading States
- **Before**: `useState` for loading state
- **After**: `useTransition` hook with `isPending`

#### Error Handling
- **Before**: Manual error parsing from response
- **After**: Consistent error format from server action result

#### Data Refresh
- **Before**: Manual `window.location.reload()` or state updates
- **After**: Automatic cache revalidation

### 4. Migration Patterns by Component Type

#### A. Simple Forms (Create/Update)

```tsx
// Before
const handleSubmit = async (data) => {
  const response = await fetch('/api/investments', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  // handle response...
}

// After
const handleSubmit = async (formData: FormData) => {
  const result = await createInvestment(formData)
  if (!result.success) setError(result.error)
}
```

#### B. Delete Operations

```tsx
// Before
const handleDelete = async (id) => {
  const response = await fetch(`/api/investments/${id}`, {
    method: 'DELETE'
  })
  if (response.ok) window.location.reload()
}

// After
const handleDelete = async (id) => {
  const result = await deleteInvestment(id)
  if (result.success) {
    // Automatic revalidation - no manual refresh needed
  }
}
```

#### C. Bulk Operations

```tsx
// Before
const handleBulkDelete = async (ids) => {
  const response = await fetch('/api/investments/bulk', {
    method: 'DELETE',
    body: JSON.stringify({ ids })
  })
  // handle response...
}

// After
const handleBulkDelete = async (ids) => {
  const result = await bulkDeleteInvestments(ids)
  if (!result.success) setError(result.error)
}
```

### 5. Component-Specific Migration Examples

#### Investment Components

```tsx
// src/components/investments/InvestmentInteractions.tsx

// Replace this:
const response = await fetch(`/api/investments/${id}`, {
  method: 'DELETE'
})

// With this:
import { deleteInvestment } from '@/lib/server/actions'
const result = await deleteInvestment(id)
```

#### Goal Components

```tsx
// src/components/goals/GoalForm.tsx

// Replace this:
const response = await fetch('/api/goals', {
  method: 'POST',
  body: JSON.stringify(goalData)
})

// With this:
import { createGoal } from '@/lib/server/actions'
const result = await createGoal(formData)
```

#### Account Components

```tsx
// src/components/accounts/AccountForm.tsx

// Replace this:
const response = await fetch(`/api/accounts/${id}`, {
  method: 'PUT',
  body: JSON.stringify(updateData)
})

// With this:
import { updateAccount } from '@/lib/server/actions'
const result = await updateAccount(id, formData)
```

### 6. Advanced Patterns

#### Optimistic Updates

```tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import { deleteInvestment } from '@/lib/server/actions'

export function InvestmentList({ investments }) {
  const [optimisticInvestments, addOptimistic] = useOptimistic(
    investments,
    (state, deletedId) => state.filter(inv => inv.id !== deletedId)
  )
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id) => {
    startTransition(async () => {
      addOptimistic(id) // Optimistically remove from UI
      const result = await deleteInvestment(id)
      if (!result.success) {
        // Handle error - optimistic update will be reverted
        console.error(result.error)
      }
    })
  }

  return (
    <div>
      {optimisticInvestments.map(investment => (
        <div key={investment.id}>
          {investment.name}
          <button onClick={() => handleDelete(investment.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

#### Form Validation

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createInvestment } from '@/lib/server/actions'

export function InvestmentForm() {
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState({})

  const handleSubmit = async (formData: FormData) => {
    setErrors({})
    
    // Client-side validation
    const name = formData.get('name') as string
    if (!name) {
      setErrors({ name: 'Name is required' })
      return
    }

    startTransition(async () => {
      const result = await createInvestment(formData)
      if (!result.success) {
        // Server-side validation errors
        setErrors({ general: result.error })
      }
    })
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      {errors.name && <span className="error">{errors.name}</span>}
      
      {errors.general && (
        <div className="error">{errors.general}</div>
      )}
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

### 7. Testing Server Actions

```tsx
// src/test/lib/server/actions/investments.test.ts
import { createInvestmentFromData } from '@/lib/server/actions'

test('creates investment successfully', async () => {
  const result = await createInvestmentFromData({
    name: 'Test Investment',
    type: 'STOCK',
    buyDate: new Date(),
    accountId: 'account-1'
  })
  
  expect(result.success).toBe(true)
  expect(result.data).toBeDefined()
})
```

### 8. Common Pitfalls and Solutions

#### Pitfall 1: Forgetting to handle FormData

```tsx
// Wrong - trying to access form data as object
const handleSubmit = async (formData: FormData) => {
  const name = formData.name // undefined!
}

// Correct - using FormData methods
const handleSubmit = async (formData: FormData) => {
  const name = formData.get('name') as string
}
```

#### Pitfall 2: Not using useTransition

```tsx
// Wrong - no loading state
const handleSubmit = async (formData: FormData) => {
  await createInvestment(formData)
}

// Correct - with loading state
const [isPending, startTransition] = useTransition()
const handleSubmit = async (formData: FormData) => {
  startTransition(async () => {
    await createInvestment(formData)
  })
}
```

#### Pitfall 3: Manual page refresh

```tsx
// Wrong - manual refresh defeats the purpose
const result = await createInvestment(formData)
if (result.success) {
  window.location.reload() // Don't do this!
}

// Correct - rely on automatic revalidation
const result = await createInvestment(formData)
if (result.success) {
  // Pages will update automatically
  onSuccess?.()
}
```

### 9. Migration Checklist

For each component you migrate:

- [ ] Replace `fetch()` calls with server action imports
- [ ] Change `onSubmit` to `action` prop
- [ ] Replace `useState` loading with `useTransition`
- [ ] Update error handling to use server action results
- [ ] Remove manual page refreshes
- [ ] Test form submission works
- [ ] Test error handling works
- [ ] Test loading states work
- [ ] Verify automatic revalidation works

### 10. Benefits After Migration

After migrating to server actions, you'll have:

- **Better Performance**: No client-side API calls
- **Automatic Updates**: Pages revalidate automatically
- **Progressive Enhancement**: Forms work without JavaScript
- **Consistent Error Handling**: Standardized error format
- **Type Safety**: Full TypeScript support
- **Simpler Code**: Less boilerplate than fetch() calls
- **Better UX**: Optimistic updates and smooth transitions