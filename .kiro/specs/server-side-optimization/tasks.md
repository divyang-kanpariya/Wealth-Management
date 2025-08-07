# Implementation Plan

- [x] 1. Create server-side data preparation infrastructure









  - Create base data preparator classes and interfaces for server-side data aggregation
  - Implement utility functions for data processing and formatting
  - Set up error handling and fallback mechanisms for server-side operations
  - _Requirements: 1.3, 2.2, 2.3_

- [x] 2. Convert dashboard page to server-side rendering









  - Create DashboardDataPreparator class to consolidate all dashboard API calls
  - Convert `/` page from client component to server component
  - Update DashboardView component to accept pre-processed data as props
  - Remove client-side data fetching and loading states from dashboard
  - _Requirements: 1.1, 1.2, 2.1_



- [x] 3. Convert charts page to server-side rendering










  - Create ChartsDataPreparator to consolidate multiple API calls (dashboard, investments, SIPs, portfolio history)
  - Convert `/charts` page from client component to server component
  - Pre-process all chart data calculations on the server
  - Update chart components to receive ready-to-render data
  - Remove sequential API calls and data processing from client-side
  - _Requirements: 1.1, 1.4, 2.2, 2.3_
-

- [x] 4. Convert investments list page to server-side rendering








  - Create InvestmentsDataPreparator for investments list data
  - Convert `/investments` page from client component to server component
  - Pre-calculate investment values and performance metrics on server
  - Update investments list components to use server-prepared data
  - _Requirements: 1.1, 1.4, 2.2_

- [x] 5. Convert goals list page to server-side rendering





  - Create GoalsDataPreparator for goals list with progress calculations
  - Convert `/goals` page from client component to server component
  - Pre-calculate goal progress and allocation data on server
  - Update goals list components to display pre-processed data
  - _Requirements: 1.1, 1.4, 2.2_

- [x] 6. Convert SIPs list page to server-side rendering





  - Create SIPsDataPreparator for SIPs list with current values
  - Convert `/sips` page from client component to server component
  - Pre-calculate SIP performance and next transaction dates on server
  - Update SIPs list components to use server-prepared data
  - _Requirements: 1.1, 1.4, 2.2_

- [x] 7. Convert accounts list page to server-side rendering





  - Create AccountsDataPreparator for accounts list with balances
  - Convert `/accounts` page from client component to server component
  - Pre-calculate account totals and investment summaries on server
  - Update accounts list components to display pre-processed data
  - _Requirements: 1.1, 1.4, 2.2_

- [x] 8. Convert investment detail page to server-side rendering









  - Create InvestmentDetailDataPreparator for individual investment data
  - Convert `/investments/[id]` page to use server-side rendering with dynamic params
  - Pre-process investment details, transactions, and performance metrics
  - Update investment detail components to use server-prepared data
  - Implement proper 404 handling for non-existent investments
  - _Requirements: 1.1, 1.4, 2.2_


- [x] 9. Convert goal detail page to server-side rendering




  - Create GoalDetailDataPreparator for individual goal data with allocations
  - Convert `/goals/[id]` page to use server-side rendering with dynamic params
  - Pre-calculate goal progress, allocated investments, and projections
  - Update goal detail components to display pre-processed data
  - Implement proper 404 handling for non-existent goals
  - _Requirements: 1.1, 1.4, 2.2_

- [x] 10. Convert SIP detail page to server-side rendering





  - Create SIPDetailDataPreparator for individual SIP data with transactions
  - Convert `/sips/[id]` page to use server-side rendering with dynamic params
  - Pre-process SIP details, transaction history, and performance calculations
  - Update SIP detail components to use server-prepared data
  - Implement proper 404 handling for non-existent SIPs
  - _Requirements: 1.1, 1.4, 2.2_
-

- [x] 11. Convert account detail page to server-side rendering




  - Create AccountDetailDataPreparator for individual account data
  - Convert `/accounts/[id]` page to use server-side rendering with dynamic params
  - Pre-process account details, associated investments, and totals
  - Update account detail components to display pre-processed data
  - Implement proper 404 handling for non-existent accounts
  - _Requirements: 1.1, 1.4, 2.2_


- [x] 12. Update components to be presentation-only










  - Refactor all page components to accept data as props instead of fetching
  - Keep only must have on client side
  - Remove useState and useEffect hooks related to data fetching
  - Keep only user interaction logic (form handling, navigation) on client-side
  - Update component interfaces to match server-prepared data structures
  - _Requirements: 2.1, 3.4_

- [x] 13. Implement server actions for data mutations





  - Create server actions for form submissions and data updates
  - Replace client-side API calls for CRUD operations with server actions
  - Implement proper validation and error handling in server actions
  - Add revalidation logic to update static pages after mutations
  - _Requirements: 2.3, 3.4_
-

- [x] 14. Clean up unused client-side code




  - Remove useApiCall hook and related client-side data fetching utilities
  - Remove loading states and error handling related to data fetching
  - Clean up unused API endpoints that are no longer called from client
  - Remove client-side data processing and calculation functions
  - _Requirements: 2.1, 3.1_

- [x] 15. Add performance optimizations





  - Implement caching for expensive data preparation operations
  - Add parallel data fetching where possible in server-side preparators
  - Optimize database queries used in server-side data preparation
  - Add performance monitoring for server-side page generation
  - _Requirements: 1.4, 2.4_

- [x] 16. Update error handling for server-rendered pages









  - Implement proper error boundaries for server-rendered content
  - Add fallback mechanisms for failed data preparation
  - Create user-friendly error pages for server-side failures
  - Add logging and monitoring for server-side errors
  - _Requirements: 2.3, 3.2_

- [ ] 17. Test and validate converted pages
  - Write unit tests for all data preparator classes
  - Test server-rendered pages load correctly with all data
  - Verify that user interactions still work properly
  - Validate that page load times have improved significantly
  - Test error scenarios and fallback behavior
  - _Requirements: 1.1, 3.1, 3.3_