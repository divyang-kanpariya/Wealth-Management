# Technology Stack

## Framework & Runtime
- **Next.js 15.4.3** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5** - Type safety and development experience
- **Node.js** - Runtime environment

## Database & ORM
- **Prisma 6.12.0** - Database ORM and migrations
- **MySQL** - Primary database (configured via DATABASE_URL)

## Styling & UI
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Inter Font** - Primary typography

## Validation & Type Safety
- **Zod 3.23.8** - Runtime type validation and schema parsing
- **Prisma Client** - Type-safe database queries

## Testing
- **Vitest 3.2.4** - Test runner and framework
- **@testing-library/react** - React component testing utilities
- **jsdom** - DOM environment for testing
- **@vitest/coverage-v8** - Code coverage reporting

## Development Tools
- **ESLint** - Code linting with Next.js core web vitals config
- **TypeScript strict mode** - Enhanced type checking

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

### Testing
```bash
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run test:unit    # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:e2e     # Run end-to-end tests
npm run test:api     # Run API tests
npm run test:ci      # Run tests for CI with verbose output
```

## Path Aliases
- `@/*` maps to `./src/*` for clean imports