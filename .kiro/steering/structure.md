# Project Structure

## Root Level
- **Configuration files**: `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.mjs`
- **Database**: `prisma/` folder with schema and migrations
- **Environment**: `.env*` files for configuration
- **SQL scripts**: Various `.sql` files for database operations
- **Test scripts**: `test-*.js` files for API and functionality testing

## Source Code (`src/`)

### App Router (`src/app/`)
Next.js 13+ App Router structure:
- **Route groups**: `accounts/`, `goals/`, `investments/` - feature-based routing
- **API routes**: `api/` - backend API endpoints
- **Layout & globals**: `layout.tsx`, `globals.css`, `page.tsx`

### Components (`src/components/`)
Organized by feature and type:
- **Feature components**: `accounts/`, `goals/`, `investments/`, `dashboard/`
- **Layout components**: `layout/` - navigation, headers, footers
- **UI components**: `ui/` - reusable UI elements
- **Error handling**: `ErrorBoundary.tsx`
- **Barrel exports**: `index.ts` for clean imports

### Business Logic (`src/lib/`)
Core application logic:
- **Database**: `prisma.ts` - Prisma client configuration
- **Validation**: `validations.ts` - Zod schemas for data validation
- **API handling**: `api-handler.ts` - API utilities
- **Calculations**: `calculations.ts` - financial calculations
- **Utilities**: Various utility modules for specific domains

### Custom Hooks (`src/hooks/`)
Reusable React hooks:
- **API integration**: `useApiCall.ts`
- **Error handling**: `useErrorHandler.ts`
- **State management**: `useOptimisticUpdates.ts`
- **UI utilities**: `usePagination.ts`

### Type Definitions (`src/types/`)
- **Centralized types**: `index.ts` - shared TypeScript interfaces and types

### Testing (`src/test/`)
Comprehensive test organization:
- **Test types**: `api/`, `components/`, `e2e/`, `hooks/`, `integration/`, `lib/`, `performance/`
- **Test utilities**: `factories/`, `utils/`, `validations/`
- **Configuration**: `setup.ts`, `test-runner.ts`

## Naming Conventions
- **Files**: kebab-case for utilities, PascalCase for components
- **Directories**: lowercase with hyphens
- **Components**: PascalCase with descriptive names
- **Hooks**: camelCase starting with 'use'
- **Types**: PascalCase interfaces and types

## Import Patterns
- Use `@/` alias for src imports
- Barrel exports from `index.ts` files
- Feature-based organization over technical organization