# Comprehensive Test Suite

This directory contains a comprehensive test suite for the Personal Wealth Management application, covering all aspects of functionality from unit tests to end-to-end workflows.

## Test Structure

```
src/test/
├── api/                    # API endpoint tests
├── components/             # React component tests
├── e2e/                   # End-to-end workflow tests
├── factories/             # Test data factories
├── hooks/                 # Custom hook tests
├── integration/           # Integration tests
├── lib/                   # Library function tests
├── performance/           # Performance tests
├── types/                 # Type definition tests
├── utils/                 # Test utilities and helpers
├── validations/           # Validation schema tests
├── setup.ts              # Test setup configuration
├── test-runner.ts        # Comprehensive test runner
└── README.md             # This file
```

## Test Categories

### 1. Unit Tests
- **Location**: `src/test/lib/`, `src/test/components/`, `src/test/hooks/`, `src/test/validations/`
- **Purpose**: Test individual functions, components, and modules in isolation
- **Command**: `npm run test:unit`
- **Coverage Target**: 90%+

### 2. Integration Tests
- **Location**: `src/test/integration/`
- **Purpose**: Test interactions between components, API endpoints, and database operations
- **Command**: `npm run test:integration`
- **Coverage Target**: 85%+

### 3. End-to-End Tests
- **Location**: `src/test/e2e/`
- **Purpose**: Test complete user workflows from start to finish
- **Command**: `npm run test:e2e`
- **Coverage Target**: 80%+

### 4. API Tests
- **Location**: `src/test/api/`
- **Purpose**: Test API endpoints, validation, and error handling
- **Command**: `npm run test:api`
- **Coverage Target**: 95%+

### 5. Performance Tests
- **Location**: `src/test/performance/`
- **Purpose**: Test application performance under various loads
- **Command**: `npm run test:performance`
- **Coverage Target**: N/A (performance metrics)

## Test Utilities

### Test Data Factories
Located in `src/test/factories/`, these provide consistent test data generation:

```typescript
import { TestDataFactory } from '../factories'

// Create test investment
const investment = TestDataFactory.createInvestment({
  name: 'Custom Investment',
  units: 100,
  buyPrice: 50
})

// Create realistic portfolio
const portfolio = TestDataFactory.createRealisticPortfolio()
```

### Test Helpers
Located in `src/test/utils/`, these provide common testing utilities:

```typescript
import { TestDbUtils, MockApiHelpers, TestAssertions } from '../utils/test-helpers'

// Database utilities
const testDb = new TestDbUtils(prisma)
await testDb.seedTestData()

// API mocking
const mockFetch = MockApiHelpers.mockFetch({
  '/api/investments': { json: mockData }
})

// Custom assertions
TestAssertions.expectInvestmentToMatch(actual, expected)
```

## Running Tests

### Individual Test Suites
```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:api
npm run test:performance

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui
```

### Comprehensive Test Runner
```bash
# Run all test suites with detailed reporting
npx tsx src/test/test-runner.ts

# Or use the npm script
npm run test:ci
```

### Continuous Integration
The CI pipeline runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The pipeline includes:
1. **Test Execution**: All test suites
2. **Coverage Analysis**: Minimum 80% coverage required
3. **Security Audit**: Dependency vulnerability scanning
4. **Performance Benchmarks**: Performance regression detection
5. **Build Verification**: Ensure application builds successfully

## Test Configuration

### Vitest Configuration
Located in `vitest.config.mjs`:
- **Environment**: jsdom for React component testing
- **Coverage**: v8 provider with 80% minimum thresholds
- **Setup**: Global test utilities and mocks

### Database Testing
- **Test Database**: Separate MySQL instance for testing
- **Isolation**: Each test suite runs with clean database state
- **Transactions**: Tests use database transactions for isolation

### External API Mocking
- **Stock Prices**: NSE API responses mocked with realistic data
- **Mutual Fund NAV**: AMFI API responses mocked with test data
- **Network Errors**: Simulated for error handling tests

## Writing Tests

### Test Naming Convention
```typescript
describe('ComponentName', () => {
  describe('specific functionality', () => {
    it('should do something specific when condition is met', () => {
      // Test implementation
    })
  })
})
```

### Test Structure (AAA Pattern)
```typescript
it('should calculate investment value correctly', () => {
  // Arrange
  const investment = TestDataFactory.createInvestment({
    units: 100,
    buyPrice: 50
  })
  const currentPrice = 60

  // Act
  const result = calculateInvestmentValue(investment, currentPrice)

  // Assert
  expect(result.currentValue).toBe(6000)
  expect(result.gainLoss).toBe(1000)
  expect(result.gainLossPercentage).toBe(20)
})
```

### Component Testing
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('should handle form submission', async () => {
  const mockSubmit = vi.fn()
  render(<InvestmentForm onSubmit={mockSubmit} />)

  await userEvent.type(screen.getByLabelText('Name'), 'Test Investment')
  await userEvent.click(screen.getByText('Submit'))

  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Investment' })
    )
  })
})
```

### API Testing
```typescript
import { ApiTestHelpers } from '../utils/api-test-helpers'

it('should create investment via API', async () => {
  const response = await ApiTestHelpers.callApiHandler(
    investmentsHandler,
    'POST',
    investmentData
  )

  ApiTestHelpers.expectApiSuccess(response, 201)
  expect(response.data).toHaveProperty('id')
})
```

## Coverage Requirements

### Minimum Coverage Thresholds
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Exclusions
- Test files themselves
- Configuration files
- Type definitions
- Generated files (Prisma client)
- Build artifacts

## Performance Testing

### Performance Metrics
- **API Response Time**: < 200ms for simple queries
- **Database Query Time**: < 100ms for indexed queries
- **Component Render Time**: < 50ms for complex components
- **Page Load Time**: < 2s for dashboard with 100+ investments

### Load Testing
- **Concurrent Users**: Test with up to 100 concurrent users
- **Data Volume**: Test with portfolios containing 1000+ investments
- **API Throughput**: Test API endpoints under high load

## Debugging Tests

### Common Issues
1. **Async Operations**: Use `waitFor` for async state updates
2. **Database State**: Ensure proper cleanup between tests
3. **Mock Timing**: Reset mocks in `beforeEach` hooks
4. **Component Mounting**: Use proper React testing utilities

### Debug Commands
```bash
# Run specific test file
npm test -- investment-form.test.tsx

# Run tests in debug mode
npm test -- --inspect-brk

# Run with verbose output
npm test -- --reporter=verbose

# Run single test
npm test -- --grep "should calculate investment value"
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all test categories are covered
3. Update test data factories if needed
4. Add integration tests for API changes
5. Include E2E tests for user-facing features
6. Update this documentation

### Test Review Checklist
- [ ] Unit tests for all new functions/components
- [ ] Integration tests for API endpoints
- [ ] E2E tests for user workflows
- [ ] Performance tests for critical paths
- [ ] Error handling tests
- [ ] Edge case coverage
- [ ] Mock external dependencies
- [ ] Clean test data setup/teardown
- [ ] Descriptive test names
- [ ] Documentation updates

## Troubleshooting

### Common Test Failures
1. **Database Connection**: Ensure test database is running
2. **Port Conflicts**: Check if test ports are available
3. **Mock Issues**: Verify mock implementations match real APIs
4. **Timing Issues**: Add appropriate waits for async operations
5. **Memory Leaks**: Ensure proper cleanup in test teardown

### Getting Help
- Check test logs in `coverage/` directory
- Review CI pipeline logs for detailed error information
- Use `npm run test:ui` for interactive debugging
- Consult team documentation for project-specific testing patterns